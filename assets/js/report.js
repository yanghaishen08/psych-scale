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

    // ==================== 图表渲染 ====================

    /** 配色方案 */
    const CHART_COLORS = ['#4a90a4', '#6b8e9f', '#e07a5f', '#81b29a', '#f2cc8f', '#a8c5b9', '#c97b63', '#7ba7b8', '#d4a574', '#9ab8a3', '#b8a08a'];

    /**
     * 检测代码块是否为 Mermaid 语法或饼图/雷达图
     */
    function detectChartType(text) {
        const trimmed = text.trim();
        if (/^pie\b/im.test(trimmed) || /^%%\{init.*\}%%\s*\n\s*pie\b/ims.test(trimmed)) return 'pie';
        if (/^radar(-beta|LR|TB|RL|BT)?\b/im.test(trimmed)) return 'radar';
        if (/^(graph|flowchart|sequenceDiagram|gantt|classDiagram|stateDiagram|erDiagram|journey|gitGraph|mindmap|timeline|quadrantChart|xychart|sankey|block|architecture)\b/im.test(trimmed)) return 'mermaid';
        return null;
    }

    /**
     * 解析饼图数据（Mermaid pie 语法）
     */
    function parsePieChartData(code) {
        const lines = code.split('\n');
        let title = '';
        const data = [];
        for (let line of lines) {
            const t = line.trim();
            if (/^pie\b/i.test(t) || /^%%\{/.test(t) || t === '') continue;
            if (t.startsWith('title ')) { title = t.substring(6).trim(); continue; }
            const m = t.match(/^"([^"]+)"\s*:\s*([\d.]+)/);
            if (m) data.push({ label: m[1], value: parseFloat(m[2]) });
        }
        return { title, data };
    }

    /**
     * 渲染自定义环形图（替代 Mermaid pie，样式更美观）
     */
    function renderCustomDonutChart(pieData, container) {
        const { title, data } = pieData;
        if (!data.length) { container.innerHTML = '<p class="text-muted">暂无数据</p>'; return; }

        const total = data.reduce((s, d) => s + d.value, 0);
        const r = 70, sw = 28, cx = 100, cy = 100;
        const circ = 2 * Math.PI * r;

        let segments = '';
        let offset = 0;
        data.forEach((item, i) => {
            const pct = item.value / total;
            const len = pct * circ;
            const color = CHART_COLORS[i % CHART_COLORS.length];
            segments += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-dasharray="${len} ${circ - len}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})" style="transition: stroke-dasharray 0.5s ease;"/>`;
            offset += len;
        });

        // 判断是否为评分区间型饼图（如"优势区""待开发区"等）
        const isZoneChart = data.some(d => /优势区|待开发区|脆弱区|预警区|≥\d|<\d/.test(d.label));
        const centerVal = isZoneChart ? '' : Math.round(total);
        const centerLabel = isZoneChart ? '评估' : '合计';

        const legend = data.map((item, i) => {
            const color = CHART_COLORS[i % CHART_COLORS.length];
            const pct = ((item.value / total) * 100).toFixed(0);
            return `<div class="donut-legend-item"><span class="donut-legend-dot" style="background:${color}"></span><span class="donut-legend-label">${item.label}</span><span class="donut-legend-pct">${pct}%</span></div>`;
        }).join('');

        container.innerHTML = `
            <div class="custom-chart-card">
                <h3 class="custom-chart-title">${escapeHtml(title || '综合指数')}</h3>
                <div class="custom-chart-body">
                    <div class="donut-wrapper">
                        <svg viewBox="0 0 200 200" class="donut-svg">
                            ${segments}
                            ${centerVal ? `<text x="${cx}" y="${cy - 5}" text-anchor="middle" class="donut-center-val">${centerVal}</text>` : ''}
                            <text x="${cx}" y="${cy + 18}" text-anchor="middle" class="donut-center-label">${centerLabel}</text>
                        </svg>
                    </div>
                    <div class="donut-legend">${legend}</div>
                </div>
            </div>`;
    }

    /**
     * 解析雷达图数据（支持 radarLR / radar / radar-beta 多种 AI 生成格式）
     */
    function parseRadarData(code) {
        const lines = code.split('\n');
        let axes = [], values = [], seriesName = '得分', title = '';

        for (let line of lines) {
            const t = line.trim();
            if (/^(radar|accTitle|accDescr)/i.test(t)) continue;
            if (t.startsWith('title ')) { title = t.substring(6).trim(); continue; }
            if (t.startsWith('axis ')) {
                // 支持 axis a["标签"], b["标签"] 和 axis 标签1, 标签2 两种格式
                const rest = t.substring(5);
                const idLabels = rest.match(/(\w+)\["([^"]+)"\]/g);
                if (idLabels) {
                    idLabels.forEach(m => { const mm = m.match(/(\w+)\["([^"]+)"\]/); if (mm) axes.push(mm[2]); });
                } else {
                    axes = axes.concat(rest.split(',').map(s => s.trim()).filter(Boolean));
                }
                continue;
            }
            if (t.startsWith('curve ')) {
                const m = t.match(/curve\s+\w+(?:\["([^"]+)"\])?\s*\{([^}]+)\}/);
                if (m) { if (m[1]) seriesName = m[1]; values = m[2].split(',').map(s => parseFloat(s.trim())); }
                continue;
            }
            if (t.startsWith('series ')) { seriesName = t.substring(7).trim(); continue; }
            if (t.startsWith('values ')) { values = t.substring(7).split(',').map(s => parseFloat(s.trim())); continue; }
        }
        return { title, axes, values, seriesName };
    }

    /**
     * 渲染自定义 SVG 雷达图（不依赖 Mermaid，完全自主渲染）
     */
    function renderCustomRadarChart(radarData, container) {
        const { title, axes, values, seriesName } = radarData;
        if (!axes.length || !values.length) { container.innerHTML = '<p class="text-muted">雷达图数据不完整</p>'; return; }

        const n = Math.min(axes.length, values.length);
        const size = 380, cx = 190, cy = 190, maxR = 130;
        const maxVal = 100, minVal = 0;
        const levels = 5; // 同心层数

        // 计算各点坐标
        const angle = (i) => (Math.PI * 2 * i) / n - Math.PI / 2;
        const pointR = (v) => maxR * ((v - minVal) / (maxVal - minVal));
        const px = (i, r) => cx + r * Math.cos(angle(i));
        const py = (i, r) => cy + r * Math.sin(angle(i));

        // 同心多边形网格
        let grid = '';
        for (let lv = 1; lv <= levels; lv++) {
            const r = (maxR * lv) / levels;
            const pts = Array.from({ length: n }, (_, i) => `${px(i, r)},${py(i, r)}`).join(' ');
            grid += `<polygon points="${pts}" fill="${lv === levels ? 'rgba(74,144,164,0.03)' : 'none'}" stroke="rgba(74,144,164,0.15)" stroke-width="1"/>`;
        }

        // 轴线
        let axisLines = '';
        let axisLabels = '';
        for (let i = 0; i < n; i++) {
            axisLines += `<line x1="${cx}" y1="${cy}" x2="${px(i, maxR)}" y2="${py(i, maxR)}" stroke="rgba(74,144,164,0.2)" stroke-width="1"/>`;
            const lx = px(i, maxR + 22), ly = py(i, maxR + 22);
            const anchor = Math.abs(lx - cx) < 10 ? 'middle' : (lx > cx ? 'start' : 'end');
            const valColor = values[i] >= 80 ? '#4a90a4' : values[i] >= 60 ? '#6b8e9f' : values[i] >= 40 ? '#e07a5f' : '#d9534f';
            axisLabels += `<text x="${lx}" y="${ly}" text-anchor="${anchor}" class="radar-axis-label">${axes[i]}</text>`;
            axisLabels += `<text x="${lx}" y="${ly + 14}" text-anchor="${anchor}" class="radar-axis-val" fill="${valColor}">${values[i]}</text>`;
        }

        // 数据多边形
        const dataPts = Array.from({ length: n }, (_, i) => `${px(i, pointR(values[i]))},${py(i, pointR(values[i]))}`).join(' ');
        const dataDots = Array.from({ length: n }, (_, i) => {
            const dx = px(i, pointR(values[i])), dy = py(i, pointR(values[i]));
            const valColor = values[i] >= 80 ? '#4a90a4' : values[i] >= 60 ? '#6b8e9f' : values[i] >= 40 ? '#e07a5f' : '#d9534f';
            return `<circle cx="${dx}" cy="${dy}" r="4" fill="${valColor}" stroke="#fff" stroke-width="1.5"/>`;
        }).join('');

        container.innerHTML = `
            <div class="custom-chart-card">
                <h3 class="custom-chart-title">${escapeHtml(title || '维度雷达图')}</h3>
                <div class="custom-chart-body radar-body">
                    <svg viewBox="0 0 380 380" class="radar-svg">
                        ${grid}
                        ${axisLines}
                        <polygon points="${dataPts}" fill="rgba(74,144,164,0.15)" stroke="#4a90a4" stroke-width="2" stroke-linejoin="round"/>
                        ${dataDots}
                        ${axisLabels}
                    </svg>
                </div>
                <p class="radar-series-name">${escapeHtml(seriesName)}</p>
            </div>`;
    }

    /**
     * 渲染所有图表（饼图用自定义环形图，雷达图用自定义 SVG，其余用 Mermaid）
     */
    async function renderCharts() {
        const allCodeBlocks = reportContainer.querySelectorAll('pre code');
        const charts = [];

        allCodeBlocks.forEach((codeBlock) => {
            const lang = (codeBlock.className || '').replace('language-', '').trim();
            const text = codeBlock.textContent.trim();
            const type = lang === 'mermaid' ? detectChartType(text) || 'mermaid' : detectChartType(text);
            if (type) charts.push({ codeBlock, type, text });
        });

        if (charts.length === 0) return;

        for (const { codeBlock, type, text } of charts) {
            const pre = codeBlock.parentElement;
            if (!pre || !pre.parentElement) continue;

            const container = document.createElement('div');
            container.className = 'chart-container';

            if (type === 'pie') {
                const data = parsePieChartData(text);
                renderCustomDonutChart(data, container);
            } else if (type === 'radar') {
                const data = parseRadarData(text);
                renderCustomRadarChart(data, container);
            } else {
                // 其他 Mermaid 图表类型
                container.className = 'mermaid';
                container.textContent = text;
            }

            pre.parentElement.replaceChild(container, pre);
        }

        // 渲染剩余的 Mermaid 图表（非饼图/雷达图）
        const mermaidDivs = reportContainer.querySelectorAll('.mermaid');
        if (mermaidDivs.length === 0) return;
        if (typeof mermaid === 'undefined') { console.warn('Mermaid 库未加载'); return; }

        mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' });
        for (const div of mermaidDivs) {
            try { await mermaid.run({ nodes: [div] }); }
            catch (err) { console.warn('Mermaid 渲染失败:', err); div.classList.add('mermaid-error'); }
        }
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

        // 渲染图表（异步，不阻塞内容显示）
        renderCharts();
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
