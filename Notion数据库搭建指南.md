# Notion 数据库搭建指南

> 本文档详细说明如何在 Notion 中创建和管理心理量表平台所需的所有数据库。

---

## 一、创建 Notion Integration

1. 访问 https://www.notion.so/my-integrations
2. 点击「新建集成」
3. 填写名称：`心理量表平台`
4. 选择关联的工作区
5. 创建后获取 **Internal Integration Secret**（以 `ntn_` 开头）
6. 将此 Token 保存好，稍后填入 `wrangler.toml`

---

## 二、创建数据库

在一个 Notion 页面中创建 **4 个数据库**，分别命名为：
- Scales（量表主表）
- Sections（引导内容）
- Questions（题目）
- Options（选项）

### 2.1 Scales 数据库

创建一个 Full-page database，命名为 `Scales`。

#### 添加字段

| 字段名 | 字段类型 | 说明 | 配置详情 |
|--------|---------|------|---------|
| 标题 | Title | 量表名称 | 默认字段，无需创建 |
| 描述 | Rich Text | 量表简介 | — |
| 分类 | Select | 量表分类 | 添加选项：性格测评、情绪测评、职业发展、人际关系、其他 |
| 是否发布 | Checkbox | 是否在前台显示 | 默认不勾选 |
| 量表类型 | Select | AI分析 / 自定义结果 | 添加选项：`ai_analysis`、`custom_result` |
| AI提示词 | Rich Text | AI分析专属提示词 | 仅 `ai_analysis` 类型需要填写 |
| 自定义结果 | Rich Text | 预设结果模板 | 仅 `custom_result` 类型需要填写 |
| 结果规则 | Rich Text | 计分规则（JSON格式） | 仅 `custom_result` 类型需要填写 |
| 排序权重 | Number | 显示排序 | 数字越小越靠前 |

#### 示例数据

**量表1（AI分析型）：**
- 标题：`MBTI性格测试`
- 描述：`通过28道题目，了解你的MBTI性格类型`
- 分类：`性格测评`
- 是否发布：✓
- 量表类型：`ai_analysis`
- AI提示词：`你是一位专业的MBTI性格分析专家，请根据用户的答题结果，分析其MBTI性格类型，并给出详细的性格特征说明和发展建议。`

**量表2（自定义结果型）：**
- 标题：`情绪状态快速筛查`
- 描述：`5道快速筛查题，了解你当前的情绪状态`
- 分类：`情绪测评`
- 是否发布：✓
- 量表类型：`custom_result`
- 结果规则：
```json
{
  "scoring": "sum",
  "ranges": [
    { "min": 0, "max": 5, "result": "你的情绪状态良好，继续保持积极的心态。" },
    { "min": 6, "max": 10, "result": "你可能存在轻度的情绪困扰，建议关注心理健康。" },
    { "min": 11, "max": 15, "result": "你可能存在中度情绪问题，建议寻求专业心理咨询。" }
  ]
}
```

---

### 2.2 Sections 数据库

创建一个 Full-page database，命名为 `Sections`。

#### 添加字段

| 字段名 | 字段类型 | 说明 |
|--------|---------|------|
| 标题 | Title | 区块标题 |
| 内容 | Rich Text | 纯文本内容 |
| 图片 | Files & Media | 引导图片（可选） |
| 排序 | Number | 显示顺序 |
| 所属量表 | Relation → Scales | 关联到量表 |

#### 配置关联

1. 创建 `所属量表` 字段，类型选择 `Relation`
2. 关联到 `Scales` 数据库
3. 关系类型选择 `一个量表对应多个区块`

#### 示例数据

- 标题：`测评说明`
- 内容：`请根据您的真实感受作答，没有对错之分。本次测评共28道题，预计需要5-10分钟。`
- 排序：`0`
- 所属量表：选择 `MBTI性格测试`

---

### 2.3 Questions 数据库

创建一个 Full-page database，命名为 `Questions`。

#### 添加字段

| 字段名 | 字段类型 | 说明 | 配置详情 |
|--------|---------|------|---------|
| 题目内容 | Title | 题目文本 | 默认字段 |
| 题目类型 | Select | 题型 | 添加选项：`single_choice`、`multiple_choice`、`text` |
| 排序 | Number | 显示顺序 | — |
| 是否必答 | Checkbox | 是否必填 | 默认勾选 |
| 所属量表 | Relation → Scales | 关联到量表 | — |

#### 示例数据

- 题目内容：`在社交场合中，我倾向于主动与人交流`
- 题目类型：`single_choice`
- 排序：`1`
- 是否必答：✓
- 所属量表：选择 `MBTI性格测试`

---

### 2.4 Options 数据库

创建一个 Full-page database，命名为 `Options`。

#### 添加字段

| 字段名 | 字段类型 | 说明 |
|--------|---------|------|
| 选项内容 | Title | 选项文本 |
| 选项值 | Rich Text | 选项对应的值（如 A/B/C/D） |
| 排序 | Number | 显示顺序 |
| 分值 | Number | 选项分值（自定义结果型量表用） |
| 所属题目 | Relation → Questions | 关联到题目 |

#### 配置关联

1. 创建 `所属题目` 字段，类型选择 `Relation`
2. 关联到 `Questions` 数据库
3. 关系类型选择 `一道题对应多个选项`

#### 示例数据

为上面的题目添加 5 个选项：

| 选项内容 | 选项值 | 排序 | 分值 |
|---------|--------|------|------|
| 完全符合我 | A | 1 | 5 |
| 比较符合我 | B | 2 | 4 |
| 一般 | C | 3 | 3 |
| 比较不符合我 | D | 4 | 2 |
| 完全不符合我 | E | 5 | 1 |

每个选项的 `所属题目` 都关联到上一步创建的题目。

---

## 三、将数据库分享给 Integration

创建完所有数据库后，需要将它们分享给你的 Integration：

1. 打开每个数据库（Scales、Sections、Questions、Options）
2. 点击右上角 `···` 菜单
3. 选择 `Connections` → `连接`
4. 搜索并选择你创建的 `心理量表平台` Integration
5. 确认连接

> **重要**：4 个数据库都必须连接到 Integration，否则 API 无法访问。

---

## 四、获取数据库 ID

每个数据库的 ID 可以从 URL 中获取：

```
https://www.notion.so/你的工作区/Scales-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
                                    ↑ 这一段就是数据库ID
```

数据库 ID 是 32 位字符的字符串（包含连字符格式为 8-4-4-4-12）。

记录下 4 个数据库的 ID：
- Scales 数据库 ID：`_________________`
- Sections 数据库 ID：`_________________`
- Questions 数据库 ID：`_________________`
- Options 数据库 ID：`_________________`

---

## 五、配置 Workers 环境变量

将获取的信息填入 `workers/wrangler.toml`：

```toml
[vars]
NOTION_API_KEY = "ntn_xxxxxxxxxxxxxxxxxxxxxxxxxx"
NOTION_SCALES_DB_ID = " scales数据库ID"
NOTION_SECTIONS_DB_ID = "sections数据库ID"
NOTION_QUESTIONS_DB_ID = "questions数据库ID"
NOTION_OPTIONS_DB_ID = "options数据库ID"
DEEPSEEK_API_KEY = "在此填入你的DeepSeek API Key"
DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"
DEEPSEEK_MODEL = "deepseek-chat"
CORS_ORIGIN = "*"
```

> **安全建议**：生产环境中，API Key 应该使用 Cloudflare Secrets 而非明文配置：
> ```bash
> wrangler secret put NOTION_API_KEY
> wrangler secret put DEEPSEEK_API_KEY
> ```

---

## 六、两种量表类型的配置示例

### 6.1 AI分析型量表（ai_analysis）

**适用场景**：深度心理分析、性格测评、需要AI解读的量表

**Notion 配置**：
- 量表类型：`ai_analysis`
- AI提示词：填写专业的提示词
- 自定义结果：留空
- 结果规则：留空

**流程**：用户答题 → Workers 调用 DeepSeek → 返回 AI 生成的 Markdown 报告

**AI 提示词示例**：
```
你是一位专业的心理健康评估专家。请根据用户的答题结果，生成一份详细的分析报告。

报告要求：
1. 总体评估：概述用户的心理状态
2. 各维度分析：逐项分析关键指标
3. 优势与风险：指出用户的优势和需要关注的风险
4. 建议：提供具体可行的改善建议

请使用 Markdown 格式输出，使用 ## 作为一级标题。
```

### 6.2 自定义结果型量表（custom_result）

**适用场景**：快速筛查、趣味测试、有固定结果的量表

**Notion 配置**：
- 量表类型：`custom_result`
- AI提示词：留空
- 结果规则：填写 JSON 格式的计分规则

**结果规则 JSON 格式**：

```json
{
  "scoring": "sum",
  "ranges": [
    {
      "min": 0,
      "max": 5,
      "result": "## 结果：情绪状态良好\n\n你的得分较低，说明当前情绪状态良好。继续保持积极的生活方式！"
    },
    {
      "min": 6,
      "max": 10,
      "result": "## 结果：轻度情绪困扰\n\n你可能存在一些情绪波动。建议通过运动、冥想等方式调节。"
    },
    {
      "min": 11,
      "max": 15,
      "result": "## 结果：中度情绪问题\n\n建议寻求专业心理咨询师的帮助。"
    }
  ]
}
```

**流程**：用户答题 → Workers 计算选项分值总和 → 匹配范围返回结果

**选项分值配置**：在 Options 数据库中为每个选项设置 `分值` 字段。

---

## 七、常见问题

### Q: Notion API 有频率限制吗？
A: 有。每个 Integration 每秒最多 3 次请求。Workers 中已加入 Cache API 缓存（5分钟TTL），可大幅减少 API 调用次数。

### Q: 如何修改量表内容？
A: 直接在 Notion 中编辑即可。修改后最多等待 5 分钟缓存过期，前台就会显示最新内容。如需立即生效，可以重新部署 Workers 或等待缓存自动过期。

### Q: 量表可以不发布吗？
A: 可以。在 Scales 数据库中取消勾选 `是否发布` 字段，该量表就不会在前台显示。

### Q: 如何调整题目顺序？
A: 修改 Questions 数据库中的 `排序` 字段。数字越小越靠前。Sections 和 Questions 共享同一个排序空间。

### Q: 一道题可以关联到多个量表吗？
A: 可以。Notion 的 Relation 字段支持多选。但建议每道题只属于一个量表，避免混淆。
