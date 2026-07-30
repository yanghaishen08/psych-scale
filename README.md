# 心理量表测评平台（静态版）

> 基于 GitHub Pages + Cloudflare Workers + Notion 的 Serverless 心理量表平台

## 快速开始

### 1. 前端部署（GitHub Pages）

```bash
# 1. 在 GitHub 创建仓库，将项目推送上去
git init
git add .
git commit -m "初始化心理量表平台"
git remote add origin https://github.com/你的用户名/psych-scale.git
git push -u origin main

# 2. 在 GitHub 仓库设置中开启 Pages
#    Settings → Pages → Source → GitHub Actions
```

### 2. Notion 数据库配置

详见 [Notion数据库搭建指南.md](./Notion数据库搭建指南.md)

### 3. Workers API 部署（Cloudflare）

```bash
cd workers
npm install
npx wrangler login

# 创建 D1 数据库
npx wrangler d1 create psych-scale-db
# 将返回的 database_id 填入 wrangler.toml

# 执行建表
npx wrangler d1 execute psych-scale-db --file=schema.sql

# 编辑 wrangler.toml，填入 Notion API Key 和数据库 ID

# 部署
npx wrangler deploy
```

### 4. 配置前端 API 地址

部署 Workers 后，将返回的 URL 填入 `assets/js/config.js`：

```javascript
const CONFIG = {
    API_BASE: 'https://psych-scale-api.你的子域.workers.dev',
    ...
};
```

提交代码到 GitHub，GitHub Actions 会自动部署到 Pages。

## 项目结构

```
psych-scale-static/
├── index.html              # 首页
├── scale.html              # 答题页
├── report.html             # 报告页
├── 404.html                # 404页面
├── assets/
│   ├── css/style.css       # 全局样式
│   └── js/
│       ├── config.js       # 配置
│       ├── api.js          # API封装
│       ├── main.js         # 首页逻辑
│       ├── scale.js        # 答题逻辑
│       └── report.js       # 报告逻辑
├── workers/                # Cloudflare Workers API
│   ├── src/
│   │   ├── index.js        # 路由入口
│   │   ├── notion.js       # Notion API
│   │   ├── ai.js           # DeepSeek AI
│   │   ├── scoring.js      # 自定义计分
│   │   └── db.js           # D1 数据库
│   ├── schema.sql          # 建表SQL
│   ├── wrangler.toml       # Workers配置
│   └── package.json
├── .github/workflows/      # CI/CD
└── 架构设计文档.md          # 完整架构设计
```

## 技术栈

| 组件 | 技术 |
|------|------|
| 前端托管 | GitHub Pages |
| 前端框架 | Bootstrap 5 + 原生JS |
| API服务 | Cloudflare Workers |
| 内容管理 | Notion Database API |
| AI分析 | DeepSeek Chat API |
| 数据存储 | Cloudflare D1 (SQLite) |
| Markdown渲染 | marked.js |

## 两种量表类型

| 类型 | 说明 | AI调用 | 配置方式 |
|------|------|--------|---------|
| AI分析型 | 答题后AI生成报告 | 是 | 填写AI提示词 |
| 自定义结果型 | 按规则返回结果 | 否 | 填写结果规则JSON |

## API 端点

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | /api/scales | 量表列表 |
| GET | /api/scale/:id | 量表详情 |
| POST | /api/submit | 提交答题 |
| GET | /api/report/:id | 获取报告 |
| GET | /api/health | 健康检查 |
