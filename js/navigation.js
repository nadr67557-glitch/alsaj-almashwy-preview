/* ===================================
   الصاج - المشوي — سكريبت التنقل الموحد
   Unified Navigation JavaScript
   =================================== */

(function () {
    'use strict';

    function initNavigation() {
        var toggleBtn = document.getElementById('navToggleBtn');
        var drawer = document.getElementById('siteNavDrawer');
        var closeBtn = document.getElementById('navDrawerClose');
        var backdrop = document.getElementById('navDrawerBackdrop');

        if (!toggleBtn || !drawer) return;

        function openNav() {
            drawer.classList.add('is-open');
            drawer.setAttribute('aria-hidden', 'false');
            toggleBtn.setAttribute('aria-expanded', 'true');
            document.body.style.overflow = 'hidden';
            if (closeBtn) closeBtn.focus();
        }

        function closeNav() {
            drawer.classList.remove('is-open');
            drawer.setAttribute('aria-hidden', 'true');
            toggleBtn.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = '';
            toggleBtn.focus();
        }

        toggleBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            if (drawer.classList.contains('is-open')) {
                closeNav();
            } else {
                openNav();
            }
        });

        if (closeBtn) {
            closeBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                closeNav();
            });
        }

        if (backdrop) {
            backdrop.addEventListener('click', function (e) {
                e.stopPropagation();
                closeNav();
            });
        }

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && drawer.classList.contains('is-open')) {
                closeNav();
            }
        });

        // تمييز الصفحة الحالية تلقائيًا
        var path = window.location.pathname || '';
        var filename = path.split('/').pop() || 'index.html';
        if (filename === '') filename = 'index.html';

        var navLinks = drawer.querySelectorAll('.nav-menu-link');
        navLinks.forEach(function (link) {
            var href = link.getAttribute('href') || '';
            var linkFile = href.split('/').pop().split('#')[0] || 'index.html';
            if (linkFile === filename) {
                link.classList.add('is-active');
                link.setAttribute('aria-current', 'page');
            } else {
                link.classList.remove('is-active');
                link.removeAttribute('aria-current');
            }
        });
    }

    /* زر العودة للأعلى (Scroll To Top) */
    function initScrollToTop() {
        var btn = document.getElementById('scrollToTopBtn');
        if (!btn) {
            btn = document.createElement('button');
            btn.id = 'scrollToTopBtn';
            btn.className = 'scroll-to-top';
            btn.type = 'button';
            btn.setAttribute('aria-label', 'العودة إلى أعلى الصفحة');
            btn.setAttribute('title', 'العودة إلى أعلى الصفحة');
            btn.innerHTML = '<svg class="scroll-to-top-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
            document.body.appendChild(btn);
        }

        var isVisible = false;
        function checkScroll() {
            var scrollY = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
            if (scrollY > 240) {
                if (!isVisible) {
                    btn.classList.add('is-visible');
                    isVisible = true;
                }
            } else {
                if (isVisible) {
                    btn.classList.remove('is-visible');
                    isVisible = false;
                }
            }
        }

        window.addEventListener('scroll', checkScroll, { passive: true });
        checkScroll();

        btn.addEventListener('click', function (e) {
            e.preventDefault();
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
            btn.blur();
        });
    }

    function initAll() {
        initNavigation();
        initScrollToTop();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAll);
    } else {
        initAll();
    }
})();
