/**
 * 心理量表测评平台 - API 调用封装
 */
const API = {
    /**
     * 带超时的 fetch 请求
     * @param {string} url - 请求地址
     * @param {object} options - fetch 选项
     * @param {number} timeout - 超时时间（毫秒）
     * @returns {Promise<Response>}
     */
    async fetchWithTimeout(url, options = {}, timeout = CONFIG.REQUEST_TIMEOUT) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            return response;
        } finally {
            clearTimeout(timeoutId);
        }
    },

    /**
     * 统一请求方法
     * @param {string} path - API 路径
     * @param {object} options - fetch 选项
     * @param {number} timeout - 超时时间
     * @returns {Promise<object>} 解析后的 JSON 数据
     */
    async request(path, options = {}, timeout = CONFIG.REQUEST_TIMEOUT) {
        const url = CONFIG.API_BASE + path;

        try {
            const response = await this.fetchWithTimeout(url, options, timeout);

            if (!response.ok) {
                // 尝试读取服务器返回的具体错误信息
                let errorMsg = `请求失败 (${response.status})`;
                try {
                    const errorData = await response.json();
                    if (errorData.error) {
                        errorMsg = errorData.error;
                    } else if (errorData.message) {
                        errorMsg = errorData.message;
                    }
                } catch (e) {
                    // 响应体不是 JSON，使用默认错误信息
                }
                throw new Error(errorMsg);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('请求超时，请检查网络连接后重试');
            }
            throw error;
        }
    },

    /**
     * 获取量表列表
     * GET /api/scales
     * @returns {Promise<object>} { success, scales: [...] }
     */
    async getScales() {
        return this.request('/api/scales');
    },

    /**
     * 获取量表详情
     * GET /api/scale/:id
     * @param {string} id - 量表ID
     * @returns {Promise<object>} { success, scale: {...} }
     */
    async getScale(id) {
        return this.request(`/api/scale/${id}`);
    },

    /**
     * 提交答案
     * POST /api/submit
     * @param {string} scaleId - 量表ID
     * @param {object} answers - 答案对象 { question_id: answer_value }
     * @returns {Promise<object>} { success, response_id, scale_type, redirect }
     */
    async submitAnswers(scaleId, answers) {
        return this.request('/api/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                scale_id: scaleId,
                answers: answers
            })
        }, CONFIG.SUBMIT_TIMEOUT);
    },

    /**
     * 获取报告
     * GET /api/report/:id
     * @param {string} id - 报告ID
     * @returns {Promise<object>} { success, report: {...} }
     */
    async getReport(id) {
        return this.request(`/api/report/${id}`);
    }
};
