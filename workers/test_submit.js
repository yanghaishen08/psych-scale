/**
 * 测试提交：婚姻质量多维评估
 * 模拟用户答题（全部选"完全符合我"=5分），验证评分逻辑
 */
const https = require('https');

const WORKER_URL = 'https://www.moonsheep.cloud';

function get(path) {
  return new Promise((resolve, reject) => {
    https.get(`${WORKER_URL}${path}`, (res) => {
      let chunks = '';
      res.on('data', (c) => (chunks += c));
      res.on('end', () => resolve(JSON.parse(chunks)));
    }).on('error', reject);
  });
}

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const url = new URL(path, WORKER_URL);
    const req = https.request({
      method: 'POST',
      hostname: url.hostname,
      path: url.pathname,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    }, (res) => {
      let chunks = '';
      res.on('data', (c) => (chunks += c));
      res.on('end', () => resolve(JSON.parse(chunks)));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  const SCALE_ID = '3eaff79f-b737-8175-9977-d485bab15359';

  console.log('1. 获取量表详情...');
  const detail = await get(`/api/scale/${SCALE_ID}`);

  const items = detail.scale.content_items.filter(i => i.type === 'question' && i.question_type === 'single_choice' && i.options.length > 0);

  const scoredQuestions = items.filter(q => q.options.some(o => o.score > 0));
  console.log(`  共 ${items.length} 道选择题，其中 ${scoredQuestions.length} 道有分值的核心题`);

  const answers = {};
  for (const q of scoredQuestions) {
    const opt = q.options.find(o => o.text === '完全符合我');
    if (opt) {
      answers[q.id] = opt.id;
    } else {
      answers[q.id] = q.options[0].id;
    }
  }

  console.log(`2. 提交答题（${Object.keys(answers).length} 题，全选"完全符合我"）...`);
  const result = await post('/api/submit', {
    scale_id: SCALE_ID,
    answers,
    respondent_name: '测试用户',
  });

  console.log('\n3. 提交结果:');
  console.log(JSON.stringify(result, null, 2));

  if (result.success && result.result) {
    console.log('\n=== 评分详情 ===');
    const r = result.result;
    if (r.dimensions) {
      console.log('\n各维度得分:');
      for (const d of r.dimensions) {
        console.log(`  ${d.name}: ${d.percentile}分 (${d.level})`);
      }
      console.log(`\n综合指数: ${r.overall_score}`);
      console.log(`关系类型: ${r.type?.name || '未判定'}`);
    }
  }
}

main().catch(console.error);
