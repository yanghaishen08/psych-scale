/**
 * 心理量表测评平台 - 答题页逻辑
 */
(function () {
    'use strict';

    let currentScale = null;
    let questionCounter = 0;

    // DOM 元素引用
    const scaleContent = document.getElementById('scaleContent');
    const loadingState = document.getElementById('loadingState');
    const errorState = document.getElementById('errorState');
    const scaleForm = document.getElementById('scaleForm');

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
     * 渲染引导内容区块
     * @param {object} section - 区块数据
     * @returns {string} HTML 字符串
     */
    function renderSection(section) {
        const title = section.title ? `<h5 class="fw-bold mb-3">${escapeHtml(section.title)}</h5>` : '';
        const content = section.content
            ? `<div class="section-content">${marked.parse(section.content)}</div>`
            : '';
        const image = section.image_url
            ? `<img src="${escapeHtml(section.image_url)}" class="img-fluid rounded mt-3" alt="引导图片">`
            : '';

        return `
            <div class="section-card mb-4">
                ${title}
                ${content}
                ${image}
            </div>
        `;
    }

    /**
     * 渲染单选题选项
     * @param {string} questionId - 题目ID
     * @param {Array} options - 选项数组
     * @returns {string} HTML 字符串
     */
    function renderSingleChoiceOptions(questionId, options) {
        if (!options || options.length === 0) return '<p class="text-muted">暂无选项</p>';

        return options.map((option, index) => {
            const optionId = `opt_${questionId}_${index}`;
            return `
                <div class="option-item" data-option-id="${escapeHtml(option.id || '')}">
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="q_${questionId}"
                               id="${optionId}" value="${escapeHtml(option.id)}">
                        <label class="form-check-label w-100" for="${optionId}">
                            ${escapeHtml(option.text)}
                        </label>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * 渲染多选题选项
     * @param {string} questionId - 题目ID
     * @param {Array} options - 选项数组
     * @returns {string} HTML 字符串
     */
    function renderMultipleChoiceOptions(questionId, options) {
        if (!options || options.length === 0) return '<p class="text-muted">暂无选项</p>';

        return options.map((option, index) => {
            const optionId = `opt_${questionId}_${index}`;
            return `
                <div class="option-item" data-option-id="${escapeHtml(option.id || '')}">
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" name="q_${questionId}"
                               id="${optionId}" value="${escapeHtml(option.id)}">
                        <label class="form-check-label w-100" for="${optionId}">
                            ${escapeHtml(option.text)}
                        </label>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * 渲染文本输入题
     * @param {string} questionId - 题目ID
     * @returns {string} HTML 字符串
     */
    function renderTextQuestion(questionId) {
        return `
            <textarea class="form-control" name="q_${questionId}" rows="4"
                      placeholder="请输入您的回答..." data-question-id="${questionId}"></textarea>
        `;
    }

    /**
     * 渲染单个题目
     * @param {object} question - 题目数据
     * @returns {string} HTML 字符串
     */
    function renderQuestion(question) {
        questionCounter++;
        const questionId = question.id;
        const questionType = question.question_type;
        const isRequired = question.is_required;
        const requiredMark = isRequired ? '<span class="required-mark">*</span>' : '';

        let optionsHtml = '';
        if (questionType === 'single_choice') {
            optionsHtml = renderSingleChoiceOptions(questionId, question.options);
        } else if (questionType === 'multiple_choice') {
            optionsHtml = renderMultipleChoiceOptions(questionId, question.options);
        } else {
            optionsHtml = renderTextQuestion(questionId);
        }

        return `
            <div class="question-card" data-question-id="${escapeHtml(questionId)}" data-type="${questionType}" data-required="${isRequired}">
                <div class="d-flex align-items-start mb-3">
                    <span class="question-number me-2 mt-1">${questionCounter}</span>
                    <h6 class="question-text mb-0 flex-grow-1">${escapeHtml(question.text)}${requiredMark}</h6>
                </div>
                <div class="options-container">
                    ${optionsHtml}
                </div>
            </div>
        `;
    }

    /**
     * 渲染量表内容
     * @param {object} scale - 量表数据
     */
    function renderScale(scale) {
        currentScale = scale;
        questionCounter = 0;

        // 设置页面标题
        document.title = `${scale.title} - 心理量表测评平台`;

        // 渲染量表头部
        const headerHtml = `
            <div class="card mb-4">
                <div class="card-body p-4">
                    <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
                        <div>
                            <h2 class="fw-bold mb-2">${escapeHtml(scale.title)}</h2>
                            <p class="text-muted mb-0">${escapeHtml(scale.description || '')}</p>
                        </div>
                        ${scale.scale_type === 'ai_analysis'
                            ? '<span class="badge-ai"><i class="bi bi-robot me-1"></i>AI深度分析</span>'
                            : '<span class="badge-category"><i class="bi bi-clipboard-data me-1"></i>即时评分</span>'
                        }
                    </div>
                </div>
            </div>
        `;

        // 渲染内容项（引导内容 + 题目）
        const contentItemsHtml = (scale.content_items || []).map(item => {
            if (item.type === 'section') {
                return renderSection(item);
            } else if (item.type === 'question') {
                return renderQuestion(item);
            }
            return '';
        }).join('');

        // 提交按钮区域（根据量表类型显示不同文案）
        const isAI = scale.scale_type === 'ai_analysis';
        const submitBtnText = isAI ? '提交并获取AI分析报告' : '提交并查看测评结果';
        const loadingTitle = isAI ? '分析中，请稍等' : '正在生成报告';
        const loadingDesc = isAI
            ? '我们正在将您的回答提交给 AI 进行深度分析，预计需要 10-30 秒'
            : '正在为您计算评分并生成个性化报告，请稍候...';
        const loadingVisuallyHidden = isAI ? '分析中...' : '生成报告中...';

        const submitAreaHtml = `
            <div class="d-grid gap-2 mb-5">
                <button type="submit" class="btn btn-primary btn-lg" id="submitBtn">
                    <i class="bi bi-check-circle-fill me-2"></i>${submitBtnText}
                </button>
            </div>

            <!-- 提交中提示 -->
            <div id="submitLoading" class="card mb-4 d-none submit-loading-card">
                <div class="card-body text-center p-4">
                    <div class="spinner-border mb-3" role="status" style="width: 3rem; height: 3rem;">
                        <span class="visually-hidden">${loadingVisuallyHidden}</span>
                    </div>
                    <h5 class="fw-bold mb-2">${loadingTitle}</h5>
                    <p class="text-muted mb-0">${loadingDesc}</p>
                    <div class="progress mt-3" style="height: 6px;">
                        <div class="progress-bar progress-bar-striped progress-bar-animated" style="width: 100%;"></div>
                    </div>
                </div>
            </div>
        `;

        // 填充表单内部内容（保留 form 元素本身以便事件绑定）
        scaleForm.innerHTML = headerHtml + contentItemsHtml + submitAreaHtml;

        // 绑定选项点击事件
        bindOptionClicks();

        // 绑定表单提交事件（确保只绑定一次）
        scaleForm.removeEventListener('submit', handleSubmit);
        scaleForm.addEventListener('submit', handleSubmit);

        // 显示内容
        loadingState.classList.add('d-none');
        scaleContent.classList.remove('d-none');
    }

    /**
     * 绑定选项点击交互
     */
    function bindOptionClicks() {
        document.querySelectorAll('.option-item').forEach(item => {
            item.addEventListener('click', function (e) {
                // 如果点击的是 input 或 label 本身，让浏览器默认处理
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'LABEL') {
                    // 仍然需要更新视觉效果
                    const input = this.querySelector('input');
                    const questionCard = this.closest('.question-card');
                    const qtype = questionCard.dataset.type;

                    if (qtype === 'single_choice') {
                        questionCard.querySelectorAll('.option-item').forEach(opt => opt.classList.remove('selected'));
                        this.classList.add('selected');
                    } else if (qtype === 'multiple_choice') {
                        // 延迟以让 checkbox 状态更新
                        setTimeout(() => {
                            if (input.checked) {
                                this.classList.add('selected');
                            } else {
                                this.classList.remove('selected');
                            }
                        }, 0);
                    }
                    return;
                }

                // 点击容器其他区域时手动触发
                const input = this.querySelector('input');
                const questionCard = this.closest('.question-card');
                const qtype = questionCard.dataset.type;

                if (qtype === 'single_choice') {
                    questionCard.querySelectorAll('.option-item').forEach(opt => opt.classList.remove('selected'));
                    this.classList.add('selected');
                    input.checked = true;
                } else if (qtype === 'multiple_choice') {
                    input.checked = !input.checked;
                    if (input.checked) {
                        this.classList.add('selected');
                    } else {
                        this.classList.remove('selected');
                    }
                }

                // 触发 change 事件
                input.dispatchEvent(new Event('change', { bubbles: true }));
            });
        });
    }

    /**
     * 收集所有答案
     * @returns {object} 答案对象
     */
    function collectAnswers() {
        const answers = {};

        document.querySelectorAll('.question-card').forEach(card => {
            const qid = card.dataset.questionId;
            const qtype = card.dataset.type;

            if (qtype === 'single_choice') {
                const selected = card.querySelector('input[type="radio"]:checked');
                if (selected) {
                    answers[qid] = selected.value;
                }
            } else if (qtype === 'multiple_choice') {
                const checked = card.querySelectorAll('input[type="checkbox"]:checked');
                answers[qid] = Array.from(checked).map(c => c.value);
            } else {
                const textarea = card.querySelector('textarea');
                if (textarea) {
                    answers[qid] = textarea.value;
                }
            }
        });

        return answers;
    }

    /**
     * 验证必答题
     * @returns {object} { valid: boolean, firstErrorQuestion: HTMLElement }
     */
    function validateRequired() {
        let firstErrorCard = null;

        document.querySelectorAll('.question-card').forEach(card => {
            const isRequired = card.dataset.required === 'true';
            const qtype = card.dataset.type;
            let answered = false;

            if (qtype === 'single_choice') {
                answered = !!card.querySelector('input[type="radio"]:checked');
            } else if (qtype === 'multiple_choice') {
                answered = card.querySelectorAll('input[type="checkbox"]:checked').length > 0;
            } else {
                const textarea = card.querySelector('textarea');
                answered = textarea && textarea.value.trim().length > 0;
            }

            if (isRequired && !answered) {
                card.classList.add('error');
                if (!firstErrorCard) {
                    firstErrorCard = card;
                }
            } else {
                card.classList.remove('error');
            }
        });

        return {
            valid: !firstErrorCard,
            firstErrorQuestion: firstErrorCard
        };
    }

    /**
     * 处理表单提交
     * @param {Event} e - 提交事件
     */
    async function handleSubmit(e) {
        e.preventDefault();

        const submitBtn = document.getElementById('submitBtn');
        const submitLoading = document.getElementById('submitLoading');

        // 验证必答题
        const validation = validateRequired();
        if (!validation.valid) {
            // 滚动到第一个未答的必答题
            if (validation.firstErrorQuestion) {
                validation.firstErrorQuestion.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }

        // 收集答案
        const answers = collectAnswers();

        // 显示加载提示
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>提交中...';
        submitLoading.classList.remove('d-none');
        submitLoading.scrollIntoView({ behavior: 'smooth', block: 'center' });

        try {
            const data = await API.submitAnswers(currentScale.id, answers);

            if (data.success) {
                // 跳转到报告页
                const reportUrl = `${CONFIG.PAGES.REPORT}?id=${encodeURIComponent(data.response_id)}`;
                window.location.href = reportUrl;
            } else {
                throw new Error(data.message || '提交失败');
            }
        } catch (error) {
            console.error('提交失败:', error);
            submitLoading.classList.add('d-none');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="bi bi-check-circle-fill me-2"></i>提交并获取分析报告';
            alert('提交失败: ' + error.message);
        }
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
     * 加载量表数据
     * @param {string} scaleId - 量表ID
     */
    async function loadScale(scaleId) {
        loadingState.classList.remove('d-none');
        errorState.classList.add('d-none');
        scaleContent.classList.add('d-none');

        try {
            const data = await API.getScale(scaleId);

            if (data.success && data.scale) {
                renderScale(data.scale);
            } else {
                showError(data.message || '获取量表失败');
            }
        } catch (error) {
            console.error('加载量表失败:', error);
            showError(error.message || '网络错误，请检查网络连接后重试');
        }
    }

    /**
     * 页面初始化
     */
    function init() {
        const scaleId = getUrlParam('id');

        if (!scaleId) {
            showError('缺少量表ID参数');
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
            retryBtn.addEventListener('click', () => loadScale(scaleId));
        }

        loadScale(scaleId);
    }

    // DOM 加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
