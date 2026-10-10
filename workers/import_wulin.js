/**
 * 通过 Worker 代理录入：武林外传·同福客栈人格测试
 *
 * 30道题，每题4个选项，每选项对应一个角色（1-20）
 * 计分方式：character_match（角色匹配，统计最高票角色）
 */

const https = require('https');

const WORKER_URL = 'https://www.moonsheep.cloud';
const ADMIN_KEY = 'mscale_admin_6f8a2b9e';

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const url = new URL(path, WORKER_URL);
    const opts = {
      method: 'POST',
      hostname: url.hostname,
      path: url.pathname,
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Key': ADMIN_KEY,
        'Content-Length': Buffer.byteLength(data),
      },
    };
    const req = https.request(opts, (res) => {
      let c = '';
      res.on('data', (d) => (c += d));
      res.on('end', () => {
        try { resolve(JSON.parse(c)); }
        catch { resolve({ raw: c }); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function makeTitle(text) { return { title: [{ text: { content: text } }] }; }
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
function makeSelect(name) { return { select: { name } }; }
function makeCheckbox(val) { return { checkbox: val }; }
function makeNumber(val) { return { number: val }; }
function makeRelation(pageIds) { return { relation: pageIds.map(id => ({ id })) }; }

async function createPage(database, properties) {
  const resp = await post('/api/admin/notion/create-page', { database, properties });
  if (resp.success) return resp;
  console.error('  创建失败:', resp.error || resp.raw);
  return null;
}

// ============================================================
// 量表数据
// ============================================================

const SCALE_INFO = {
  title: '武林外传·同福客栈人格测试',
  description: '30道题测出你的同福客栈灵魂角色。覆盖压力应对、金钱安全感、亲密关系、冲突策略、权力规则等10个心理维度，匹配20种角色类型。武林外传只是镜子，照出来的还是你自己。',
  category: '趣味人格',
  scale_type: 'custom_result',
  sort_weight: 20,
};

const RESULT_RULES = JSON.stringify({
  scoring: 'character_match',
  template: 'wulin_waizhuan',
});

const INTRO_TEXT = `同福客栈有句名言——"有人的地方就有江湖"。

但这份测试真正想看的，不是你喜欢谁，而是你在压力、金钱、关系、冲突、责任、自我认同面前，通常会怎么反应。

30道题，请凭第一反应选择。不要选"最像好人"的，选"最像你"的。武林外传只是镜子，照出来的还是你自己。

本测试覆盖10个心理维度：压力应对、金钱安全感、亲密关系、冲突策略、权力规则、利他边界、冒险与安全、自我表达、社会角色、存在感与人生哲学。每题没有好坏，只有倾向。`;

// 30道题目数据
// 每题4个选项，score = 角色索引（1-20）
const QUESTIONS = [
  // Q1
  { text: '同福客栈刚开门，来了个明显难缠的客人。你会：', opts: [
    ['A. 直接迎上去，先把场面压住再说', 1],
    ['B. 先算这单划不划算，再决定怎么接待', 2],
    ['C. 先退后半步观察，看对方到底要什么', 3],
    ['D. 先想能不能交给别人，实在不行再上', 4],
  ]},
  // Q2
  { text: '掌柜交给你一坛贵重东西，结果你失手打碎了。你第一反应是：', opts: [
    ['A. 先收拾残局，尽量别让别人操心', 5],
    ['B. 先看看有没有能补救的，别浪费', 6],
    ['C. 先想怎么解释，最好别挨骂', 7],
    ['D. 先看这事会不会影响自己在别人心里的位置', 8],
  ]},
  // Q3
  { text: '七侠镇夜市有人卖来路不明的"江湖秘籍"，你正好路过。你会：', opts: [
    ['A. 先冲上去问个清楚，别让骗子跑了', 9],
    ['B. 蹲在旁边看热闹，顺便观察谁会上当', 10],
    ['C. 翻两页，琢磨这故事能不能写进自己的见闻', 11],
    ['D. 先问"练了能打赢谁"，打不赢就不感兴趣', 12],
  ]},
  // Q4
  { text: '怡红楼推出充值优惠，摆明抢同福客栈生意。你怎么办？', opts: [
    ['A. 偷偷算自己还能不能挪点私房钱，别被发现', 13],
    ['B. 直接研究怎么反制，不能在生意上输', 14],
    ['C. 觉得这是机会，可以借势合作或拉客', 15],
    ['D. 对这事毫无感觉，甚至忘了自己为什么站在这里', 16],
  ]},
  // Q5
  { text: '江湖传言同福客栈藏着旧案赃物，县衙和江湖人都盯上了。你听说后：', opts: [
    ['A. 先不动声色，从熟人和旧关系里打听底细', 17],
    ['B. 先把场面撑住，别让客栈看起来心虚', 18],
    ['C. 按规矩查证，该封就封，该问就问', 19],
    ['D. 拍胸口说"我来帮忙"，先冲了再说', 20],
  ]},
  // Q6
  { text: '月底盘账，发现少了一笔小钱。你会：', opts: [
    ['A. 先想是不是大家吃喝了，别为小钱伤和气', 6],
    ['B. 默默再算一遍，能补上就补上', 5],
    ['C. 心里一紧，开始追查每一笔，钱不能糊涂', 2],
    ['D. 嘴上说"算了"，心里已经想好怎么把这事绕过去', 4],
  ]},
  // Q7
  { text: '客栈里有人提议学点防身功夫，方便应付江湖麻烦。你会：', opts: [
    ['A. 先问原理和风险，觉得不靠谱就不学', 3],
    ['B. 觉得好玩，先试了再说，摔了也认', 7],
    ['C. 关心学了之后别人会不会高看自己一眼', 8],
    ['D. 立刻报名，还想拉上所有人一起练', 9],
  ]},
  // Q8
  { text: '七侠镇要办一场公开辩论，赢了有面子，输了可能得罪人。你会：', opts: [
    ['A. 去旁观，听听各方底细，不急着站队', 10],
    ['B. 去参加，把辩论当素材或表达机会', 11],
    ['C. 参加，但只对能赢的场次感兴趣', 12],
    ['D. 尽量别掺和，怕站错队惹麻烦', 13],
  ]},
  // Q9
  { text: '一个自称有来头的人在客栈闹事，想不付钱。你会：', opts: [
    ['A. 直接正面刚，不能让对方觉得好欺负', 14],
    ['B. 先稳住场面，看看能不能把麻烦变成机会', 15],
    ['C. 突然恍惚，搞不清对方是谁、自己是谁', 16],
    ['D. 不急着出手，先套话摸清对方底细', 17],
  ]},
  // Q10
  { text: '掌柜交给你一封不能出差错的信，让你送到指定地点。你会：', opts: [
    ['A. 先把阵仗做足，让人觉得这事很重要', 18],
    ['B. 按规矩办，路线、交接、回执都要清楚', 19],
    ['C. 拍胸口保证送到，路上出问题再想办法', 20],
    ['D. 拿了信就冲，先到再说，细节路上再补', 1],
  ]},
  // Q11
  { text: '客栈厨房突然起火，大家第一反应不同。你先做什么？', opts: [
    ['A. 先算损失，想着火灭之后店还怎么开', 2],
    ['B. 先冲进去把能救的人或东西救出来，顺手收拾', 5],
    ['C. 先抢救吃的，觉得人没事就行，饭不能浪费', 6],
    ['D. 先喊人，自己躲远点，别被火烧到', 7],
  ]},
  // Q12
  { text: '有人匿名散布同福客栈的坏话，客人开始犹豫。你会：', opts: [
    ['A. 先分析信里漏洞，找出谁最可能写', 3],
    ['B. 表面说别理，暗中想办法把影响压下去', 4],
    ['C. 觉得这是针对自己的挑衅，必须查个明白', 8],
    ['D. 直接发火，想立刻找出人教训一顿', 9],
  ]},
  // Q13
  { text: '客栈里的小孩或学徒逃学，先生上门告状。你被叫去谈话。你会：', opts: [
    ['A. 先听双方说法，不急着表态', 10],
    ['B. 觉得这事挺有意思，甚至想记下来', 11],
    ['C. 先护短，觉得外人没资格管太多', 12],
    ['D. 赶紧道歉，息事宁人，别闹大', 13],
  ]},
  // Q14
  { text: '七侠镇要办商会，同福客栈必须出人出力。你负责：', opts: [
    ['A. 负责竞争，盯着对手，不能输', 14],
    ['B. 负责拉人脉、撑场面', 15],
    ['C. 被拉去帮忙，但全程恍惚，不知道自己该干嘛', 16],
    ['D. 负责幕后把关，关键时候出来定局', 17],
  ]},
  // Q15
  { text: '你在七侠镇街上看到有人欺负弱小。你会：', opts: [
    ['A. 先制造声势，把周围人吸引过来', 18],
    ['B. 按规矩处理，找官府或讲道理', 19],
    ['C. 直接上去帮忙，先动手再说', 20],
    ['D. 冲上去挡在中间，不能忍', 1],
  ]},
  // Q16
  { text: '你发现东西被偷，但偷的人处境很可怜。你会：', opts: [
    ['A. 先心疼损失，但也会想以后怎么防', 2],
    ['B. 心软，可能反过来帮对方', 5],
    ['C. 觉得吃穿最重要，别的先放放', 6],
    ['D. 觉得好玩或刺激，甚至想跟着去看看', 7],
  ]},
  // Q17
  { text: '同福客栈要临时选一个人管事。你会选：', opts: [
    ['A. 能讲道理、会分析的', 3],
    ['B. 看起来不惹事、能兜底的', 4],
    ['C. 有面子、能镇场的', 8],
    ['D. 热血、敢冲、自己人', 9],
  ]},
  // Q18
  { text: '你捡到一本记录七侠镇各种关系网的小册子。你会：', opts: [
    ['A. 先收起来，默默记住有用的信息', 10],
    ['B. 当成写作或观察素材', 11],
    ['C. 先看谁强谁弱，谁能帮到自己', 12],
    ['D. 赶紧还回去或交给别人，不想惹麻烦', 13],
  ]},
  // Q19
  { text: '夜里客栈屋顶传来奇怪声响。你会：', opts: [
    ['A. 立刻起身，准备应对，不能让人踩到头上', 14],
    ['B. 先稳住，看看能不能把动静变成有利局面', 15],
    ['C. 迷迷糊糊，分不清是梦还是现实', 16],
    ['D. 不急着动，先听声辨位，摸清情况', 17],
  ]},
  // Q20
  { text: '丐帮弟子来请你参加"七侠镇故事大会"。你会：', opts: [
    ['A. 上台讲，但重点是把场面做漂亮', 18],
    ['B. 讲规矩和道理，顺便纠正别人', 19],
    ['C. 讲自己帮过谁、打过谁，越热血越好', 20],
    ['D. 讲自己冲在最前面的经历，不管别人信不信', 1],
  ]},
  // Q21
  { text: '你在大庭广众下被冤枉。你会：', opts: [
    ['A. 心里又气又急，但先想怎么把损失和影响降到最低', 2],
    ['B. 先忍着，想用行动证明自己', 5],
    ['C. 觉得解释太麻烦，先顾眼前吃喝', 6],
    ['D. 觉得委屈，但不知道怎么反驳', 7],
  ]},
  // Q22
  { text: '同福客栈要出一份公开记录，总结一年的事。你负责：', opts: [
    ['A. 负责分析总结，把逻辑理清楚', 3],
    ['B. 负责润色和回避敏感内容', 4],
    ['C. 负责写自己有面子的部分', 8],
    ['D. 负责跑腿和壮声势', 9],
  ]},
  // Q23
  { text: '掌柜派你去追一笔拖了很久的账。你会：', opts: [
    ['A. 先打听欠债人底细，再决定怎么开口', 10],
    ['B. 把过程当故事，边要账边观察人性', 11],
    ['C. 直接上门，态度强硬，不给就闹', 12],
    ['D. 能要就要，不能要就躲，怕得罪人', 13],
  ]},
  // Q24
  { text: '同福客栈办厨艺大赛，很多人参加。你负责：', opts: [
    ['A. 负责竞争，一定要赢', 14],
    ['B. 负责办得热闹，拉更多人来看', 15],
    ['C. 被拉来当评委或帮手，但心不在焉', 16],
    ['D. 负责幕后评判，关键时候一锤定音', 17],
  ]},
  // Q25
  { text: '你在街上看到一张寻人启事，上面画的人很像你。你会：', opts: [
    ['A. 先想这是不是出名或做文章的机会', 18],
    ['B. 按程序去核实，不能冒认', 19],
    ['C. 觉得可能是找自己帮忙，先冲过去问', 20],
    ['D. 觉得好笑，想撕下来拿回去给大家看', 1],
  ]},
  // Q26
  { text: '客栈为了招揽客人，办了个吵架比赛。你会：', opts: [
    ['A. 觉得能赚钱，但担心影响不好', 2],
    ['B. 负责劝架和收拾场面', 5],
    ['C. 负责提供吃喝，觉得热闹就行', 6],
    ['D. 觉得好玩，第一个报名', 7],
  ]},
  // Q27
  { text: '县衙突然要收一笔客栈管理费。你会：', opts: [
    ['A. 研究条文，找依据谈判', 3],
    ['B. 表面配合，暗中找关系减免', 4],
    ['C. 觉得可以借机跟县衙搞好关系', 8],
    ['D. 直接不满，想带头抗议', 9],
  ]},
  // Q28
  { text: '七侠镇办相亲大会，你被拉去参加。你会：', opts: [
    ['A. 坐在角落观察，不急着表现', 10],
    ['B. 把相亲当成素材或故事', 11],
    ['C. 先看对方实力，不行就撤', 12],
    ['D. 紧张，怕说错话，尽量顺着别人', 13],
  ]},
  // Q29
  { text: '同福客栈丢了重要东西，大家互相怀疑。你会：', opts: [
    ['A. 先发火，要求彻查，不能背锅', 14],
    ['B. 先安抚大家，同时想办法找出真凶', 15],
    ['C. 自己先慌了，因为很多事记不清', 16],
    ['D. 不动声色，观察每个人反应', 17],
  ]},
  // Q30
  { text: '传闻七侠镇要出大事，可能再也见不到明天。今晚你会：', opts: [
    ['A. 把场面办得漂亮，让大家记住今晚', 18],
    ['B. 按规矩安排好该做的事，尽量不乱', 19],
    ['C. 冲出去帮所有能帮的人', 20],
    ['D. 直接去找最在乎的人，把想说的说了', 1],
  ]},
];

// ============================================================
// 主流程
// ============================================================

async function main() {
  console.log('='.repeat(60));
  console.log('通过 Worker 代理录入：武林外传·同福客栈人格测试');
  console.log('='.repeat(60));

  // 1. 创建量表
  console.log('\n[1/4] 创建量表记录...');
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

  // 2. 创建导语
  console.log('\n[2/4] 创建导语...');
  const intro = await createPage('sections', {
    '标题': makeTitle('测试导语'),
    '内容': makeRichText(INTRO_TEXT),
    '排序': makeNumber(0.5),
    '所属量表': makeRelation([scaleId]),
  });
  console.log(`  导语创建: ${intro ? '成功' : '失败'}`);
  await sleep(500);

  // 3. 创建30道题目及选项
  console.log('\n[3/4] 创建30道题目及选项...');
  for (let i = 0; i < QUESTIONS.length; i++) {
    const q = QUESTIONS[i];
    const qNum = i + 1;
    const fullTitle = `Q${qNum}. ${q.text}`;

    const props = {
      '题目内容': makeTitle(fullTitle),
      '题目类型': makeSelect('single_choice'),
      '排序': makeNumber(qNum + 1),
      '是否必答': makeCheckbox(true),
      '所属量表': makeRelation([scaleId]),
    };
    const page = await createPage('questions', props);
    if (!page) {
      console.log(`  [Q${qNum}] 失败: ${q.text.slice(0, 30)}...`);
      continue;
    }
    console.log(`  [Q${qNum}] ${q.text.slice(0, 30)}...`);

    for (let j = 0; j < q.opts.length; j++) {
      const [optText, charIndex] = q.opts[j];
      await createPage('options', {
        '选项内容': makeTitle(optText),
        '选项值': makeRichText(optText),
        '排序': makeNumber(j + 1),
        '分值': makeNumber(charIndex),
        '所属题目': makeRelation([page.page_id]),
      });
      await sleep(120);
    }
    await sleep(150);
  }

  // 4. 统计
  console.log('\n[4/4] 录入完成！');
  console.log(`  量表ID: ${scaleId}`);
  console.log(`  题目数: ${QUESTIONS.length}`);
  console.log(`  选项数: ${QUESTIONS.length * 4}`);
  console.log('='.repeat(60));
}

main().catch(console.error);
