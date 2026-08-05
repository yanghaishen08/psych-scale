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

    /** 按分数返回颜色 */
    function scoreColor(v) {
        if (v >= 80) return '#2EC4B6';  // 青绿 - 优势
        if (v >= 60) return '#3498DB';  // 蓝 - 待开发
        if (v >= 40) return '#F5A623';  // 橙 - 脆弱
        return '#F25F5C';               // 红 - 预警
    }

    /** 按分数返回评级标签 */
    function scoreLabel(v) {
        if (v >= 80) return '优势区';
        if (v >= 60) return '待开发区';
        if (v >= 40) return '脆弱区';
        return '预警区';
    }

    /** 节点配色（辐射图用） */
    const NODE_COLORS = ['#F5A623', '#F25F5C', '#2EC4B6', '#A8D46F', '#D64161', '#3498DB', '#D4A373', '#8E7CA6', '#E67E22', '#1ABC9C', '#E74C3C'];

    /**
     * 检测代码块类型
     */
    function detectChartType(text) {
        const trimmed = text.trim();
        if (/^pie\b/im.test(trimmed) || /^%%\{init.*\}%%\s*\n\s*pie\b/ims.test(trimmed)) return 'pie';
        if (/^radar(-beta|LR|TB|RL|BT)?\b/im.test(trimmed)) return 'radar';
        if (/^(graph|flowchart|sequenceDiagram|gantt|classDiagram|stateDiagram|erDiagram|journey|gitGraph|mindmap|timeline|quadrantChart|xychart|sankey|block|architecture)\b/im.test(trimmed)) return 'mermaid';
        return null;
    }

    /**
     * 解析饼图数据
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
     * 渲染辐射节点仪表盘（仿图1风格：中心圆 + 彩色节点辐射布局）
     */
    function renderRadialDashboard(pieData, container) {
        const { title, data } = pieData;
        if (!data.length) { container.innerHTML = '<p class="text-muted">暂无数据</p>'; return; }

        const total = data.reduce((s, d) => s + d.value, 0);
        const n = data.length;

        // 判断是否为评分区间型（如 优势区/待开发区/脆弱区/预警区）
        const isZoneChart = data.some(d => /优势区|待开发区|脆弱区|预警区/.test(d.label));

        // SVG 尺寸
        const cx = 200, cy = 200;
        const centerR = 52;
        const nodeR = 34;
        const orbitR = 140;

        // 计算节点位置
        const angle = (i) => (Math.PI * 2 * i) / n - Math.PI / 2;
        const nx = (i) => cx + orbitR * Math.cos(angle(i));
        const ny = (i) => cy + orbitR * Math.sin(angle(i));

        // 连接线（从中心到节点，带锥度）
        let connectors = '';
        let nodes = '';
        let nodeTexts = '';

        data.forEach((item, i) => {
            const x = nx(i), y = ny(i);
            const color = isZoneChart
                ? (item.label.includes('优势') ? '#2EC4B6' : item.label.includes('待开') ? '#3498DB' : item.label.includes('脆弱') ? '#F5A623' : '#F25F5C')
                : NODE_COLORS[i % NODE_COLORS.length];
            const pct = Math.round((item.value / total) * 100);

            // 锥形连接线
            const dx = x - cx, dy = y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const ux = dx / dist, uy = dy / dist;
            // 垂直方向
            const vx = -uy, vy = ux;
            const startW = 4, endW = nodeR * 0.5;
            const sx1 = cx + vx * startW, sy1 = cy + vy * startW;
            const sx2 = cx - vx * startW, sy2 = cy - vy * startW;
            const ex1 = x + vx * endW, ey1 = y + vy * endW;
            const ex2 = x - vx * endW, ey2 = y - vy * endW;

            connectors += `<path d="M ${sx1} ${sy1} L ${ex1} ${ey1} L ${ex2} ${ey2} L ${sx2} ${sy2} Z" fill="${color}" opacity="0.18"/>`;

            // 节点圆
            nodes += `<circle cx="${x}" cy="${y}" r="${nodeR}" fill="${color}" opacity="0.9" filter="url(#shadow)"/>`;
            nodes += `<circle cx="${x}" cy="${y}" r="${nodeR}" fill="none" stroke="#fff" stroke-width="2.5"/>`;

            // 节点内文字：百分比
            nodeTexts += `<text x="${x}" y="${y - 2}" text-anchor="middle" class="node-pct">${pct}%</text>`;
            // 节点内文字：标签简称
            let shortLabel = item.label;
            if (isZoneChart) {
                shortLabel = item.label.replace(/[（(].*[）)].*/, '').replace(/\[.*\]/, '').trim();
            } else if (shortLabel.length > 5) {
                shortLabel = shortLabel.substring(0, 4) + '..';
            }
            nodeTexts += `<text x="${x}" y="${y + 13}" text-anchor="middle" class="node-label">${shortLabel}</text>`;

            // 节点外侧标签（详细）
            const lx = cx + (orbitR + 48) * Math.cos(angle(i));
            const ly = cy + (orbitR + 48) * Math.sin(angle(i));
            const anchor = Math.abs(lx - cx) < 15 ? 'middle' : (lx > cx ? 'start' : 'end');
            nodeTexts += `<text x="${lx}" y="${ly}" text-anchor="${anchor}" class="node-detail">${item.label}</text>`;
            nodeTexts += `<text x="${lx}" y="${ly + 14}" text-anchor="${anchor}" class="node-detail-val" fill="${color}">${item.value}</text>`;
        });

        // 中心圆
        const centerScore = isZoneChart ? '' : Math.round(total / n);
        const centerTitle = isZoneChart ? '评估' : (title || '综合指数').substring(0, 6);

        container.innerHTML = `
            <div class="custom-chart-card radial-card">
                <h3 class="custom-chart-title">${escapeHtml(title || '综合仪表盘')}</h3>
                <div class="custom-chart-body radial-body">
                    <svg viewBox="0 0 400 400" class="radial-svg" preserveAspectRatio="xMidYMid meet">
                        <defs>
                            <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                                <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.15"/>
                            </filter>
                        </defs>
                        ${connectors}
                        ${nodes}
                        <!-- 中心圆 -->
                        <circle cx="${cx}" cy="${cy}" r="${centerR + 6}" fill="#fff" filter="url(#shadow)"/>
                        <circle cx="${cx}" cy="${cy}" r="${centerR}" fill="none" stroke="#e8eef2" stroke-width="2"/>
                        ${centerScore ? `<text x="${cx}" y="${cy - 3}" text-anchor="middle" class="center-score">${centerScore}</text>` : ''}
                        <text x="${cx}" y="${cy + 15}" text-anchor="middle" class="center-label">${centerTitle}</text>
                        ${nodeTexts}
                    </svg>
                </div>
            </div>`;
    }

    /**
     * 解析雷达图数据
     */
    function parseRadarData(code) {
        const lines = code.split('\n');
        let axes = [], values = [], seriesName = '得分', title = '';

        for (let line of lines) {
            const t = line.trim();
            if (/^(radar|accTitle|accDescr)/i.test(t)) continue;
            if (t.startsWith('title ')) { title = t.substring(6).trim(); continue; }
            if (t.startsWith('axis ')) {
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
     * 渲染经典雷达图（仿图2风格：多边形网格 + 半透明填充 + 数据点标记）
     */
    function renderClassicRadarChart(radarData, container) {
        const { title, axes, values, seriesName } = radarData;
        if (!axes.length || !values.length) {
            container.innerHTML = '<p class="text-muted">雷达图数据不完整</p>';
            return;
        }

        const n = Math.min(axes.length, values.length);
        const cx = 200, cy = 200, maxR = 135;
        const maxVal = 100, minVal = 0;
        const levels = 5;

        const angle = (i) => (Math.PI * 2 * i) / n - Math.PI / 2;
        const pointR = (v) => maxR * Math.max(0, Math.min(1, (v - minVal) / (maxVal - minVal)));
        const px = (i, r) => cx + r * Math.cos(angle(i));
        const py = (i, r) => cy + r * Math.sin(angle(i));

        // 网格层
        let grid = '';
        for (let lv = 1; lv <= levels; lv++) {
            const r = (maxR * lv) / levels;
            const pts = Array.from({ length: n }, (_, i) => `${px(i, r).toFixed(1)},${py(i, r).toFixed(1)}`).join(' ');
            const fill = lv === levels ? 'rgba(0,0,0,0.02)' : 'none';
            const stroke = lv === levels ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.07)';
            grid += `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`;
        }

        // 刻度标签
        let scaleLabels = '';
        for (let lv = 1; lv <= levels; lv++) {
            const r = (maxR * lv) / levels;
            const val = Math.round((maxVal - minVal) * lv / levels);
            scaleLabels += `<text x="${cx + 3}" y="${cy - r + 4}" class="radar-scale">${val}</text>`;
        }

        // 轴线
        let axisLines = '';
        for (let i = 0; i < n; i++) {
            axisLines += `<line x1="${cx}" y1="${cy}" x2="${px(i, maxR).toFixed(1)}" y2="${py(i, maxR).toFixed(1)}" stroke="rgba(0,0,0,0.1)" stroke-width="1"/>`;
        }

        // 轴标签
        let axisLabels = '';
        for (let i = 0; i < n; i++) {
            const lx = px(i, maxR + 24), ly = py(i, maxR + 24);
            const anchor = Math.abs(lx - cx) < 12 ? 'middle' : (lx > cx ? 'start' : 'end');
            axisLabels += `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="${anchor}" class="radar-axis-label">${axes[i]}</text>`;
            axisLabels += `<text x="${lx.toFixed(1)}" y="${(ly + 15).toFixed(1)}" text-anchor="${anchor}" class="radar-axis-val" fill="${scoreColor(values[i])}">${values[i]}</text>`;
        }

        // 数据多边形
        const dataPts = Array.from({ length: n }, (_, i) => `${px(i, pointR(values[i])).toFixed(1)},${py(i, pointR(values[i])).toFixed(1)}`).join(' ');

        // 数据点标记
        let dataMarkers = '';
        for (let i = 0; i < n; i++) {
            const dx = px(i, pointR(values[i])), dy = py(i, pointR(values[i]));
            dataMarkers += `<circle cx="${dx.toFixed(1)}" cy="${dy.toFixed(1)}" r="4.5" fill="${scoreColor(values[i])}" stroke="#fff" stroke-width="2"/>`;
        }

        container.innerHTML = `
            <div class="custom-chart-card radar-card">
                <h3 class="custom-chart-title">${escapeHtml(title || '维度雷达图')}</h3>
                <div class="custom-chart-body radar-body">
                    <svg viewBox="0 0 400 400" class="radar-svg" preserveAspectRatio="xMidYMid meet">
                        ${grid}
                        ${scaleLabels}
                        ${axisLines}
                        <polygon points="${dataPts}" fill="rgba(46,196,182,0.15)" stroke="#2EC4B6" stroke-width="2.5" stroke-linejoin="round"/>
                        ${dataMarkers}
                        ${axisLabels}
                    </svg>
                </div>
                <div class="radar-legend">
                    <span class="radar-legend-dot" style="background:#2EC4B6"></span>
                    <span class="radar-legend-text">${escapeHtml(seriesName)}</span>
                </div>
            </div>`;
    }

    /**
     * 渲染所有图表
     */
    async function renderCharts() {
        try {
            // 查找所有代码块
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
                    renderRadialDashboard(data, container);
                } else if (type === 'radar') {
                    const data = parseRadarData(text);
                    renderClassicRadarChart(data, container);
                } else {
                    container.className = 'mermaid';
                    container.textContent = text;
                }

                pre.parentElement.replaceChild(container, pre);
            }

            // 渲染剩余 Mermaid 图表
            const mermaidDivs = reportContainer.querySelectorAll('.mermaid');
            if (mermaidDivs.length === 0) return;
            if (typeof mermaid === 'undefined') { console.warn('Mermaid 库未加载'); return; }

            mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' });
            for (const div of mermaidDivs) {
                try { await mermaid.run({ nodes: [div] }); }
                catch (err) { console.warn('Mermaid 渲染失败:', err); div.classList.add('mermaid-error'); }
            }
        } catch (err) {
            console.error('图表渲染异常:', err);
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
