/**
 * Cloudflare D1 数据库操作模块
 *
 * 使用 Cloudflare D1 (SQLite) 存储答题记录和报告
 * 通过 env.DB 绑定访问 D1 数据库
 *
 * D1 文档: https://developers.cloudflare.com/d1/
 */

/**
 * 保存答题记录到 D1 数据库
 * @param {Object} env - Workers 环境变量（需包含 DB 绑定）
 * @param {Object} data - 答题数据
 * @param {string} data.id - UUID（由 crypto.randomUUID() 生成）
 * @param {string} data.scale_id - 量表 ID（Notion 页面 ID）
 * @param {string} data.scale_title - 量表标题
 * @param {string} data.scale_type - 量表类型（ai_analysis / custom_result）
 * @param {Object} data.answers - 答题数据对象
 * @param {string|null} data.respondent_name - 答题人姓名
 * @param {string} data.status - 状态（pending / completed / failed）
 * @param {string|null} data.ip_address - 访客 IP
 * @returns {Promise<string>} 插入的记录 ID
 */
async function saveResponse(env, data) {
  const {
    id,
    scale_id,
    scale_title,
    scale_type,
    answers,
    respondent_name,
    status,
    ip_address,
  } = data;

  const stmt = env.DB.prepare(
    `INSERT INTO responses
       (id, scale_id, scale_title, scale_type, answers, report_content, respondent_name, status, ip_address)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  await stmt
    .bind(
      id,
      scale_id,
      scale_title || null,
      scale_type,
      JSON.stringify(answers),
      null, // report_content 初始为空，生成报告后更新
      respondent_name || null,
      status || 'pending',
      ip_address || null
    )
    .run();

  return id;
}

/**
 * 更新答题记录的报告内容和状态
 * @param {Object} env - Workers 环境变量
 * @param {string} responseId - 记录 ID
 * @param {string} reportContent - 报告内容
 * @param {string} status - 新状态（completed / failed）
 * @returns {Promise<void>}
 */
async function updateResponseReport(env, responseId, reportContent, status) {
  await env.DB.prepare(
    `UPDATE responses
     SET report_content = ?, status = ?, completed_at = datetime('now')
     WHERE id = ?`
  )
    .bind(reportContent, status, responseId)
    .run();
}

/**
 * 获取报告（答题记录）
 * @param {Object} env - Workers 环境变量
 * @param {string} responseId - 记录 ID
 * @returns {Promise<Object|null>} 记录对象，不存在返回 null
 */
async function getReport(env, responseId) {
  return env.DB.prepare('SELECT * FROM responses WHERE id = ?')
    .bind(responseId)
    .first();
}

/**
 * 获取量表的所有答题记录（用于统计或管理）
 * @param {Object} env - Workers 环境变量
 * @param {string} scaleId - 量表 ID
 * @param {number} limit - 返回数量限制
 * @param {number} offset - 偏移量
 * @returns {Promise<Array>} 记录数组
 */
async function getResponsesByScale(env, scaleId, limit = 50, offset = 0) {
  const result = await env.DB.prepare(
    `SELECT * FROM responses WHERE scale_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`
  )
    .bind(scaleId, limit, offset)
    .all();

  return result.results || [];
}

/**
 * 获取最近的答题记录
 * @param {Object} env - Workers 环境变量
 * @param {number} limit - 返回数量
 * @returns {Promise<Array>} 记录数组
 */
async function getRecentResponses(env, limit = 10) {
  const result = await env.DB.prepare(
    `SELECT * FROM responses ORDER BY created_at DESC LIMIT ?`
  )
    .bind(limit)
    .all();

  return result.results || [];
}

/**
 * 统计答题记录数量
 * @param {Object} env - Workers 环境变量
 * @param {string|null} scaleId - 可选：按量表过滤
 * @returns {Promise<number>} 记录总数
 */
async function countResponses(env, scaleId = null) {
  if (scaleId) {
    const result = await env.DB.prepare(
      `SELECT COUNT(*) as count FROM responses WHERE scale_id = ?`
    )
      .bind(scaleId)
      .first();
    return result?.count || 0;
  }

  const result = await env.DB.prepare(
    `SELECT COUNT(*) as count FROM responses`
  ).first();
  return result?.count || 0;
}

// ============================================================
// 模块导出
// ============================================================

export {
  saveResponse,
  updateResponseReport,
  getReport,
  getResponsesByScale,
  getRecentResponses,
  countResponses,
};
