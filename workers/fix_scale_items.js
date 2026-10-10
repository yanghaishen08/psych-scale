/**
 * 修复婚姻质量量表：
 * 1. 删掉Q26标题中的"（反向计分）"
 * 2. 将导语移到所有核心题目前（sort=3.5，介于基本信息题和Q1之间）
 */
const https = require('https');

const ADMIN_KEY = 'mscale_admin_6f8a2b9e';

function patchPage(pageId, properties) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ page_id: pageId, properties });
    const opts = {
      method: 'POST',
      hostname: 'www.moonsheep.cloud',
      path: '/api/admin/notion/update-page',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Key': ADMIN_KEY,
        'Content-Length': Buffer.byteLength(data),
      },
    };
    const req = https.request(opts, res => {
      let c = '';
      res.on('data', d => c += d);
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

async function main() {
  const Q26_ID = '3eaff79f-b737-814e-ab65-c7b22c29f79c';
  const INTRO_ID = '3eaff79f-b737-81ea-89f8-d3353c50de52';

  // 修复1：删掉Q26标题中的"（反向计分）"
  console.log('[1/2] 更新Q26标题，删除"（反向计分）"...');
  const r1 = await patchPage(Q26_ID, {
    '题目内容': { title: [{ text: { content: 'Q26. 我经常觉得自己承担了大部分家务或育儿责任，心里有怨气。' } }] },
  });
  console.log(`  结果: ${r1.success ? '成功' : '失败 - ' + r1.error}`);
  await sleep(500);

  // 修复2：将导语移到sort=3.5（基本信息题sort=1-3之后，核心题Q1 sort=4之前）
  console.log('[2/2] 移动导语到所有核心题目前（sort=3.5）...');
  const r2 = await patchPage(INTRO_ID, {
    '排序': { number: 3.5 },
  });
  console.log(`  结果: ${r2.success ? '成功' : '失败 - ' + r2.error}`);

  console.log('\n修复完成！');
}

main().catch(console.error);
