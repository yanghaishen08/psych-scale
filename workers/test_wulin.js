/**
 * 测试提交：武林外传·同福客栈人格测试
 * 模拟答题（全部选A），验证角色匹配计分逻辑
 */
const https = require('https');

function get(path) {
  return new Promise((resolve, reject) => {
    https.get(`https://www.moonsheep.cloud${path}`, (res) => {
      let c = '';
      res.on('data', d => c += d);
      res.on('end', () => resolve(JSON.parse(c)));
    }).on('error', reject);
  });
}

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const url = new URL(path, 'https://www.moonsheep.cloud');
    const req = https.request({
      method: 'POST',
      hostname: url.hostname,
      path: url.pathname,
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    }, (res) => {
      let c = '';
      res.on('data', d => c += d);
      res.on('end', () => resolve(JSON.parse(c)));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  const SCALE_ID = '3ebff79f-b737-8102-bfe5-cad7c18b3725';

  console.log('1. 获取量表详情...');
  const detail = await get(`/api/scale/${SCALE_ID}`);
  const items = detail.scale.content_items.filter(i => i.type === 'question' && i.question_type === 'single_choice' && i.options.length > 0);
  console.log(`  共 ${items.length} 道题`);

  // 全选A选项
  const answers = {};
  for (const q of items) {
    const optA = q.options.find(o => o.text.startsWith('A.'));
    if (optA) answers[q.id] = optA.id;
  }
  console.log(`  答题数: ${Object.keys(answers).length}（全选A）`);

  console.log('\n2. 提交答题...');
  const result = await post('/api/submit', {
    scale_id: SCALE_ID,
    answers,
    respondent_name: '测试用户',
  });

  console.log('\n3. 提交结果:');
  if (result.success && result.result) {
    console.log('  提交成功！');
    console.log('\n=== 报告内容 ===');
    console.log(result.result.slice(0, 2000));
    console.log('\n...(报告长度:', result.result.length, '字符)');
  } else {
    console.log('  提交失败！');
    console.log(JSON.stringify(result, null, 2));
  }
}

main().catch(console.error);
