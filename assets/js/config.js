/**
 * 心理量表测评平台 - 全局配置
 */
const CONFIG = {
    // API 基础地址（自定义域名，绑定到 Cloudflare Worker，国内可直连）
    API_BASE: 'https://www.moonsheep.cloud',

    // 页面路径
    PAGES: {
        INDEX: './index.html',
        SCALE: './scale.html',
        REPORT: './report.html'
    },

    // 请求超时时间（毫秒）
    REQUEST_TIMEOUT: 30000,

    // AI 分析请求超时时间（毫秒）- 提交答案可能较慢
    SUBMIT_TIMEOUT: 60000
};
