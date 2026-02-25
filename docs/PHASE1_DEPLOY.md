# Phase 1 部署指南 - AI 包装设计 MVP

## 概述
Phase 1 实现了：开发员选瓶型(1-3个) → AI自动生成包装方案(瓶型数×5风格) → 方案展示

## 新增/修改的文件

### 新增
| 文件 | 功能 |
|------|------|
| `api/ai/_dashscope.js` | DashScope API 封装（Prompt生成 + 文生图 + 轮询） |
| `api/ai/generate-package.js` | POST /api/ai/generate-package - 触发包装生成 |
| `api/ai/package-status.js` | GET /api/ai/package-status?product_id=xx - 查询进度 |
| `api/ai/regenerate-single.js` | POST /api/ai/regenerate-single - 单个方案重新生成 |
| `src/PackageDesignPanel.jsx` | 包装方案展示组件（方案墙 + 轮询 + 预览） |
| `sql/001_phase1_package_designs.sql` | 数据库建表 SQL |

### 修改
| 文件 | 改动说明 |
|------|----------|
| `src/ProductDevEdit.jsx` | 全面重写：去掉管理员审核 → 瓶型多选 → AI生成触发 |

## 部署步骤

### Step 1: 建表
1. 登录 Supabase Dashboard → SQL Editor
2. 复制粘贴 `sql/001_phase1_package_designs.sql` 的内容
3. 点击 Run 执行
4. 验证：`SELECT * FROM package_designs LIMIT 1;` 不报错即可

### Step 2: 配置环境变量
在 Vercel 项目 Settings → Environment Variables 中添加：

```
DASHSCOPE_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxx
```

获取方式：阿里云百炼平台 → API Key 管理 → 创建 API Key

### Step 3: 部署代码
```bash
cd Product-Development
git add .
git commit -m "Phase 1: AI包装设计MVP - 瓶型多选+DashScope文生图+方案墙"
git push origin main
```

Vercel 会自动触发部署。

### Step 4: 验证
1. 登录系统，找一个洗发水品类的产品（stage=1）
2. 点击编辑，进入「AI 包装设计」页面
3. 选择 1 个瓶型
4. 点击「AI 生成包装」按钮
5. 等待 1-2 分钟，查看生成的 5 套方案

## 技术细节

### 生成流程
```
用户选瓶型(1-3) → 前端调 /api/ai/generate-package
  → 后端遍历 [瓶型×5风格]
    → qwen-plus 生成英文Prompt
    → wanx2.1-t2i-turbo 文生图（异步）
    → 轮询等待结果（每8秒，最长3分钟）
    → 写入 package_designs 表
  → 返回汇总结果
```

### 并行策略
每 3 个任务一批并行，避免 DashScope API 限流。

### 排版风格（内置5种）
| ID | 名称 | 说明 |
|----|------|------|
| A | 居中对称 | 标题居中+瓶型居中+卖点在下方 |
| B | 左右分栏 | 瓶型左侧+标题卖点右侧竖排 |
| C | 产品主导 | 瓶型占80%画面+小字点缀 |
| D | 元素环绕 | 成分元素图标环绕瓶型 |
| E | 场景沉浸 | 产品融入使用场景 |

### 成本
- 单次生成（1瓶型×5风格）≈ ¥0.30 + Prompt ¥0.05 ≈ ¥0.35
- 单次生成（3瓶型×5风格）≈ ¥0.90 + Prompt ¥0.15 ≈ ¥1.05
- 新用户有 500 张免费额度

## 注意事项
1. DashScope 生成的图片 URL 有效期 24 小时，Phase 2 需要加转存逻辑
2. Vercel Serverless Function 默认 10s 超时，需要在 vercel.json 配置 maxDuration
3. 当前 RLS 策略对所有人开放，生产环境需要加权限控制
