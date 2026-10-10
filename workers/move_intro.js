/**
 * 将测试导语移到所有题目的最前面（sort=0.5）
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

async function main() {
  const INTRO_ID = '3eaff79f-b737-81ea-89f8-d3353c50de52';

  console.log('将导语移到所有题目前（sort=0.5）...');
  const r = await patchPage(INTRO_ID, {
    '排序': { number: 0.5 },
  });
  console.log(`结果: ${r.success ? '成功' : '失败 - ' + r.error}`);
}

main().catch(console.error);
