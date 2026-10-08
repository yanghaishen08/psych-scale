/**
 * 心理量表测评平台 - 首页逻辑
 */
(function () {
    'use strict';

    // DOM 元素引用
    const scalesContainer = document.getElementById('scalesContainer');
    const loadingState = document.getElementById('loadingState');
    const errorState = document.getElementById('errorState');
    const emptyState = document.getElementById('emptyState');

    /**
     * 转义 HTML 特殊字符，防止 XSS
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
     * 渲染单个量表卡片
     * @param {object} scale - 量表数据
     * @returns {string} HTML 字符串
     */
    function renderScaleCard(scale) {
        const title = escapeHtml(scale.title);
        const description = escapeHtml(scale.description || '暂无描述');
        const category = escapeHtml(scale.category || '心理测评');
        const questionCount = scale.question_count || 0;
        const scaleType = scale.scale_type === 'ai_analysis' ? 'AI分析' : '即时评分';
        const scaleUrl = `${CONFIG.PAGES.SCALE}?id=${encodeURIComponent(scale.id)}&from=home`;

        return `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card scale-card h-100">
                    <div class="card-body p-4">
                        <div class="d-flex justify-content-between align-items-start mb-3">
                            <span class="badge-category">${category}</span>
                            <span class="badge-ai">
                                <i class="bi bi-stars me-1"></i>${scaleType}
                            </span>
                        </div>
                        <h5 class="card-title fw-bold mb-2">${title}</h5>
                        <p class="card-text text-muted small">${description}</p>
                        <div class="card-footer-custom">
                            <small class="text-muted">
                                <i class="bi bi-list-check me-1"></i>${questionCount} 题
                            </small>
                            <a href="${scaleUrl}" class="btn btn-primary btn-sm">
                                开始测评 <i class="bi bi-arrow-right ms-1"></i>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 显示加载状态
     */
    function showLoading() {
        loadingState.classList.remove('d-none');
        errorState.classList.add('d-none');
        emptyState.classList.add('d-none');
        scalesContainer.innerHTML = '';
    }

    /**
     * 显示错误状态
     * @param {string} message - 错误信息
     */
    function showError(message) {
        loadingState.classList.add('d-none');
        errorState.classList.remove('d-none');
        emptyState.classList.add('d-none');
        const errorMsg = document.getElementById('errorMessage');
        if (errorMsg) {
            errorMsg.textContent = message || '加载失败，请稍后重试';
        }
        scalesContainer.innerHTML = '';
    }

    /**
     * 显示空状态
     */
    function showEmpty() {
        loadingState.classList.add('d-none');
        errorState.classList.add('d-none');
        emptyState.classList.remove('d-none');
        scalesContainer.innerHTML = '';
    }

    /**
     * 显示量表列表
     * @param {Array} scales - 量表数组
     */
    function showScales(scales) {
        loadingState.classList.add('d-none');
        errorState.classList.add('d-none');
        emptyState.classList.add('d-none');

        if (!scales || scales.length === 0) {
            showEmpty();
            return;
        }

        scalesContainer.innerHTML = scales.map(renderScaleCard).join('');
    }

    /**
     * 加载量表列表
     */
    async function loadScales() {
        showLoading();

        try {
            const data = await API.getScales();

            if (data.success && data.scales) {
                showScales(data.scales);
            } else {
                showError(data.message || '获取量表列表失败');
            }
        } catch (error) {
            console.error('加载量表失败:', error);
            showError(error.message || '网络错误，请检查网络连接后重试');
        }
    }

    /**
     * 重试按钮事件
     */
    function bindRetryButton() {
        const retryBtn = document.getElementById('retryBtn');
        if (retryBtn) {
            retryBtn.addEventListener('click', loadScales);
        }
    }

    /**
     * 页面初始化
     */
    function init() {
        bindRetryButton();
        loadScales();
    }

    // DOM 加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
