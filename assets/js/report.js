/**
 * 心理量表测评平台 - 报告页逻辑
 */
(function () {
    'use strict';

    // DOM 元素引用
    const reportContainer = document.getElementById('reportContainer');
    const loadingState = document.getElementById('loadingState');
    const errorState = document.getElementById('errorState');

    /**
     * 获取 URL 参数
     * @param {string} name - 参数名
     * @returns {string|null}
     */
    function getUrlParam(name) {
        const params = new URLSearchParams(window.location.search);
        return params.get(name);
    }

    /**
     * 转义 HTML 特殊字符
     * @param {string} text
     * @returns {string}
     */
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 格式化日期时间
     * @param {string} dateStr - ISO 日期字符串
     * @returns {object} { date: string, time: string }
     */
    function formatDateTime(dateStr) {
        if (!dateStr) return { date: '未知', time: '' };

        try {
            const date = new Date(dateStr);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');

            return {
                date: `${year}年${month}月${day}日`,
                time: `${hours}:${minutes}`
            };
        } catch (e) {
            return { date: '未知', time: '' };
        }
    }

    /**
     * 渲染报告头部卡片
     * @param {object} report - 报告数据
     * @returns {string} HTML 字符串
     */
    function renderReportHeader(report) {
        const { date, time } = formatDateTime(report.created_at);
        const isAI = report.scale_type === 'ai_analysis';

        return `
            <!-- 报告头部 -->
            <div class="report-header-card">
                <div class="report-header-icon">
                    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                        <circle cx="32" cy="32" r="30" fill="url(#grad1)" opacity="0.15"/>
                        <circle cx="32" cy="32" r="24" fill="url(#grad1)" opacity="0.25"/>
                        <path d="M28 22L20 30L28 38" stroke="url(#grad1)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M36 22L44 30L36 38" stroke="url(#grad1)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M18 30H46" stroke="url(#grad1)" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
                        <defs>
                            <linearGradient id="grad1" x1="0" y1="0" x2="64" y2="64">
                                <stop offset="0%" stop-color="#4a90a4"/>
                                <stop offset="100%" stop-color="#6b8e9f"/>
                            </linearGradient>
                        </defs>
                    </svg>
                </div>
                <h2 class="report-title">${escapeHtml(report.scale_title || '心理分析报告')}</h2>
                <div class="report-meta">
                    <span><i class="bi bi-calendar-check me-1"></i>${date}</span>
                    ${time ? `<span class="mx-2">·</span><span><i class="bi bi-clock me-1"></i>${time}</span>` : ''}
                </div>
            </div>
        `;
    }

    /**
     * 渲染报告主体
     * @param {object} report - 报告数据
     * @returns {string} HTML 字符串
     */
    function renderReportMain(report) {
        const isAI = report.scale_type === 'ai_analysis';

        // AI 标签
        const aiBadge = isAI ? `
            <div class="report-ai-badge">
                <div class="ai-badge-inner">
                    <i class="bi bi-robot me-2"></i>
                    <span>AI 深度分析报告</span>
                    <span class="badge-ai-source">AI</span>
                </div>
            </div>
        ` : '';

        // 分割线
        const divider = `
            <div class="report-divider">
                <div class="divider-dot"></div>
                <div class="divider-line"></div>
                <div class="divider-dot"></div>
            </div>
        `;

        // 渲染 Markdown 内容
        let contentHtml = '';
        if (report.report_content) {
            contentHtml = marked.parse(report.report_content);
        } else {
            contentHtml = '<p class="text-muted">暂无报告内容</p>';
        }

        return `
            <!-- AI 报告容器 -->
            <div class="report-main-card">
                ${aiBadge}
                ${divider}
                <div class="report-content markdown-body">
                    ${contentHtml}
                </div>
            </div>
        `;
    }

    /**
     * 渲染操作按钮
     * @returns {string} HTML 字符串
     */
    function renderActions() {
        return `
            <!-- 操作按钮 -->
            <div class="report-actions">
                <button class="btn-action btn-action-print" onclick="window.print()">
                    <i class="bi bi-printer-fill me-2"></i>打印报告
                </button>
                <a href="${CONFIG.PAGES.INDEX}" class="btn-action btn-action-home">
                    <i class="bi bi-house-fill me-2"></i>返回首页
                </a>
            </div>
        `;
    }

    /**
     * 渲染完整报告
     * @param {object} report - 报告数据
     */
    function renderReport(report) {
        // 设置页面标题
        document.title = `${report.scale_title || '分析报告'} - 心理量表测评平台`;

        // 组装完整报告 HTML
        const reportHtml = renderReportHeader(report) + renderReportMain(report) + renderActions();

        reportContainer.innerHTML = reportHtml;

        // 显示内容
        loadingState.classList.add('d-none');
        errorState.classList.add('d-none');
        reportContainer.classList.remove('d-none');
    }

    /**
     * 显示错误状态
     * @param {string} message - 错误信息
     */
    function showError(message) {
        loadingState.classList.add('d-none');
        errorState.classList.remove('d-none');
        const errorMsg = document.getElementById('errorMessage');
        if (errorMsg) {
            errorMsg.textContent = message || '加载失败，请稍后重试';
        }
    }

    /**
     * 加载报告数据
     * @param {string} reportId - 报告ID
     */
    async function loadReport(reportId) {
        loadingState.classList.remove('d-none');
        errorState.classList.add('d-none');
        reportContainer.classList.add('d-none');

        try {
            const data = await API.getReport(reportId);

            if (data.success && data.report) {
                renderReport(data.report);
            } else {
                showError(data.message || '获取报告失败');
            }
        } catch (error) {
            console.error('加载报告失败:', error);
            showError(error.message || '网络错误，请检查网络连接后重试');
        }
    }

    /**
     * 页面初始化
     */
    function init() {
        const reportId = getUrlParam('id');

        if (!reportId) {
            showError('缺少报告ID参数');
            return;
        }

        // 配置 marked.js
        if (typeof marked !== 'undefined') {
            marked.setOptions({
                breaks: true,
                gfm: true
            });
        }

        // 绑定重试按钮
        const retryBtn = document.getElementById('retryBtn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => loadReport(reportId));
        }

        loadReport(reportId);
    }

    // DOM 加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
