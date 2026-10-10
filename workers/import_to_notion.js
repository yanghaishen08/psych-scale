/**
 * 通过 Cloudflare Worker 代理录入婚姻质量评估量表到 Notion
 *
 * 原理：本地 → Worker(www.moonsheep.cloud) → Notion API
 * Worker 运行在 Cloudflare 边缘网络（GFW 外），可直连 Notion API
 */

const https = require('https');

const WORKER_URL = 'https://www.moonsheep.cloud';
const ADMIN_KEY = 'mscale_admin_6f8a2b9e';

// ============================================================
// HTTP 请求工具
// ============================================================

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const url = new URL(path, WORKER_URL);

    const options = {
      method: 'POST',
      hostname: url.hostname,
      path: url.pathname,
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Key': ADMIN_KEY,
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = https.request(options, (res) => {
      let chunks = '';
      res.on('data', (c) => (chunks += c));
      res.on('end', () => {
        try {
          const json = JSON.parse(chunks);
          resolve({ status: res.statusCode, ...json });
        } catch {
          resolve({ status: res.statusCode, raw: chunks });
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ============================================================
// Notion 属性构建工具
// ============================================================

function makeTitle(text) {
  return { title: [{ text: { content: text } }] };
}

function makeRichText(text) {
  const maxLen = 1900;
  const chunks = [];
  let remaining = text;
  while (remaining) {
    chunks.push({ text: { content: remaining.slice(0, maxLen) } });
    remaining = remaining.slice(maxLen);
  }
  return { rich_text: chunks };
}

function makeSelect(name) {
  return { select: { name } };
}

function makeCheckbox(val) {
  return { checkbox: val };
}

function makeNumber(val) {
  return { number: val };
}

function makeRelation(pageIds) {
  return { relation: pageIds.map((id) => ({ id })) };
}

// ============================================================
// 通过 Worker 创建 Notion 页面
// ============================================================

async function createPage(database, properties) {
  const resp = await post('/api/admin/notion/create-page', { database, properties });
  if (resp.success) {
    return resp;
  }
  console.error('  创建失败:', resp.error || resp.raw);
  return null;
}

// ============================================================
// 量表数据
// ============================================================

const SCALE_INFO = {
  title: '婚姻质量多维评估',
  description:
    '8大维度32题深度测评，帮你看清婚姻关系的真实状态。包含沟通、信任、冲突解决、亲密感、共同目标、财务观念、家庭分工、自主边界等维度，附关系类型判别和个性化建议。',
  category: '亲密关系',
  scale_type: 'custom_result',
  sort_weight: 10,
};

const DIMENSIONS = [
  ['沟通质量', [
    ['我们能在大多数事情上心平气和地交流，而不是一说就吵。', false],
    ['当我说话时，对方会认真听，不会打断或刷手机。', false],
    ['我能把自己真实的想法和感受告诉对方，不用憋着。', false],
    ['即使意见不同，我们也能尊重彼此的观点，不贬低对方。', false],
  ]],
  ['信任与安全感', [
    ['我从不担心对方会背着我做伤害我的事。', false],
    ['对方晚归或者不回消息时，我不会胡思乱想。', false],
    ['我相信对方在关键时刻会站在我这边。', false],
    ['我对这段关系的稳定性有信心，不太担心它会突然结束。', false],
  ]],
  ['冲突解决', [
    ['我们吵架后能很快和好，不会冷战超过两天。', false],
    ['发生矛盾时，我们通常会就事论事，不会翻旧账。', false],
    ['争执过后，我们通常会主动去修复关系，而不是等对方先低头。', false],
    ['我们能在争吵中不进行人身攻击，不说过分伤人的话。', false],
  ]],
  ['亲密与情感连接', [
    ['我们之间还有身体上的亲密接触（拥抱、亲吻、牵手等），不是完全没有。', false],
    ['我经常能感受到对方是爱我的，不需要反复确认。', false],
    ['我愿意和对方分享我的脆弱和压力，不需要一直装坚强。', false],
    ['和对方在一起时，我大多数时候是放松的、舒服的。', false],
  ]],
  ['共同愿景与目标', [
    ['我们对未来的生活有共同的方向和期待，不是各过各的。', false],
    ['我们经常一起讨论家庭的重要决定，而不是一个人说了算。', false],
    ['在重要的事情上（比如买房、生子、职业选择），我们容易达成一致。', false],
    ['我们对"想要过什么样的生活"这件事，看法基本一致。', false],
  ]],
  ['财务观念', [
    ['我们在钱的事情上能坦诚沟通，不藏着掖着。', false],
    ['我们的消费观念比较接近，不太会因为花钱吵架。', false],
    ['我们对家庭财务有基本的规划（储蓄、投资、大额支出），不是过一天算一天。', false],
    ['我觉得我们在钱上的决定是共同做出的，不是一个人说了算。', false],
  ]],
  ['家庭角色与分工', [
    ['家务和家庭责任在我们之间分配得比较公平，没有谁长期超负荷。', false],
    ['我经常觉得自己承担了大部分家务或育儿责任，心里有怨气。', true],
    ['对方能看到我为家庭付出的努力，不会觉得理所当然。', false],
    ['对于目前的家务和育儿分工，我总体是满意的。', false],
  ]],
  ['自主与边界', [
    ['我在这段关系里还能做自己，不需要委屈自己来换取和平。', false],
    ['我有自己的空间和时间做自己喜欢的事，对方会支持。', false],
    ['对方会尊重我的想法和决定，不会总是试图改变我。', false],
    ['我们可以各自有不同的朋友和兴趣，不需要事事都在一起。', false],
  ]],
];

const SELF_REPORT_QUESTIONS = [
  {
    text: '如果用一个词来形容你们现在的关系，你会选哪个？',
    options: [
      ['A. 温暖——在一起心里是热的', '温暖'],
      ['B. 平淡——没什么波澜，但也不差', '平淡'],
      ['C. 并肩——像队友一样一起扛事', '并肩'],
      ['D. 疲惫——说不清哪里不好，但就是很累', '疲惫'],
      ['E. 疏离——人在身边，心却有点远', '疏离'],
      ['F. 依赖——我离不开他/她', '依赖'],
      ['G. 窒息——有时候想透口气', '窒息'],
      ['H. 孤独——两个人，但比一个人还孤独', '孤独'],
      ['I. 感恩——这段关系让我觉得幸运', '感恩'],
      ['J. 习惯——说不上爱，就是分不开', '习惯'],
    ],
  },
  {
    text: '你觉得这段关系里，最需要改善的是哪个方面？',
    options: [
      ['A. 沟通——我们不太会好好说话', '沟通'],
      ['B. 信任——我心里总有不安', '信任'],
      ['C. 亲密感——我们越来越像室友', '亲密感'],
      ['D. 冲突处理——一吵就伤感情', '冲突处理'],
      ['E. 财务观念——钱的事总说不拢', '财务观念'],
      ['F. 家务分工——我一个人扛得太多了', '家务分工'],
      ['G. 个人空间——我想有点自己的时间', '个人空间'],
      ['H. 共同目标——我们好像各过各的', '共同目标'],
    ],
  },
];

const BASIC_INFO_QUESTIONS = [
  { text: '您的称呼（用于生成个性化报告）', type: 'text_input' },
  {
    text: '您的性别',
    type: 'single_choice',
    options: [
      ['A. 男', '男'],
      ['B. 女', '女'],
      ['C. 不愿透露', '不愿透露'],
    ],
  },
  {
    text: '您目前的婚姻/关系状态',
    type: 'single_choice',
    options: [
      ['A. 准备结婚/刚订婚（尚未同居或刚同居，无子女）', '准备结婚/刚订婚'],
      ['B. 新婚期（结婚0-3年，无子女）', '新婚期'],
      ['C. 育儿期（有未成年子女需要照顾）', '育儿期'],
      ['D. 中年稳定期（子女已独立，或无子女且结婚3年以上）', '中年稳定期'],
      ['E. 再婚/重组家庭', '再婚/重组家庭'],
      ['F. 长期关系（同居/事实婚姻，未领证）', '长期关系'],
    ],
  },
];

const RESULT_RULES = JSON.stringify({
  scoring: 'multidimensional',
  template: 'marriage_quality',
  dimensions: [
    { key: 'C', name: '沟通质量', weight: 1.2, questions: [1, 2, 3, 4] },
    { key: 'T', name: '信任与安全感', weight: 1.2, questions: [5, 6, 7, 8] },
    { key: 'R', name: '冲突解决', weight: 1.0, questions: [9, 10, 11, 12] },
    { key: 'I', name: '亲密与情感连接', weight: 1.0, questions: [13, 14, 15, 16] },
    { key: 'V', name: '共同愿景与目标', weight: 1.0, questions: [17, 18, 19, 20] },
    { key: 'F', name: '财务观念', weight: 1.0, questions: [21, 22, 23, 24] },
    { key: 'D', name: '家庭角色与分工', weight: 1.0, questions: [25, 26, 27, 28] },
    { key: 'A', name: '自主与边界', weight: 1.0, questions: [29, 30, 31, 32] },
  ],
  reverse_questions: [26],
  max_score: 5,
});

const OPTS_FORWARD = [
  ['完全符合我', 5],
  ['比较符合我', 4],
  ['一般', 3],
  ['比较不符合我', 2],
  ['完全不符合我', 1],
];

const OPTS_REVERSE = [
  ['完全符合我', 1],
  ['比较符合我', 2],
  ['一般', 3],
  ['比较不符合我', 4],
  ['完全不符合我', 5],
];

// ============================================================
// 主流程
// ============================================================

async function main() {
  console.log('='.repeat(60));
  console.log('通过 Worker 代理录入：婚姻质量多维评估');
  console.log('='.repeat(60));

  // 1. 创建量表
  console.log('\n[1/5] 创建量表记录...');
  const scaleResp = await createPage('scales', {
    '标题': makeTitle(SCALE_INFO.title),
    '描述': makeRichText(SCALE_INFO.description),
    '分类': makeSelect(SCALE_INFO.category),
    '是否发布': makeCheckbox(true),
    '量表类型': makeSelect(SCALE_INFO.scale_type),
    '结果规则': makeRichText(RESULT_RULES),
    '排序权重': makeNumber(SCALE_INFO.sort_weight),
  });

  if (!scaleResp) {
    console.error('量表创建失败，终止');
    return;
  }
  const scaleId = scaleResp.page_id;
  console.log(`  量表创建成功: ${scaleId}`);
  await sleep(500);

  // 2. 创建基本信息题
  console.log('\n[2/5] 创建基本信息题...');
  let sort = 0;

  for (const q of BASIC_INFO_QUESTIONS) {
    sort++;
    const props = {
      '题目内容': makeTitle(q.text),
      '题目类型': makeSelect(q.type),
      '排序': makeNumber(sort),
      '是否必答': makeCheckbox(true),
      '所属量表': makeRelation([scaleId]),
    };
    const page = await createPage('questions', props);
    if (!page) continue;
    console.log(`  [${sort}] ${q.text.slice(0, 30)}...`);

    if (q.type === 'single_choice' && q.options) {
      for (let i = 0; i < q.options.length; i++) {
        const [optText, optValue] = q.options[i];
        await createPage('options', {
          '选项内容': makeTitle(optText),
          '选项值': makeRichText(optValue),
          '排序': makeNumber(i + 1),
          '分值': makeNumber(0),
          '所属题目': makeRelation([page.page_id]),
        });
        await sleep(150);
      }
    }
    await sleep(200);
  }

  // 3. 创建引导内容
  console.log('\n[3/5] 创建引导内容...');
  const introText =
    '以下题目请根据你最近半年的真实感受作答。没有对错，真实最重要。\n\n选项说明：完全符合我 / 比较符合我 / 一般 / 比较不符合我 / 完全不符合我';
  const intro = await createPage('sections', {
    '标题': makeTitle('测试导语'),
    '内容': makeRichText(introText),
    '排序': makeNumber(5),
    '所属量表': makeRelation([scaleId]),
  });
  console.log(`  导语创建: ${intro ? '成功' : '失败'}`);
  await sleep(500);

  // 4. 创建32道核心题
  console.log('\n[4/5] 创建32道核心测评题及选项...');
  let qNum = 0;

  for (const [dimName, questions] of DIMENSIONS) {
    console.log(`\n  --- ${dimName} ---`);
    for (const [qText, isReverse] of questions) {
      qNum++;
      sort++;

      let fullTitle = `Q${qNum}. ${qText}`;
      if (isReverse) fullTitle += '（反向计分）';

      const props = {
        '题目内容': makeTitle(fullTitle),
        '题目类型': makeSelect('single_choice'),
        '排序': makeNumber(sort),
        '是否必答': makeCheckbox(true),
        '所属量表': makeRelation([scaleId]),
      };
      const page = await createPage('questions', props);
      if (!page) {
        console.log(`    [${qNum}] 失败: ${qText.slice(0, 30)}...`);
        continue;
      }
      console.log(`    [${qNum}] ${qText.slice(0, 30)}...`);

      const opts = isReverse ? OPTS_REVERSE : OPTS_FORWARD;
      for (let i = 0; i < opts.length; i++) {
        const [optText, score] = opts[i];
        await createPage('options', {
          '选项内容': makeTitle(optText),
          '选项值': makeRichText(optText),
          '排序': makeNumber(i + 1),
          '分值': makeNumber(score),
          '所属题目': makeRelation([page.page_id]),
        });
        await sleep(120);
      }
      await sleep(150);
    }
  }

  // 5. 创建2道自述题
  console.log('\n[5/5] 创建2道自述选择题...');
  for (let i = 0; i < SELF_REPORT_QUESTIONS.length; i++) {
    const q = SELF_REPORT_QUESTIONS[i];
    qNum++;
    sort++;
    const fullTitle = `Q${32 + i + 1}. ${q.text}`;

    const props = {
      '题目内容': makeTitle(fullTitle),
      '题目类型': makeSelect('single_choice'),
      '排序': makeNumber(sort),
      '是否必答': makeCheckbox(false),
      '所属量表': makeRelation([scaleId]),
    };
    const page = await createPage('questions', props);
    if (!page) {
      console.log(`  [${32 + i + 1}] 失败: ${q.text.slice(0, 30)}...`);
      continue;
    }
    console.log(`  [${32 + i + 1}] ${q.text.slice(0, 30)}...`);

    for (let j = 0; j < q.options.length; j++) {
      const [optText, optValue] = q.options[j];
      await createPage('options', {
        '选项内容': makeTitle(optText),
        '选项值': makeRichText(optValue),
        '排序': makeNumber(j + 1),
        '分值': makeNumber(0),
        '所属题目': makeRelation([page.page_id]),
      });
      await sleep(120);
    }
    await sleep(150);
  }

  console.log('\n' + '='.repeat(60));
  console.log('录入完成！');
  console.log(`  量表ID: ${scaleId}`);
  console.log('='.repeat(60));
}

main().catch(console.error);
