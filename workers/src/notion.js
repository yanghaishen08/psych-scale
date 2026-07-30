/**
 * Notion API 封装模块
 *
 * 负责：
 * - 查询 Notion 数据库（Scales / Sections / Questions / Options）
 * - 解析 Notion 复杂属性结构（title, rich_text, select, checkbox, number, relation, files 等）
 * - 提供 Cache API 缓存层，减少 Notion API 调用频率
 *
 * Notion API 文档: https://developers.notion.com/reference/intro
 */

// ============================================================
// 常量定义
// ============================================================

const NOTION_BASE_URL = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

// 缓存过期时间（秒）
const CACHE_TTL = 300; // 5 分钟

/**
 * Notion 数据库属性名常量（与 Notion 数据库中的中文属性名一一对应）
 */
const PROP = {
  // Scales 数据库属性
  SCALE_TITLE: '标题',
  SCALE_DESC: '描述',
  SCALE_CATEGORY: '分类',
  SCALE_PUBLISHED: '是否发布',
  SCALE_TYPE: '量表类型',
  SCALE_AI_PROMPT: 'AI提示词',
  SCALE_CUSTOM_RESULT: '自定义结果',
  SCALE_RESULT_RULES: '结果规则',
  SCALE_COVER: '封面图',
  SCALE_SORT: '排序权重',

  // Sections 数据库属性
  SECTION_TITLE: '标题',
  SECTION_CONTENT: '内容',
  SECTION_IMAGE: '图片',
  SECTION_SORT: '排序',
  SECTION_SCALE: '所属量表',

  // Questions 数据库属性
  QUESTION_TEXT: '题目内容',
  QUESTION_TYPE: '题目类型',
  QUESTION_SORT: '排序',
  QUESTION_REQUIRED: '是否必答',
  QUESTION_SCALE: '所属量表',

  // Options 数据库属性
  OPTION_TEXT: '选项内容',
  OPTION_VALUE: '选项值',
  OPTION_SORT: '排序',
  OPTION_SCORE: '分值',
  OPTION_QUESTION: '所属题目',
};

// ============================================================
// 缓存工具（使用 Cloudflare Cache API）
// ============================================================

/**
 * 从缓存中读取数据
 * @param {string} key - 缓存键
 * @returns {Promise<Object|null>}
 */
async function getCache(key) {
  try {
    const cache = caches.default;
    const cached = await cache.match(new Request(`https://notion-cache.local/${key}`));
    if (cached) {
      return await cached.json();
    }
  } catch (e) {
    // 缓存读取失败不影响主流程
  }
  return null;
}

/**
 * 写入缓存
 * @param {string} key - 缓存键
 * @param {Object} data - 缓存数据
 * @param {number} ttl - 过期时间（秒）
 */
async function setCache(key, data, ttl = CACHE_TTL) {
  try {
    const cache = caches.default;
    const response = new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `max-age=${ttl}`,
      },
    });
    await cache.put(new Request(`https://notion-cache.local/${key}`), response.clone());
  } catch (e) {
    // 缓存写入失败不影响主流程
  }
}

// ============================================================
// 请求工具
// ============================================================

/**
 * 构建 Notion API 请求头
 * @param {Object} env - Workers 环境变量
 * @returns {Object}
 */
function notionHeaders(env) {
  return {
    Authorization: `Bearer ${env.NOTION_API_KEY}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json',
  };
}

// ============================================================
// 属性解析器（处理 Notion 复杂属性结构）
// ============================================================

/**
 * 解析 title 属性
 * @param {Object} prop - Notion 属性对象
 * @returns {string}
 */
function parseTitle(prop) {
  if (!prop || !prop.title || !Array.isArray(prop.title)) return '';
  return prop.title.map((t) => t.plain_text).join('');
}

/**
 * 解析 rich_text 属性
 * @param {Object} prop - Notion 属性对象
 * @returns {string}
 */
function parseRichText(prop) {
  if (!prop || !prop.rich_text || !Array.isArray(prop.rich_text)) return '';
  return prop.rich_text.map((t) => t.plain_text).join('');
}

/**
 * 解析 select 属性
 * @param {Object} prop - Notion 属性对象
 * @returns {string|null}
 */
function parseSelect(prop) {
  if (!prop || !prop.select) return null;
  return prop.select.name;
}

/**
 * 解析 checkbox 属性
 * @param {Object} prop - Notion 属性对象
 * @returns {boolean}
 */
function parseCheckbox(prop) {
  if (!prop) return false;
  return !!prop.checkbox;
}

/**
 * 解析 number 属性
 * @param {Object} prop - Notion 属性对象
 * @returns {number|null}
 */
function parseNumber(prop) {
  if (!prop) return null;
  return prop.number;
}

/**
 * 解析 relation 属性
 * @param {Object} prop - Notion 属性对象
 * @returns {string[]} 关联页面 ID 数组
 */
function parseRelation(prop) {
  if (!prop || !prop.relation || !Array.isArray(prop.relation)) return [];
  return prop.relation.map((r) => r.id);
}

/**
 * 解析 files 属性
 * @param {Object} prop - Notion 属性对象
 * @returns {string[]} 文件 URL 数组
 */
function parseFiles(prop) {
  if (!prop || !prop.files || !Array.isArray(prop.files)) return [];
  return prop.files
    .map((f) => {
      if (f.type === 'file' && f.file) return f.file.url;
      if (f.type === 'external' && f.external) return f.external.url;
      return null;
    })
    .filter(Boolean);
}

/**
 * 通用属性值获取器 — 根据属性 type 自动选择解析方式
 * @param {Object} properties - 页面 properties 对象
 * @param {string} name - 属性名
 * @returns {*} 解析后的值
 */
function getPropertyValue(properties, name) {
  const prop = properties[name];
  if (!prop) return null;

  switch (prop.type) {
    case 'title':
      return parseTitle(prop);
    case 'rich_text':
      return parseRichText(prop);
    case 'select':
      return parseSelect(prop);
    case 'checkbox':
      return parseCheckbox(prop);
    case 'number':
      return parseNumber(prop);
    case 'relation':
      return parseRelation(prop);
    case 'files':
      return parseFiles(prop);
    case 'multi_select':
      return prop.multi_select ? prop.multi_select.map((s) => s.name) : [];
    case 'url':
      return prop.url;
    case 'email':
      return prop.email;
    case 'phone_number':
      return prop.phone_number;
    case 'date':
      return prop.date ? prop.date.start : null;
    case 'people':
      return prop.people ? prop.people.map((p) => p.id) : [];
    case 'created_time':
      return prop.created_time;
    case 'last_edited_time':
      return prop.last_edited_time;
    default:
      return null;
  }
}

// ============================================================
// 通用 Notion API 调用
// ============================================================

/**
 * 通用 Notion 数据库查询（自动处理分页）
 * @param {Object} env - Workers 环境变量
 * @param {string} databaseId - Notion 数据库 ID
 * @param {Object|null} filter - Notion 过滤器对象
 * @param {Array|null} sorts - Notion 排序规则数组
 * @returns {Promise<Array>} 查询结果页面数组
 */
async function queryDatabase(env, databaseId, filter = null, sorts = null) {
  const url = `${NOTION_BASE_URL}/databases/${databaseId}/query`;
  const allResults = [];
  let hasMore = true;
  let startCursor = undefined;

  while (hasMore) {
    const body = {};
    if (filter) body.filter = filter;
    if (sorts) body.sorts = sorts;
    if (startCursor) body.start_cursor = startCursor;

    const resp = await fetch(url, {
      method: 'POST',
      headers: notionHeaders(env),
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      let errMsg = errText;
      try {
        const errJson = JSON.parse(errText);
        errMsg = errJson.message || errJson;
      } catch (e) {
        // 保持原始文本
      }
      throw new Error(`Notion 数据库查询失败 (${resp.status}): ${errMsg}`);
    }

    const data = await resp.json();
    allResults.push(...data.results);
    hasMore = data.has_more;
    startCursor = data.next_cursor;
  }

  return allResults;
}

/**
 * 获取 Notion 页面详情
 * @param {Object} env - Workers 环境变量
 * @param {string} pageId - 页面 ID
 * @returns {Promise<Object|null>} 页面对象，不存在返回 null
 */
async function getPage(env, pageId) {
  const url = `${NOTION_BASE_URL}/pages/${pageId}`;
  const resp = await fetch(url, {
    method: 'GET',
    headers: notionHeaders(env),
  });

  if (!resp.ok) {
    if (resp.status === 404) return null;
    const errText = await resp.text();
    throw new Error(`Notion 获取页面失败 (${resp.status}): ${errText}`);
  }

  return resp.json();
}

/**
 * 获取页面单个属性详情（用于获取超长 rich_text 属性的分页数据）
 * @param {Object} env - Workers 环境变量
 * @param {string} pageId - 页面 ID
 * @param {string} propertyId - 属性 ID
 * @returns {Promise<Object>} 属性详情
 */
async function getPageProperty(env, pageId, propertyId) {
  const url = `${NOTION_BASE_URL}/pages/${pageId}/properties/${propertyId}`;
  const resp = await fetch(url, {
    method: 'GET',
    headers: notionHeaders(env),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Notion 获取属性失败 (${resp.status}): ${errText}`);
  }

  return resp.json();
}

// ============================================================
// 业务数据解析器
// ============================================================

/**
 * 解析量表页面 → 量表对象
 * @param {Object} page - Notion 页面对象
 * @returns {Object} 量表对象
 */
function parseScale(page) {
  const props = page.properties || {};
  const coverFiles = getPropertyValue(props, PROP.SCALE_COVER);
  return {
    id: page.id,
    title: getPropertyValue(props, PROP.SCALE_TITLE) || '',
    description: getPropertyValue(props, PROP.SCALE_DESC) || '',
    category: getPropertyValue(props, PROP.SCALE_CATEGORY) || '未分类',
    is_published: getPropertyValue(props, PROP.SCALE_PUBLISHED) || false,
    scale_type: getPropertyValue(props, PROP.SCALE_TYPE) || 'ai_analysis',
    ai_prompt: getPropertyValue(props, PROP.SCALE_AI_PROMPT) || '',
    custom_result: getPropertyValue(props, PROP.SCALE_CUSTOM_RESULT) || '',
    result_rules: getPropertyValue(props, PROP.SCALE_RESULT_RULES) || '',
    cover_url: Array.isArray(coverFiles) && coverFiles.length > 0 ? coverFiles[0] : null,
    sort_weight: getPropertyValue(props, PROP.SCALE_SORT) ?? 0,
    created_time: page.created_time,
    last_edited_time: page.last_edited_time,
  };
}

/**
 * 解析引导内容页面 → Section 对象
 * @param {Object} page - Notion 页面对象
 * @returns {Object} Section 对象
 */
function parseSection(page) {
  const props = page.properties || {};
  const imageFiles = getPropertyValue(props, PROP.SECTION_IMAGE);
  return {
    id: page.id,
    type: 'section',
    title: getPropertyValue(props, PROP.SECTION_TITLE) || '',
    content: getPropertyValue(props, PROP.SECTION_CONTENT) || '',
    image_url: Array.isArray(imageFiles) && imageFiles.length > 0 ? imageFiles[0] : null,
    sort_order: getPropertyValue(props, PROP.SECTION_SORT) ?? 0,
  };
}

/**
 * 解析题目页面 → Question 对象
 * @param {Object} page - Notion 页面对象
 * @returns {Object} Question 对象
 */
function parseQuestion(page) {
  const props = page.properties || {};
  return {
    id: page.id,
    type: 'question',
    text: getPropertyValue(props, PROP.QUESTION_TEXT) || '',
    question_type: getPropertyValue(props, PROP.QUESTION_TYPE) || 'single_choice',
    sort_order: getPropertyValue(props, PROP.QUESTION_SORT) ?? 0,
    is_required: getPropertyValue(props, PROP.QUESTION_REQUIRED) ?? true,
    options: [],
  };
}

/**
 * 解析选项页面 → Option 对象
 * @param {Object} page - Notion 页面对象
 * @returns {Object} Option 对象
 */
function parseOption(page) {
  const props = page.properties || {};
  return {
    id: page.id,
    text: getPropertyValue(props, PROP.OPTION_TEXT) || '',
    value: getPropertyValue(props, PROP.OPTION_VALUE) || '',
    sort_order: getPropertyValue(props, PROP.OPTION_SORT) ?? 0,
    score: getPropertyValue(props, PROP.OPTION_SCORE) ?? 0,
  };
}

/**
 * 解析选项页面（含关联题目 ID），用于将选项归组到对应题目
 * @param {Object} page - Notion 页面对象
 * @returns {Object} 含 question_ids 的 Option 对象
 */
function parseOptionWithRelation(page) {
  const props = page.properties || {};
  const option = parseOption(page);
  option.question_ids = getPropertyValue(props, PROP.OPTION_QUESTION) || [];
  return option;
}

// ============================================================
// 业务查询函数
// ============================================================

/**
 * 获取已发布的量表列表
 * 查询 Scales 数据库中 is_published = true 的记录
 * @param {Object} env - Workers 环境变量
 * @returns {Promise<Array>} 量表列表（含 question_count）
 */
async function getPublishedScales(env) {
  const cacheKey = `scales:published`;
  const cached = await getCache(cacheKey);
  if (cached) {
    return cached;
  }

  const filter = {
    property: PROP.SCALE_PUBLISHED,
    checkbox: { equals: true },
  };
  const sorts = [{ property: PROP.SCALE_SORT, direction: 'ascending' }];

  const pages = await queryDatabase(env, env.NOTION_SCALES_DB_ID, filter, sorts);
  const scales = pages.map(parseScale);

  // 批量查询每个量表的题目数量
  const scalesWithCounts = await Promise.all(
    scales.map(async (scale) => {
      try {
        const questionFilter = {
          property: PROP.QUESTION_SCALE,
          relation: { contains: scale.id },
        };
        const questions = await queryDatabase(env, env.NOTION_QUESTIONS_DB_ID, questionFilter);
        return {
          id: scale.id,
          title: scale.title,
          description: scale.description,
          category: scale.category,
          scale_type: scale.scale_type,
          cover_url: scale.cover_url,
          sort_weight: scale.sort_weight,
          question_count: questions.length,
        };
      } catch (e) {
        return {
          id: scale.id,
          title: scale.title,
          description: scale.description,
          category: scale.category,
          scale_type: scale.scale_type,
          cover_url: scale.cover_url,
          sort_weight: scale.sort_weight,
          question_count: 0,
        };
      }
    })
  );

  await setCache(cacheKey, scalesWithCounts);
  return scalesWithCounts;
}

/**
 * 获取量表详情（基本信息）
 * @param {Object} env - Workers 环境变量
 * @param {string} pageId - 量表页面 ID
 * @returns {Promise<Object|null>} 量表对象，不存在返回 null
 */
async function getScaleById(env, pageId) {
  const cacheKey = `scale:${pageId}`;
  const cached = await getCache(cacheKey);
  if (cached) {
    return cached;
  }

  const page = await getPage(env, pageId);
  if (!page) return null;

  const scale = parseScale(page);
  await setCache(cacheKey, scale);
  return scale;
}

/**
 * 获取量表的完整内容（Sections + Questions + Options）
 * 合并 Sections 和 Questions，按 sort_order 排序，返回 content_items 数组
 *
 * @param {Object} env - Workers 环境变量
 * @param {string} scaleId - 量表页面 ID
 * @returns {Promise<Array>} 内容项数组
 */
async function getScaleContent(env, scaleId) {
  const cacheKey = `scale_content:${scaleId}`;
  const cached = await getCache(cacheKey);
  if (cached) {
    return cached;
  }

  // 1. 查询 Sections（引导内容）
  const sectionFilter = {
    property: PROP.SECTION_SCALE,
    relation: { contains: scaleId },
  };
  const sectionSorts = [{ property: PROP.SECTION_SORT, direction: 'ascending' }];
  const sectionPages = await queryDatabase(env, env.NOTION_SECTIONS_DB_ID, sectionFilter, sectionSorts);
  const sections = sectionPages.map(parseSection);

  // 2. 查询 Questions（题目）
  const questionFilter = {
    property: PROP.QUESTION_SCALE,
    relation: { contains: scaleId },
  };
  const questionSorts = [{ property: PROP.QUESTION_SORT, direction: 'ascending' }];
  const questionPages = await queryDatabase(env, env.NOTION_QUESTIONS_DB_ID, questionFilter, questionSorts);
  const questions = questionPages.map(parseQuestion);

  // 3. 批量查询所有题目的 Options（使用 OR 过滤器，避免 N+1 查询）
  if (questions.length > 0) {
    const questionIds = questions.map((q) => q.id);
    let optionPages = [];

    if (questionIds.length === 1) {
      // 单个题目：直接使用 relation.contains 过滤
      const optionFilter = {
        property: PROP.OPTION_QUESTION,
        relation: { contains: questionIds[0] },
      };
      const optionSorts = [{ property: PROP.OPTION_SORT, direction: 'ascending' }];
      optionPages = await queryDatabase(env, env.NOTION_OPTIONS_DB_ID, optionFilter, optionSorts);
    } else {
      // 多个题目：构建 OR 过滤器，一次性查询所有选项
      const orConditions = questionIds.map((qid) => ({
        property: PROP.OPTION_QUESTION,
        relation: { contains: qid },
      }));
      const optionFilter = { or: orConditions };
      const optionSorts = [{ property: PROP.OPTION_SORT, direction: 'ascending' }];
      optionPages = await queryDatabase(env, env.NOTION_OPTIONS_DB_ID, optionFilter, optionSorts);
    }

    // 解析选项并按所属题目分组
    const optionMap = new Map(); // questionId -> options[]
    for (const page of optionPages) {
      const option = parseOptionWithRelation(page);
      for (const qId of option.question_ids) {
        if (!optionMap.has(qId)) {
          optionMap.set(qId, []);
        }
        optionMap.get(qId).push({
          id: option.id,
          text: option.text,
          value: option.value,
          sort_order: option.sort_order,
          score: option.score,
        });
      }
    }

    // 将选项分配到对应题目，并按 sort_order 排序
    for (const question of questions) {
      const opts = optionMap.get(question.id) || [];
      opts.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      question.options = opts;
    }
  }

  // 4. 合并 Sections 和 Questions，按 sort_order 统一排序
  const contentItems = [...sections, ...questions];
  contentItems.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  await setCache(cacheKey, contentItems);
  return contentItems;
}

// ============================================================
// 模块导出
// ============================================================

export {
  // 常量
  NOTION_BASE_URL,
  NOTION_VERSION,
  PROP,
  // 通用 API
  queryDatabase,
  getPage,
  getPageProperty,
  notionHeaders,
  // 属性解析器
  parseTitle,
  parseRichText,
  parseSelect,
  parseCheckbox,
  parseNumber,
  parseRelation,
  parseFiles,
  getPropertyValue,
  // 业务解析器
  parseScale,
  parseSection,
  parseQuestion,
  parseOption,
  // 业务查询
  getPublishedScales,
  getScaleById,
  getScaleContent,
  // 缓存工具
  getCache,
  setCache,
};
