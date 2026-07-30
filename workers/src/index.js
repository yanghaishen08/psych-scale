/**
 * Cloudflare Workers 入口和路由模块
 *
 * 路由设计:
 *   GET  /api/health     → 健康检查
 *   GET  /api/scales     → 获取量表列表
 *   GET  /api/scale/:id  → 获取量表详情（含题目和选项）
 *   POST /api/submit     → 提交答题
 *   GET  /api/report/:id → 获取报告
 *
 * 功能：
 * - URL 解析和路径匹配
 * - 路由分发到对应处理函数
 * - CORS 处理（OPTIONS 预检请求）
 * - 统一错误处理（JSON 错误响应）
 */

import { getPublishedScales, getScaleById, getScaleContent } from './notion.js';
import { generateReport } from './ai.js';
import { calculateCustomResult } from './scoring.js';
import { saveResponse, getReport, updateResponseReport } from './db.js';

// ============================================================
// CORS 和响应工具
// ============================================================

/**
 * 构建 CORS 响应头
 * @param {Object} env - Workers 环境变量（读取 CORS_ORIGIN）
 * @returns {Object}
 */
function corsHeaders(env) {
  const origin = env?.CORS_ORIGIN || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

/**
 * 统一 JSON 响应
 * @param {Object} env - Workers 环境变量
 * @param {*} data - 响应数据
 * @param {number} status - HTTP 状态码
 * @returns {Response}
 */
function jsonResponse(env, data, status = 200) {
  return new Response(JSON.stringify(data), {
    status: status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders(env),
    },
  });
}

/**
 * 处理 CORS 预检请求（OPTIONS）
 * @param {Object} env - Workers 环境变量
 * @returns {Response}
 */
function handlePreflight(env) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(env),
  });
}

/**
 * 获取客户端 IP 地址
 * Cloudflare Workers 中通过 CF-Connecting-IP 头获取真实 IP
 * @param {Request} request
 * @returns {string}
 */
function getClientIP(request) {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

// ============================================================
// 路由处理函数
// ============================================================

/**
 * 健康检查
 * GET /api/health
 */
async function handleHealth(env) {
  return jsonResponse(env, {
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
}

/**
 * 获取量表列表
 * GET /api/scales
 */
async function handleGetScales(env) {
  const scales = await getPublishedScales(env);
  return jsonResponse(env, {
    success: true,
    scales: scales,
  });
}

/**
 * 获取量表详情
 * GET /api/scale/:id
 */
async function handleGetScale(env, scaleId) {
  if (!scaleId) {
    return jsonResponse(env, { success: false, error: '缺少量表 ID' }, 400);
  }

  const scale = await getScaleById(env, scaleId);
  if (!scale) {
    return jsonResponse(env, { success: false, error: '量表不存在或未发布' }, 404);
  }

  const contentItems = await getScaleContent(env, scaleId);

  return jsonResponse(env, {
    success: true,
    scale: {
      ...scale,
      content_items: contentItems,
    },
  });
}

/**
 * 提交答题
 * POST /api/submit
 *
 * 请求体: { scale_id, answers, respondent_name? }
 * answers 格式: { "question_id": "option_id" | ["option_id1","option_id2"] | "text" }
 */
async function handleSubmit(env, request) {
  // 解析请求体
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse(env, { success: false, error: '请求体不是有效的 JSON' }, 400);
  }

  const { scale_id, answers, respondent_name } = body;

  // 参数校验
  if (!scale_id) {
    return jsonResponse(env, { success: false, error: '缺少 scale_id 参数' }, 400);
  }
  if (!answers || typeof answers !== 'object') {
    return jsonResponse(env, { success: false, error: '缺少 answers 参数或格式不正确' }, 400);
  }

  // 获取量表信息
  const scale = await getScaleById(env, scale_id);
  if (!scale) {
    return jsonResponse(env, { success: false, error: '量表不存在' }, 404);
  }

  // 生成记录 ID
  const responseId = crypto.randomUUID();
  const ipAddress = getClientIP(request);
  const scaleType = scale.scale_type || 'ai_analysis';

  // 保存初始答题记录（状态: pending）
  await saveResponse(env, {
    id: responseId,
    scale_id: scale_id,
    scale_title: scale.title,
    scale_type: scaleType,
    answers: answers,
    respondent_name: respondent_name || null,
    status: 'pending',
    ip_address: ipAddress,
  });

  // 根据量表类型处理
  if (scaleType === 'custom_result') {
    // ===== 自定义结果型：根据规则计算结果 =====
    const contentItems = await getScaleContent(env, scale_id);
    const result = calculateCustomResult(scale, answers, contentItems);

    // 更新记录：保存结果，状态改为 completed
    await updateResponseReport(env, responseId, result, 'completed');

    return jsonResponse(env, {
      success: true,
      response_id: responseId,
      scale_type: 'custom_result',
      result: result,
      redirect: `/report.html?id=${responseId}`,
    });
  } else {
    // ===== AI 分析型：调用 DeepSeek 生成报告 =====
    const contentItems = await getScaleContent(env, scale_id);
    const aiResult = await generateReport(env, scale, answers, contentItems);

    if (aiResult.success) {
      // AI 生成成功：保存报告，状态改为 completed
      await updateResponseReport(env, responseId, aiResult.content, 'completed');

      return jsonResponse(env, {
        success: true,
        response_id: responseId,
        scale_type: 'ai_analysis',
        redirect: `/report.html?id=${responseId}`,
      });
    } else {
      // AI 生成失败：保存错误信息，状态改为 failed
      await updateResponseReport(env, responseId, aiResult.error, 'failed');

      return jsonResponse(
        env,
        {
          success: false,
          error: aiResult.error,
          response_id: responseId,
          redirect: `/report.html?id=${responseId}`,
        },
        500
      );
    }
  }
}

/**
 * 获取报告
 * GET /api/report/:id
 */
async function handleGetReport(env, reportId) {
  if (!reportId) {
    return jsonResponse(env, { success: false, error: '缺少报告 ID' }, 400);
  }

  const record = await getReport(env, reportId);
  if (!record) {
    return jsonResponse(env, { success: false, error: '报告不存在' }, 404);
  }

  return jsonResponse(env, {
    success: true,
    report: {
      id: record.id,
      scale_title: record.scale_title,
      report_content: record.report_content,
      scale_type: record.scale_type,
      status: record.status,
      created_at: record.created_at,
      completed_at: record.completed_at,
    },
  });
}

// ============================================================
// 主路由入口
// ============================================================

export default {
  /**
   * Workers fetch 处理器
   * @param {Request} request - 请求对象
   * @param {Object} env - 环境变量（包含 DB 绑定和 vars 配置）
   * @param {Object} ctx - 执行上下文
   * @returns {Promise<Response>}
   */
  async fetch(request, env, ctx) {
    // 处理 CORS 预检请求
    if (request.method === 'OPTIONS') {
      return handlePreflight(env);
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    try {
      // ===== 路由匹配 =====

      // GET /api/health — 健康检查
      if (path === '/api/health' && method === 'GET') {
        return await handleHealth(env);
      }

      // GET /api/scales — 获取量表列表
      if (path === '/api/scales' && method === 'GET') {
        return await handleGetScales(env);
      }

      // GET /api/scale/:id — 获取量表详情
      const scaleMatch = path.match(/^\/api\/scale\/([^\/]+)$/);
      if (scaleMatch && method === 'GET') {
        return await handleGetScale(env, scaleMatch[1]);
      }

      // POST /api/submit — 提交答题
      if (path === '/api/submit' && method === 'POST') {
        return await handleSubmit(env, request);
      }

      // GET /api/report/:id — 获取报告
      const reportMatch = path.match(/^\/api\/report\/([^\/]+)$/);
      if (reportMatch && method === 'GET') {
        return await handleGetReport(env, reportMatch[1]);
      }

      // 根路径 — 返回 API 信息
      if (path === '/' || path === '') {
        return jsonResponse(env, {
          success: true,
          name: '心理量表测评平台 API',
          version: '1.0.0',
          endpoints: [
            'GET  /api/health',
            'GET  /api/scales',
            'GET  /api/scale/:id',
            'POST /api/submit',
            'GET  /api/report/:id',
          ],
        });
      }

      // 未匹配的路由
      return jsonResponse(env, { success: false, error: `接口不存在: ${method} ${path}` }, 404);
    } catch (err) {
      // 统一错误处理
      console.error('API Error:', err);
      return jsonResponse(
        env,
        {
          success: false,
          error: err.message || '服务器内部错误',
        },
        500
      );
    }
  },
};
