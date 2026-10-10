/**
 * 查询量表内容，找出需要修改的页面ID
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

async function main() {
  const SCALE_ID = '3eaff79f-b737-8175-9977-d485bab15359';
  const detail = await get(`/api/scale/${SCALE_ID}`);
  const items = detail.scale.content_items;

  console.log('=== 所有内容项（按排序） ===');
  for (const item of items) {
    if (item.type === 'section') {
      console.log(`[Section] sort=${item.sort_order}  title=${item.title}  id=${item.id}`);
    } else {
      const text = item.text.slice(0, 30);
      console.log(`[Q] sort=${item.sort_order}  ${text}...  id=${item.id}`);
    }
  }

  // 找Q26
  const q26 = items.find(i => i.text && i.text.includes('Q26.'));
  if (q26) {
    console.log(`\nQ26 ID: ${q26.id}`);
    console.log(`Q26 完整标题: ${q26.text}`);
  }

  // 找导语
  const intro = items.find(i => i.type === 'section');
  if (intro) {
    console.log(`\n导语 ID: ${intro.id}`);
    console.log(`导语 sort: ${intro.sort_order}`);
  }
}

main().catch(console.error);
