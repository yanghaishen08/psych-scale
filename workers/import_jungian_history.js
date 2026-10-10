/**
 * 通过 Worker 代理录入：你的历史人格（荣格八维·历史人物版）
 *
 * 32道题，每题4个选项，每选项对应一个荣格八维认知功能（score 1-8）
 * Score 1=Se, 2=Si, 3=Ne, 4=Ni, 5=Te, 6=Ti, 7=Fe, 8=Fi
 * 计分方式：jungian_history（八维功能排序，匹配16种类型及历史人物）
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
  title: '你的历史人格',
  description: '32道历史情境题，覆盖荣格八维的八种认知功能（Se、Si、Ne、Ni、Te、Ti、Fe、Fi）。根据你的选择频次，计算出八维功能排序，进而匹配16种荣格八维类型及对应的历史人物。从秦始皇到苏东坡，找到你的历史灵魂。',
  category: '性格测评',
  scale_type: 'custom_result',
  sort_weight: 5,
};

const RESULT_RULES = JSON.stringify({
  scoring: 'jungian_history',
  template: 'jungian_history',
});

// 32道题目数据
// 每题4个选项，score = 荣格八维认知功能索引（1-8）
// 1=Se, 2=Si, 3=Ne, 4=Ni, 5=Te, 6=Ti, 7=Fe, 8=Fi
const QUESTIONS = [
  // Q1
  { text: '你率军出征，粮草被敌军截断，军心浮动。你会：', opts: [
    ['A. 立刻召集诸将重新部署，抢在敌军合围前打出一条补给通道', 5],
    ['B. 亲自带精锐骑兵夜袭敌营，抢回粮草，让士兵看到主将的胆气', 1],
    ['C. 把将领们叫来，坦诚说明困境，问大家"你们觉得怎么打最好"', 7],
    ['D. 独自推演战局，计算敌我兵力、地形、气候，找到唯一的破局点', 6],
  ]},
  // Q2
  { text: '主公驾崩了，你要怎么办？', opts: [
    ['A. 迅速制定一套哭坟方案，成为朝堂上哭得最响的仔', 7],
    ['B. 皇帝轮流做今年到我家，桀桀桀桀', 1],
    ['C. 收留心碎丧父公主', 8],
    ['D. 平日里奸佞横行，我要借此机会扫除乱党', 5],
  ]},
  // Q3
  { text: '你发现军中有一位年轻小将，作战勇猛但鲁莽冲动，屡次违抗军令。你会：', opts: [
    ['A. 把他调到自己身边亲自带，用规矩和奖惩磨他的性子', 2],
    ['B. 让他去执行最危险的任务，用实战教他什么叫代价', 1],
    ['C. 找他喝酒谈心，了解他为什么这么拼命，从根上帮他', 8],
    ['D. 给他画一张战略蓝图，让他明白每场仗在全局中的位置', 4],
  ]},
  // Q4
  { text: '敌军派人送来一封劝降书，条件优厚。你会：', opts: [
    ['A. 当着全军的面把信烧了，稳住军心再谈', 7],
    ['B. 假装考虑，暗中调兵遣将，将计就计', 4],
    ['C. 分析劝降书措辞漏洞，推测敌军内部矛盾', 6],
    ['D. 回信一封，措辞华丽地嘲讽对方，顺便策反他的部下', 3],
  ]},
  // Q5
  { text: '你刚被任命为首辅，发现前任留下一个烂摊子：国库空虚、官员贪腐、边患不断。你会：', opts: [
    ['A. 先摸底，把所有问题列清单，逐个制定解决方案', 5],
    ['B. 先稳住核心团队，请大家吃饭聊天，了解各方诉求', 7],
    ['C. 闭门三天，想清楚问题的根源在哪里，再动手', 4],
    ['D. 不管三七二十一，先把最严重的贪官抓了再说', 1],
  ]},
  // Q6
  { text: '皇帝在朝堂上问了一个你不太懂的问题，满朝文武都在等你回答。你会：', opts: [
    ['A. 凭经验和先例给一个稳妥的答案', 2],
    ['B. 坦率说"臣需要查证"，回去把这个问题研究透', 6],
    ['C. 引经据典、旁征博引，把问题绕过去再说', 3],
    ['D. 直接说"臣以为此事当如何如何"，气势上不能输', 5],
  ]},
  // Q7
  { text: '你发现朝中有位重臣暗中结党，但他的势力盘根错节，动他可能引发朝局动荡。你会：', opts: [
    ['A. 暗中收集证据，等待最佳时机，一击致命', 4],
    ['B. 先从他的外围下手，一个一个剪除羽翼', 5],
    ['C. 找机会和他喝一次酒，看看能不能化敌为友', 7],
    ['D. 直接弹劾，用正气压邪气', 8],
  ]},
  // Q8
  { text: '皇帝要你举荐一位大臣去治理水患频发的南方。你会推荐：', opts: [
    ['A. 那个在地方做过县令、对水利有经验的老臣', 2],
    ['B. 那个想法很多、总能提出新奇方案的年轻官员', 3],
    ['C. 那个做事踏实、说一不二、执行力极强的武将', 5],
    ['D. 那个善于和百姓打交道、走到哪里都有人拥护的人', 7],
  ]},
  // Q9
  { text: '你被贬到偏远之地，前途渺茫。你会：', opts: [
    ['A. 既来之则安之，开荒种地、写诗喝酒，把日子过好', 1],
    ['B. 反思自己为什么会落到这一步，找到自己的问题', 8],
    ['C. 研究当地风土人情，说不定能写出一部传世之作', 3],
    ['D. 观察天下大势，等待重新出山的机会', 4],
  ]},
  // Q10
  { text: '你的好友背叛了你，投靠了你的敌人。你会：', opts: [
    ['A. 愤怒，但先冷静分析他的动机，看看有没有挽回余地', 6],
    ['B. 直接断绝关系，此生不复相见', 8],
    ['C. 伤心，但试着理解他的选择，也许他有苦衷', 7],
    ['D. 默默记下，总有一天让他付出代价', 4],
  ]},
  // Q11
  { text: '你功成名就，皇帝要封你为王。你会：', opts: [
    ['A. 接受封赏，好好经营自己的封地，让百姓安居乐业', 2],
    ['B. 功成身退，辞官归隐，去做自己真正想做的事', 8],
    ['C. 趁机扩大势力，为将来可能的变故做准备', 5],
    ['D. 推辞不受，说"这都是大家的功劳"，收买人心', 7],
  ]},
  // Q12
  { text: '有人当面指责你的过失，言辞激烈，满座皆惊。你会：', opts: [
    ['A. 当场反驳，逐条驳斥他的话', 5],
    ['B. 沉默，回去仔细想想他说得有没有道理', 6],
    ['C. 笑着说"你说得对"，然后继续做自己的事', 4],
    ['D. 感到受伤，但表面不动声色，事后独自消化', 8],
  ]},
  // Q13
  { text: '你参加一场文人雅集，大家都在吟诗作赋。你会：', opts: [
    ['A. 即兴赋诗一首，把眼前景象写得活灵活现', 1],
    ['B. 引用前朝典故，写一首格律工整的应制诗', 2],
    ['C. 构思一首富有哲理的诗，让大家品味其中的深意', 4],
    ['D. 写一首情感真挚的诗，表达自己对友人的思念', 8],
  ]},
  // Q14
  { text: '你在编修一部史书，面对浩如烟海的史料。你会：', opts: [
    ['A. 严格按照时间顺序，把每件事都记清楚', 2],
    ['B. 从史料中提炼出历史规律，写成"太史公曰"', 4],
    ['C. 用生动的笔法还原历史场景，让读者身临其境', 1],
    ['D. 对每个历史人物做出公正的评价，不偏不倚', 6],
  ]},
  // Q15
  { text: '你的一位朋友做了错事，来向你倾诉。你会：', opts: [
    ['A. 帮他分析问题的来龙去脉，给出具体建议', 5],
    ['B. 先安慰他的情绪，让他感受到被理解', 7],
    ['C. 讲一个自己的故事，让他从中得到启发', 3],
    ['D. 问他"你自己觉得应该怎么做"，引导他找到答案', 8],
  ]},
  // Q16
  { text: '你发现自己的理念和主流格格不入，大家都不理解你。你会：', opts: [
    ['A. 坚持自己的信念，哪怕孤独终老', 8],
    ['B. 反思自己的理念，看看有没有需要修正的地方', 6],
    ['C. 用更通俗的方式重新表达自己的想法，争取更多人认同', 7],
    ['D. 继续深入思考，相信时间会证明一切', 4],
  ]},
  // Q17
  { text: '你被敌人俘虏，对方许以高官厚禄劝你投降。你会：', opts: [
    ['A. 宁死不屈，留取丹心照汗青', 8],
    ['B. 假意投降，伺机逃回', 1],
    ['C. 分析局势，如果投降能保全更多人，未必不可', 6],
    ['D. 慷慨陈词，用大义凛然的气势让对方惭愧', 7],
  ]},
  // Q18
  { text: '你负责一项重大工程，工期紧、预算少、人手不够。你会：', opts: [
    ['A. 重新排优先级，砍掉不重要的部分，集中资源保核心', 5],
    ['B. 到现场亲自盯着，和工匠们一起干活，鼓舞士气', 1],
    ['C. 找有经验的老工匠请教，参考以前的成功案例', 2],
    ['D. 想一想有没有全新的方法，能从根本上解决问题', 3],
  ]},
  // Q19
  { text: '你发现自己的上司在做一个错误的决策，但这个决策已经被批准了。你会：', opts: [
    ['A. 直接进谏，哪怕触怒上司也要说', 8],
    ['B. 找机会用数据和分析说服他', 6],
    ['C. 在执行中尽量弥补错误带来的后果', 2],
    ['D. 先观察，等到问题暴露出来再提出替代方案', 4],
  ]},
  // Q20
  { text: '你有一个绝妙的创意，但所有人都说"这不可能"。你会：', opts: [
    ['A. 自己动手做出来给他们看', 1],
    ['B. 继续完善这个创意，相信总有一天会有人懂', 4],
    ['C. 找人合作，用别人的资源来实现自己的想法', 5],
    ['D. 换个角度重新表达，看看能不能让更多人接受', 3],
  ]},
  // Q21
  { text: '你发现身边有一个很有才华但性格孤僻的人，大家都不喜欢他。你会：', opts: [
    ['A. 主动接近他，发现他其实很有趣', 3],
    ['B. 尊重他的空间，不多打扰', 8],
    ['C. 在合适的时候帮他融入团队', 7],
    ['D. 观察他，了解他的能力和局限，再决定怎么用他', 5],
  ]},
  // Q22
  { text: '你做了一个梦，梦里有一个场景反复出现。你会：', opts: [
    ['A. 记下来，仔细分析这个梦的含义', 4],
    ['B. 觉得有趣，但不太在意', 1],
    ['C. 和朋友聊聊，听听他们怎么看', 7],
    ['D. 查查解梦的书，看看有没有类似的记载', 2],
  ]},
  // Q23
  { text: '你老了，回望一生，最让你欣慰的是：', opts: [
    ['A. 我做了自己认为对的事，没有违背良心', 8],
    ['B. 我建立了一套可以传承下去的制度和体系', 5],
    ['C. 我帮助了很多人，他们过上了更好的生活', 7],
    ['D. 我看透了很多事情，悟出了人生的道理', 4],
  ]},
  // Q24
  { text: '你的对手是一个极其强大的人，正面交锋你必败无疑。你会：', opts: [
    ['A. 找他的弱点，从侧面进攻', 1],
    ['B. 暂时退让，积蓄力量，等待时机', 4],
    ['C. 联合其他势力，形成联盟对抗他', 5],
    ['D. 分析他的性格和动机，找到与他共存的方式', 6],
  ]},
  // Q25
  { text: '你路过一个热闹的集市，一个卖艺人在表演。你会：', opts: [
    ['A. 停下来看一会儿，觉得很有意思', 1],
    ['B. 观察他的表演技巧，想想他是怎么练的', 6],
    ['C. 想到自己年轻时也曾在街头看过类似的表演', 2],
    ['D. 琢磨这个卖艺人的身世，他背后可能有故事', 3],
  ]},
  // Q26
  { text: '你得到一个机会去远方做官，但那里荒凉偏远。你会：', opts: [
    ['A. 去，正好可以看看不一样的风土', 1],
    ['B. 犹豫，故土难离，家人朋友都在这里', 2],
    ['C. 去，那里的百姓需要人治理，这是我的责任', 7],
    ['D. 想一想，这趟远行对我的长远发展有没有好处', 4],
  ]},
  // Q27
  { text: '你在写一篇文章，写到一半卡住了。你会：', opts: [
    ['A. 出去走走，换换脑子，灵感可能就来了', 1],
    ['B. 翻翻以前写的东西，看看能不能找到思路', 2],
    ['C. 把已有的部分重新梳理一遍，看看逻辑哪里不对', 6],
    ['D. 放下这篇文章，先去做别的事，让潜意识去处理', 4],
  ]},
  // Q28
  { text: '你的一个晚辈来向你请教人生方向。你会：', opts: [
    ['A. 问他喜欢什么、擅长什么，帮他自己找到答案', 8],
    ['B. 给他讲自己的经历，让他从中得到启发', 2],
    ['C. 帮他分析各种选择的利弊，给出务实的建议', 5],
    ['D. 鼓励他去尝试，多体验不同的生活', 3],
  ]},
  // Q29
  { text: '如果你知道自己只剩三天时间，你会做什么？', opts: [
    ['A. 和最爱的人待在一起，好好告别', 8],
    ['B. 把最重要的事情交代清楚，安排好身后事', 5],
    ['C. 去一个一直想去但没去过的地方，尽情活一把', 1],
    ['D. 写下自己一生最重要的思考和感悟，留给后人', 4],
  ]},
  // Q30
  { text: '你发现一个惊人的真相，但这个真相一旦公开会引发天下大乱。你会：', opts: [
    ['A. 公开它，真相就是真相，不能掩盖', 6],
    ['B. 权衡利弊，如果公开弊大于利，暂时保密', 5],
    ['C. 想想有没有办法让真相以最小的代价被接受', 7],
    ['D. 相信时间会揭示一切，不急于一时', 4],
  ]},
  // Q31
  { text: '你的一生中，最不能放弃的是什么？', opts: [
    ['A. 对自由的追求', 1],
    ['B. 对家人的责任', 2],
    ['C. 对理想的坚持', 8],
    ['D. 对真理的探索', 6],
  ]},
  // Q32
  { text: '如果让你选一句话刻在自己的墓碑上，你会选：', opts: [
    ['A. "他活过，爱过，战斗过"', 1],
    ['B. "他守护了他所珍视的一切"', 2],
    ['C. "他忠于自己的内心，从未背叛"', 8],
    ['D. "他看透了世事，却依然热爱人间"', 4],
  ]},
];

// ============================================================
// 主流程
// ============================================================

async function main() {
  console.log('='.repeat(60));
  console.log('通过 Worker 代理录入：你的历史人格（荣格八维·历史人物版）');
  console.log('='.repeat(60));

  // 1. 创建量表
  console.log('\n[1/3] 创建量表记录...');
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
  await sleep(400);

  // 2. 创建32道题目及选项
  console.log('\n[2/3] 创建32道题目及选项...');
  for (let i = 0; i < QUESTIONS.length; i++) {
    const q = QUESTIONS[i];
    const qNum = i + 1;
    const fullTitle = `Q${qNum}. ${q.text}`;

    const props = {
      '题目内容': makeTitle(fullTitle),
      '题目类型': makeSelect('single_choice'),
      '排序': makeNumber(qNum),
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
      const [optText, score] = q.opts[j];
      await createPage('options', {
        '选项内容': makeTitle(optText),
        '选项值': makeRichText(optText),
        '排序': makeNumber(j + 1),
        '分值': makeNumber(score),
        '所属题目': makeRelation([page.page_id]),
      });
      await sleep(400);
    }
    await sleep(400);
  }

  // 3. 统计
  console.log('\n[3/3] 录入完成！');
  console.log(`  量表ID: ${scaleId}`);
  console.log(`  题目数: ${QUESTIONS.length}`);
  console.log(`  选项数: ${QUESTIONS.length * 4}`);
  console.log('='.repeat(60));
}

main().catch(console.error);
