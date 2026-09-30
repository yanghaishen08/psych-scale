/**
 * 动态背景效果：
 * 1. 生成随机星光闪烁（更大更亮）
 * 2. 背景图加载完成后淡入显示
 */
(function () {
    'use strict';

    function createStars() {
        var layer = document.createElement('div');
        layer.className = 'stars-layer';

        var starCount = window.innerWidth < 768 ? 40 : 80;

        for (var i = 0; i < starCount; i++) {
            var star = document.createElement('div');
            star.className = 'star';
            star.style.left = Math.random() * 100 + '%';
            star.style.top = Math.random() * 100 + '%';
            star.style.setProperty('--dur', (1.5 + Math.random() * 3.5) + 's');
            star.style.setProperty('--delay', (Math.random() * 4) + 's');

            var isGold = Math.random() > 0.65;
            var size = 2 + Math.random() * 3;
            star.style.width = size + 'px';
            star.style.height = size + 'px';

            if (isGold) {
                star.style.background = '#F5D65A';
                star.style.setProperty('--star-glow', 'rgba(245, 214, 90, 0.8)');
            } else {
                var brightness = 0.6 + Math.random() * 0.4;
                star.style.background = 'rgba(255, 255, 255, ' + brightness + ')';
                star.style.setProperty('--star-glow', 'rgba(255, 255, 255, 0.7)');
            }

            layer.appendChild(star);
        }

        document.body.appendChild(layer);
    }

    function preloadBackground() {
        var isMobile = window.innerWidth <= 768;
        var bgUrl = isMobile
            ? './assets/images/bg-mobile.jpg'
            : './assets/images/bg-pc.jpg';

        var img = new Image();
        img.onload = function () {
            document.body.classList.add('bg-ready');
        };
        img.onerror = function () {
            document.body.classList.add('bg-ready');
        };
        img.src = bgUrl;
    }

    function init() {
        createStars();
        preloadBackground();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
