/**
 * 更新"你会发财嘛？"量表的 Q43 和 Q44：
 * - 题型从 text → single_choice（单选）
 * - 更新题干文本
 * - 为每题创建8个选项（带分值）
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
function makeRichText(text) { return { rich_text: [{ text: { content: text } }] }; }
function makeSelect(name) { return { select: { name } }; }
function makeNumber(val) { return { number: val }; }
function makeRelation(pageIds) { return { relation: pageIds.map(id => ({ id })) }; }

async function createPage(database, properties) {
  const resp = await post('/api/admin/notion/create-page', { database, properties });
  if (resp.success) return resp;
  console.error('  创建失败:', resp.error || resp.raw);
  return null;
}

async function updatePage(pageId, properties) {
  const resp = await post('/api/admin/notion/update-page', { page_id: pageId, properties });
  if (resp.success) return resp;
  console.error('  更新失败:', resp.error || resp.raw);
  return null;
}

// Q43 和 Q44 的页面 ID
const Q43_ID = '3aeff79f-b737-801b-b507-d8cd897ee092';
const Q44_ID = '3aeff79f-b737-8055-96f0-f9c5620f50ed';

// 新题干
const Q43_TEXT = '如果用一句话形容你目前的目标状态，你会选哪个？';
const Q44_TEXT = '提到"钱"，你心里最先浮现的情绪是什么？如果用一句话形容金钱在你人生中的角色，你会选哪个？';

// Q43 选项（目标状态）
const Q43_OPTIONS = [
  { text: '我有清晰的目标，每天都在推进', score: 5 },
  { text: '我有方向，但还在摸索具体路径', score: 4 },
  { text: '我知道自己不想要什么，但不知道想要什么', score: 3 },
  { text: '目标经常变，还没找到真正想做的事', score: 2 },
  { text: '我没什么目标，过好眼前就行', score: 2 },
  { text: '我有目标，但一直没行动', score: 2 },
  { text: '我的目标就是赚钱，其他没多想', score: 3 },
  { text: '我的目标很模糊，说不清楚', score: 1 },
];

// Q44 选项（金钱角色）
const Q44_OPTIONS = [
  { text: '工具——帮我实现想要的生活', score: 5 },
  { text: '安全感——有钱心里才踏实', score: 4 },
  { text: '负担——一想到钱就焦虑', score: 2 },
  { text: '证明——有钱才能被看得起', score: 3 },
  { text: '自由——有钱才能做自己', score: 4 },
  { text: '无所谓——钱多钱少都能活', score: 3 },
  { text: '动力——钱是我努力的目标', score: 4 },
  { text: '脏东西——谈钱伤感情，追求钱不体面', score: 1 },
];

async function main() {
  console.log('=== 更新 Q43 ===');
  const q43Update = await updatePage(Q43_ID, {
    '题目内容': makeTitle(Q43_TEXT),
    '题目类型': makeSelect('单选'),
  });
  console.log('  题目更新:', q43Update ? '成功' : '失败');

  console.log('\n=== 创建 Q43 选项 ===');
  const letters = 'ABCDEFGH';
  for (let i = 0; i < Q43_OPTIONS.length; i++) {
    const opt = Q43_OPTIONS[i];
    const result = await createPage('options', {
      '选项内容': makeTitle(opt.text),
      '选项值': makeRichText(letters[i]),
      '排序': makeNumber(i + 1),
      '分值': makeNumber(opt.score),
      '所属题目': makeRelation([Q43_ID]),
    });
    console.log(`  ${letters[i]}. ${opt.text} (分值:${opt.score}) → ${result ? '成功' : '失败'}`);
    await sleep(400);
  }

  console.log('\n=== 更新 Q44 ===');
  const q44Update = await updatePage(Q44_ID, {
    '题目内容': makeTitle(Q44_TEXT),
    '题目类型': makeSelect('单选'),
  });
  console.log('  题目更新:', q44Update ? '成功' : '失败');

  console.log('\n=== 创建 Q44 选项 ===');
  for (let i = 0; i < Q44_OPTIONS.length; i++) {
    const opt = Q44_OPTIONS[i];
    const result = await createPage('options', {
      '选项内容': makeTitle(opt.text),
      '选项值': makeRichText(letters[i]),
      '排序': makeNumber(i + 1),
      '分值': makeNumber(opt.score),
      '所属题目': makeRelation([Q44_ID]),
    });
    console.log(`  ${letters[i]}. ${opt.text} (分值:${opt.score}) → ${result ? '成功' : '失败'}`);
    await sleep(400);
  }

  console.log('\n=== 完成 ===');
  console.log('Q43: text → 单选, 8个选项已创建');
  console.log('Q44: text → 单选, 8个选项已创建');
}

main().catch(e => console.error(e));
