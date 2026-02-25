-- ============================================================
-- ARES AI Commerce - Phase 1 数据库迁移
-- 在 Supabase Dashboard → SQL Editor 中执行
-- ============================================================

-- 1. package_designs 表（核心：包装方案）
CREATE TABLE IF NOT EXISTS package_designs (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL,           -- 关联产品 ID
  bottle_id INTEGER,                     -- 使用的瓶型 ID
  bottle_name VARCHAR(100),              -- 瓶型名称（冗余，方便展示）
  layout_style_id VARCHAR(10),           -- 排版风格编号 A/B/C/D/E
  layout_style_name VARCHAR(50),         -- 排版风格名称
  design_url TEXT,                       -- 生成的包装图 URL
  prompt_used TEXT,                      -- 实际使用的 Prompt
  ref_image_urls JSONB DEFAULT '[]',     -- 参考图 URL 数组
  status VARCHAR(30) DEFAULT 'pending',  -- pending/approved/rejected/need_revision/generating/failed
  reviewer_id INTEGER,                   -- 审核设计师 ID
  reviewer_note TEXT,                    -- 设计师备注
  revision_url TEXT,                     -- 精修后的图 URL
  created_product_id INTEGER,            -- 通过后创建的新产品 ID
  dashscope_task_id VARCHAR(100),        -- DashScope 异步任务 ID
  retry_count INTEGER DEFAULT 0,         -- 重试次数
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_pd_product_id ON package_designs(product_id);
CREATE INDEX IF NOT EXISTS idx_pd_status ON package_designs(status);
CREATE INDEX IF NOT EXISTS idx_pd_bottle_id ON package_designs(bottle_id);

-- 2. RLS 策略（允许匿名读写，与现有 bottles/products 表一致）
ALTER TABLE package_designs ENABLE ROW LEVEL SECURITY;

-- 允许所有人读
CREATE POLICY "Allow public read on package_designs"
  ON package_designs FOR SELECT
  USING (true);

-- 允许所有人写（开发阶段简化，生产环境应限制）
CREATE POLICY "Allow public insert on package_designs"
  ON package_designs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update on package_designs"
  ON package_designs FOR UPDATE
  USING (true);

CREATE POLICY "Allow public delete on package_designs"
  ON package_designs FOR DELETE
  USING (true);

-- ============================================================
-- 完成！可以验证：
-- SELECT * FROM package_designs LIMIT 1;
-- ============================================================
