/**
 * DeepSeek AI 调用模块
 *
 * 负责：
 * - 调用 DeepSeek Chat Completions API 生成分析报告
 * - 处理 429 限流重试（3 次重试，间隔 5s/10s/15s）
 * - 处理 402（余额不足）、401（Key 无效）等错误
 * - 构建答题数据文本摘要
 *
 * DeepSeek API 文档: https://platform.deepseek.com/api-docs
 */

// 默认系统提示词（量表未配置专属提示词时使用）
const DEFAULT_SYSTEM_PROMPT =
  '你是一位专业的心理学分析师，擅长根据心理量表的答题结果进行深入分析。' +
  '请生成结构化的分析报告，包括总体评估、各维度分析和具体建议。' +
  '报告使用 Markdown 格式输出。';

/**
 * 延迟函数
 * @param {number} ms - 延迟毫秒数
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 调用 DeepSeek Chat Completions API
 *
 * 包含完整的错误处理和重试机制：
 * - 429（限流）: 重试 3 次，间隔 5s / 10s / 15s
 * - 402（余额不足）: 直接返回错误
 * - 401（Key 无效）: 直接返回错误
 * - 其他错误: 直接返回错误
 *
 * @param {Object} env - Workers 环境变量
 * @param {Array} messages - 消息数组 [{ role, content }]
 * @returns {Promise<Object>} 调用结果 { success, content?, error?, raw? }
 */
async function callDeepSeek(env, messages) {
  const apiKey = env.DEEPSEEK_API_KEY;
  const apiUrl = env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions';
  const model = env.DEEPSEEK_MODEL || 'deepseek-chat';

  if (!apiKey) {
    return { success: false, error: '【配置错误】未设置 DEEPSEEK_API_KEY 环境变量' };
  }

  const maxRetries = 3;
  const retryDelays = [5000, 10000, 15000]; // 5s, 10s, 15s

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const resp = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          temperature: 0.7,
          max_tokens: 4000,
          stream: false,
        }),
      });

      // 请求成功
      if (resp.ok) {
        const data = await resp.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          return { success: true, content: content, raw: data };
        }
        return {
          success: false,
          error: '【AI 返回异常】AI 返回内容为空',
          raw: data,
        };
      }

      // 处理错误状态码
      if (resp.status === 429) {
        // 限流：重试
        if (attempt < maxRetries - 1) {
          console.log(`DeepSeek API 限流，第 ${attempt + 1} 次重试，等待 ${retryDelays[attempt] / 1000}s...`);
          await delay(retryDelays[attempt]);
          continue;
        }
        return {
          success: false,
          error: '【请求过于频繁】API 调用频率超限，已重试 3 次仍失败，请等待几分钟后重试。',
        };
      } else if (resp.status === 402) {
        return {
          success: false,
          error: '【账户余额不足】DeepSeek 账户余额已用完，请前往 DeepSeek 开放平台充值后重试。',
        };
      } else if (resp.status === 401) {
        return {
          success: false,
          error: '【API Key 无效】请检查 wrangler.toml 中的 DEEPSEEK_API_KEY 配置是否正确。',
        };
      } else {
        // 其他 HTTP 错误
        let errorDetail = '';
        try {
          const errData = await resp.json();
          errorDetail = errData.error?.message || JSON.stringify(errData);
        } catch (e) {
          errorDetail = await resp.text().catch(() => '未知错误');
        }
        return {
          success: false,
          error: `【AI 服务错误】HTTP ${resp.status}: ${errorDetail}`,
        };
      }
    } catch (err) {
      // 网络错误或异常：重试
      if (attempt < maxRetries - 1) {
        console.log(`DeepSeek API 网络错误，第 ${attempt + 1} 次重试: ${err.message}`);
        await delay(retryDelays[attempt]);
        continue;
      }
      return {
        success: false,
        error: `【AI 服务不可用】${err.message}`,
      };
    }
  }

  return {
    success: false,
    error: '【请求超时】AI 服务响应超时，已重试 3 次仍失败，请稍后重试。',
  };
}

/**
 * 构建答题数据文本摘要
 *
 * 将量表题目和答案格式化为 AI 可读的文本，
 * 包含量表名称、答题时间、每道题的题目内容和选中答案。
 *
 * @param {Object} scale - 量表对象（需包含 title 字段）
 * @param {Object} answers - 答题数据 { question_id: option_id | [option_id] | "text" }
 * @param {Array} contentItems - 量表内容项数组（含 question 类型和 options）
 * @returns {string} 格式化的答题文本
 */
function buildResponseText(scale, answers, contentItems) {
  let text = `量表名称: ${scale.title || '未命名量表'}\n\n`;
  text += `答题时间: ${new Date().toISOString()}\n\n`;
  text += '=== 答题详情 ===\n\n';

  // 筛选出题目项
  const questions = contentItems.filter((item) => item.type === 'question');

  questions.forEach((q, index) => {
    text += `题目 ${index + 1}: ${q.text}\n`;
    const answer = answers[q.id];

    if (q.question_type === 'single_choice') {
      // 单选题：查找选中选项的文本
      const opt = q.options?.find((o) => o.id === answer);
      text += `答案: ${opt ? opt.text : '未选择'}\n`;
    } else if (q.question_type === 'multiple_choice') {
      // 多选题：查找所有选中选项的文本
      if (Array.isArray(answer) && answer.length > 0) {
        const optTexts = answer
          .map((aid) => q.options?.find((o) => o.id === aid)?.text || aid)
          .join(', ');
        text += `答案: ${optTexts}\n`;
      } else {
        text += '答案: 未选择\n';
      }
    } else {
      // 文本题：直接输出文本
      text += `答案: ${answer || '未填写'}\n`;
    }
    text += '\n';
  });

  return text;
}

/**
 * 完整的 AI 分析流程
 *
 * 流程：
 * 1. 确定系统提示词（量表专属提示词优先，为空时使用默认提示词）
 * 2. 构建答题数据文本
 * 3. 组装消息数组（system + user）
 * 4. 调用 DeepSeek API
 * 5. 返回结果
 *
 * @param {Object} env - Workers 环境变量
 * @param {Object} scale - 量表对象（需包含 ai_prompt 和 title 字段）
 * @param {Object} answers - 答题数据
 * @param {Array} contentItems - 量表内容项数组
 * @returns {Promise<Object>} { success, content?, error? }
 */
async function generateReport(env, scale, answers, contentItems) {
  // 1. 确定系统提示词：量表专属提示词优先
  const systemPrompt =
    scale.ai_prompt && scale.ai_prompt.trim()
      ? scale.ai_prompt.trim()
      : DEFAULT_SYSTEM_PROMPT;

  // 2. 构建答题数据文本
  const responseText = buildResponseText(scale, answers, contentItems);

  // 3. 组装消息数组
  const messages = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `请根据以下心理量表答题结果生成详细的分析报告，包括总体评估、各维度分析、建议等:\n\n${responseText}`,
    },
  ];

  // 4. 调用 DeepSeek API
  console.log(`[AI] 开始生成报告，量表: ${scale.title}, 题目数: ${contentItems.filter((i) => i.type === 'question').length}`);
  const result = await callDeepSeek(env, messages);

  if (result.success) {
    console.log('[AI] 报告生成成功');
  } else {
    console.error('[AI] 报告生成失败:', result.error);
  }

  return result;
}

// ============================================================
// 模块导出
// ============================================================

export {
  callDeepSeek,
  buildResponseText,
  generateReport,
  DEFAULT_SYSTEM_PROMPT,
};
