/**
 * 自定义结果计分逻辑模块
 *
 * 适用于 custom_result 类型的量表：
 * - 解析 Notion 中的"结果规则"JSON
 * - 根据答案计算总分
 * - 根据分数范围匹配结果
 *
 * 规则 JSON 格式:
 * {
 *   "scoring": "sum",           // 计分方式: sum（求和）
 *   "ranges": [
 *     { "min": 0, "max": 10, "result": "结果文本1" },
 *     { "min": 11, "max": 20, "result": "结果文本2" }
 *   ]
 * }
 */

/**
 * 汇总选项分值
 * 遍历所有答案，将选项的分值累加
 *
 * @param {Object} answers - 答题数据 { question_id: option_id | [option_id, ...] | "text" }
 * @param {Array} contentItems - 量表内容项数组（含 question 类型的 options）
 * @returns {number} 总分
 */
function sumScores(answers, contentItems) {
  let total = 0;

  // 构建选项分值查找表: optionId -> score
  const optionScores = new Map();
  for (const item of contentItems) {
    if (item.type === 'question' && item.options) {
      for (const opt of item.options) {
        optionScores.set(opt.id, opt.score || 0);
      }
    }
  }

  // 遍历答案累加分值
  for (const [questionId, answerValue] of Object.entries(answers)) {
    if (answerValue === null || answerValue === undefined || answerValue === '') {
      continue;
    }

    if (Array.isArray(answerValue)) {
      // 多选题：累加每个选中选项的分值
      for (const optId of answerValue) {
        total += optionScores.get(optId) || 0;
      }
    } else if (typeof answerValue === 'string') {
      // 单选题：加上选中选项的分值
      total += optionScores.get(answerValue) || 0;
    }
    // text 类型不计分
  }

  return total;
}

/**
 * 计算自定义结果
 *
 * 流程：
 * 1. 解析量表的"结果规则"JSON
 * 2. 根据计分方式计算总分
 * 3. 在 ranges 中匹配分数范围
 * 4. 返回对应的结果文本
 *
 * @param {Object} scale - 量表对象（需包含 result_rules 和 custom_result 字段）
 * @param {Object} answers - 答题数据
 * @param {Array} contentItems - 量表内容项数组
 * @returns {string} 计算结果文本
 */
function calculateCustomResult(scale, answers, contentItems) {
  // 1. 解析结果规则 JSON
  let rules = null;
  if (scale.result_rules && scale.result_rules.trim()) {
    try {
      rules = JSON.parse(scale.result_rules);
    } catch (e) {
      // JSON 解析失败，回退到自定义结果文本
      console.error('结果规则 JSON 解析失败:', e.message);
      return scale.custom_result || '暂无结果';
    }
  }

  // 2. 如果没有规则，直接返回自定义结果文本
  if (!rules || !rules.ranges || !Array.isArray(rules.ranges) || rules.ranges.length === 0) {
    return scale.custom_result || '暂无结果';
  }

  // 3. 根据计分方式计算总分
  const scoringMethod = rules.scoring || 'sum';
  let totalScore = 0;

  if (scoringMethod === 'sum') {
    totalScore = sumScores(answers, contentItems);
  } else {
    // 默认使用求和
    totalScore = sumScores(answers, contentItems);
  }

  // 4. 在 ranges 中匹配分数范围
  for (const range of rules.ranges) {
    const min = range.min !== undefined ? range.min : -Infinity;
    const max = range.max !== undefined ? range.max : Infinity;

    if (totalScore >= min && totalScore <= max) {
      return range.result || scale.custom_result || '暂无结果';
    }
  }

  // 5. 未匹配到任何范围，返回默认结果
  return scale.custom_result || `您的得分是 ${totalScore} 分。`;
}

// ============================================================
// 模块导出
// ============================================================

export {
  calculateCustomResult,
  sumScores,
};
