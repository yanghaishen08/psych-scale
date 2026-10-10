/**
 * 查找"你会发财嘛？"量表，获取其完整数据（含Q43/Q44的页面ID）
 */

const https = require('https');

const WORKER_URL = 'https://www.moonsheep.cloud';

function get(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, WORKER_URL);
    https.get(url, (res) => {
      let c = '';
      res.on('data', (d) => (c += d));
      res.on('end', () => {
        try { resolve(JSON.parse(c)); }
        catch { resolve({ raw: c }); }
      });
    }).on('error', reject);
  });
}

async function main() {
  // 1. 获取量表列表
  console.log('=== 获取量表列表 ===');
  const scalesResp = await get('/api/scales');
  const scales = scalesResp.data || scalesResp.scales || scalesResp;
  
  if (!Array.isArray(scales)) {
    console.log('返回数据:', JSON.stringify(scales).slice(0, 500));
    return;
  }

  // 找"你会发财嘛？"
  const wealthScale = scales.find(s => 
    (s.title || '').includes('发财') || (s.title || '').includes('财富')
  );
  
  if (!wealthScale) {
    console.log('所有量表:');
    scales.forEach(s => console.log(`  - ${s.id}: ${s.title} (${s.scale_type})`));
    return;
  }

  console.log(`找到量表: ${wealthScale.title}`);
  console.log(`  ID: ${wealthScale.id}`);
  console.log(`  类型: ${wealthScale.scale_type}`);
  console.log(`  结果规则: ${wealthScale.result_rules || '无'}`);

  // 2. 获取量表详情
  console.log('\n=== 获取量表详情 ===');
  const detail = await get(`/api/scale/${wealthScale.id}`);
  
  // 打印基本信息
  console.log(`  标题: ${detail.title || detail.scale?.title}`);
  console.log(`  描述: ${(detail.description || detail.scale?.description || '').slice(0, 100)}`);
  console.log(`  结果规则: ${JSON.stringify(detail.result_rules || detail.scale?.result_rules)}`);

  // 3. 找Q43和Q44
  const items = detail.contentItems || detail.items || detail.content || [];
  console.log(`\n  内容项总数: ${items.length}`);
  
  const q43 = items.find(it => 
    it.type === 'question' && (it.sort_order === 43 || it.sortOrder === 43 || it.question_number === 43)
  );
  const q44 = items.find(it => 
    it.type === 'question' && (it.sort_order === 44 || it.sortOrder === 44 || it.question_number === 44)
  );

  // 如果没找到，尝试找包含关键词的
  const textQ43 = items.find(it => 
    it.type === 'question' && (it.text || '').includes('目前最想实现的一个目标')
  );
  const textQ44 = items.find(it => 
    it.type === 'question' && (it.text || '').includes('钱') && (it.text || '').includes('情绪')
  );

  const finalQ43 = q43 || textQ43;
  const finalQ44 = q44 || textQ44;

  console.log('\n=== Q43 ===');
  if (finalQ43) {
    console.log(`  ID: ${finalQ43.id}`);
    console.log(`  sort: ${finalQ43.sort_order || finalQ43.sortOrder}`);
    console.log(`  text: ${(finalQ43.text || '').slice(0, 100)}`);
    console.log(`  type: ${finalQ43.question_type || finalQ43.type}`);
    console.log(`  options: ${JSON.stringify(finalQ43.options || [])}`);
  } else {
    console.log('  未找到！打印所有题目的sort和text前30字:');
    items.filter(it => it.type === 'question').forEach(it => {
      console.log(`    sort=${it.sort_order || it.sortOrder}: ${(it.text || '').slice(0, 40)}`);
    });
  }

  console.log('\n=== Q44 ===');
  if (finalQ44) {
    console.log(`  ID: ${finalQ44.id}`);
    console.log(`  sort: ${finalQ44.sort_order || finalQ44.sortOrder}`);
    console.log(`  text: ${(finalQ44.text || '').slice(0, 100)}`);
    console.log(`  type: ${finalQ44.question_type || finalQ44.type}`);
    console.log(`  options: ${JSON.stringify(finalQ44.options || [])}`);
  } else {
    console.log('  未找到！');
  }

  // 4. 打印所有内容项的结构（取一个样本）
  if (items.length > 0) {
    console.log('\n=== 样本题目结构 ===');
    const sampleQ = items.find(it => it.type === 'question' && it.options && it.options.length > 0);
    if (sampleQ) {
      console.log(`  样本: ${JSON.stringify(sampleQ).slice(0, 500)}`);
    }
  }
}

main().catch(e => console.error(e));
