-- ============================================================
-- 心理量表测评平台 — Cloudflare D1 数据库建表 SQL
-- 使用方法: wrangler d1 execute psych-scale-db --file=schema.sql
-- ============================================================

-- 答题记录表（存储所有答题数据和生成的报告）
CREATE TABLE IF NOT EXISTS responses (
  id              TEXT PRIMARY KEY,                  -- UUID，由 crypto.randomUUID() 生成
  scale_id        TEXT NOT NULL,                     -- Notion 量表页面 ID
  scale_title     TEXT,                              -- 量表标题（冗余存储，便于查询展示）
  scale_type      TEXT NOT NULL,                     -- 量表类型: ai_analysis / custom_result
  answers         TEXT NOT NULL,                     -- 答题数据 JSON: { "question_id": "option_id" | ["option_id"] | "text" }
  report_content  TEXT,                              -- 报告内容（AI 生成或自定义结果）
  respondent_name TEXT,                              -- 答题人姓名（可选）
  status          TEXT DEFAULT 'pending',            -- 状态: pending / completed / failed
  ip_address      TEXT,                              -- 访客 IP 地址
  created_at      TEXT DEFAULT (datetime('now')),    -- 创建时间
  completed_at    TEXT                               -- 完成时间
);

-- 索引：按量表 ID 查询
CREATE INDEX IF NOT EXISTS idx_responses_scale_id ON responses(scale_id);

-- 索引：按创建时间排序
CREATE INDEX IF NOT EXISTS idx_responses_created_at ON responses(created_at);

-- 索引：按状态查询
CREATE INDEX IF NOT EXISTS idx_responses_status ON responses(status);
