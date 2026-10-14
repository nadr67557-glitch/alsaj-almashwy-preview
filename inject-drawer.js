/* معاينة مستقلة V6 —
   1) أيقونة الفروع = النقطة الحمراء الومّاضة (كلاس الموقع الأصلي في navigation.css)
   2) درج التنقل الموحد في صفحة المعرض (كان غائب البنية DOM)
   3) زر السلة بالمعرض يفتح cart.html مع عدّاد من نفس مفتاح التخزين alsaj_cart_items
   لا تغيير خط/ألوان/هوية/فيديو/شعار؛ زر «العودة للرئيسية» باقٍ كما هو */
(function () {
  'use strict';
  if (window.__navV2Injected) return;
  window.__navV2Injected = true;

  var CART_KEY = 'alsaj_cart_items'; // نفس مفتاح main.js — قراءة فقط

  function cartCount() {
    try {
      var raw = localStorage.getItem(CART_KEY); if (!raw) return 0;
      var arr = JSON.parse(raw); if (!Array.isArray(arr)) return 0;
      return arr.reduce(function (s, e) { return s + (parseInt(e && e.quantity, 10) || 0); }, 0);
    } catch (e) { return 0; }
  }

  var ITEMS = [
    ['index.html', '\u{1F3E0}', 'الرئيسية'],
    ['menu.html', '\u{1F4CB}', 'المنيو'],
    ['cart.html', '\u{1F6D2}', 'السلة والطلب'],
    ['branches.html', '<span class="red-blinking-dot" aria-hidden="true"></span>', 'الفروع'],
    ['about.html', '\u{1F525}', 'من نحن'],
    ['gallery.html', '\u{1F5BC}\uFE0F', 'معرض الصور'],
    ['contact.html', '\u{1F4AC}', 'تواصل وتقييمات']
  ];

  function li(href, ic, tx) {
    return '                    <li>\n' +
      '                        <a href="' + href + '" class="nav-menu-link">\n' +
      '                            <span class="nav-item-icon" aria-hidden="true">' + ic + '</span>\n' +
      '                            <span class="nav-item-text">' + tx + '</span>\n' +
      '                            <span class="nav-item-indicator" aria-hidden="true"></span>\n' +
      '                        </a>\n' +
      '                    </li>\n';
  }

  var GRID_CSS =
    '#siteNavDrawer .nav-menu-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.55rem .6rem;padding:.6rem .9rem}' +
    '#siteNavDrawer .nav-menu-list li{min-width:0}' +
    '#siteNavDrawer .nav-menu-link{gap:.55rem;padding:.55rem .5rem}' +
    '#siteNavDrawer .nav-menu-link,#siteNavDrawer .nav-item-text{font-weight:700}' +
    '#siteNavDrawer .nav-item-icon{width:38px;height:38px;min-width:38px}';

  function injectStyleOnce() {
    if (document.getElementById('navV6Style')) return;
    var s = document.createElement('style');
    s.id = 'navV6Style'; s.textContent = GRID_CSS;
    document.head.appendChild(s);
  }

  function panelInner() {
    var html =
      '<div class="nav-drawer-header">' +
      '<span class="nav-drawer-title" id="navDrawerTitle">الصاج - المشوي</span>' +
      '<button type="button" class="nav-drawer-close" id="navDrawerClose" aria-label="إغلاق القائمة">✕</button>' +
      '</div>' +
      '<nav class="nav-drawer-body" aria-label="القائمة الرئيسية">' +
      '<ul class="nav-menu-list">\n';
    ITEMS.forEach(function (it) { html += li(it[0], it[1], it[2]); });
    html += '                </ul></nav>' +
      '<div class="nav-drawer-footer"><p>«مشوي على أصله... بطعم لا يُنسى»</p></div>';
    return html;
  }

  function markActive(scope) {
    var here = (location.pathname.split('/').pop() || 'index.html');
    scope.querySelectorAll('.nav-menu-link').forEach(function (a) {
      var href = a.getAttribute('href');
      if (href === here) { a.classList.add('is-active'); a.setAttribute('aria-current', 'page'); }
    });
  }

  /* ===== وضع الصفحات القياسية (يوجد بها الدرج أصلاً): استبدال المحتوى فقط ===== */
  function standardMode(drawer, panel) {
    panel.innerHTML = panelInner();
    markActive(panel);
    var closeBtn = document.getElementById('navDrawerClose');
    if (closeBtn) closeBtn.addEventListener('click', function () {
      drawer.classList.remove('is-open');
      drawer.setAttribute('aria-hidden', 'true');
      var tb = document.getElementById('navToggleBtn');
      if (tb) { tb.setAttribute('aria-expanded', 'false'); tb.focus(); }
      document.body.style.overflow = '';
    });
  }

  /* ===== وضع المعرض: لا يوجد header موحد — نضيف ☰ والسلة والدرج حول الهيدر القائم ===== */
  function galleryMode(galHeader) {
    var actions = document.createElement('div');
    actions.className = 'gallery-header-actions';
    actions.style.cssText = 'display:flex;align-items:center;gap:.6rem;margin-inline-start:auto';
    var n = cartCount();
    actions.innerHTML =
      '<a href="cart.html" class="nav-cart-btn" aria-label="عرض السلة والطلب">' +
      '<span class="nav-cart-icon" aria-hidden="true">\u{1F6D2}</span>' +
      '<span class="nav-cart-badge" id="navCartBadge">' + n + '</span></a>' +
      '<button class="nav-toggle-btn" id="navToggleBtn" type="button" aria-label="فتح القائمة الرئيسية" aria-expanded="false" aria-controls="siteNavDrawer">' +
      '<span class="nav-toggle-icon" aria-hidden="true">☰</span></button>';
    galHeader.appendChild(actions);

    var wrap = document.createElement('div');
    wrap.innerHTML =
      '<div class="nav-drawer" id="siteNavDrawer" role="dialog" aria-modal="true" aria-labelledby="navDrawerTitle" aria-hidden="true">' +
      '<div class="nav-drawer-backdrop" id="navDrawerBackdrop"></div>' +
      '<div class="nav-drawer-panel">' + panelInner() + '</div></div>';
    var drawer = wrap.firstElementChild;
    galHeader.parentNode.insertBefore(drawer, galHeader.nextSibling);

    var panel = drawer.querySelector('.nav-drawer-panel');
    markActive(panel);

    var tb = document.getElementById('navToggleBtn');
    var closeBtn = document.getElementById('navDrawerClose');
    function openDrawer() {
      drawer.classList.add('is-open'); drawer.setAttribute('aria-hidden', 'false');
      tb.setAttribute('aria-expanded', 'true'); document.body.style.overflow = 'hidden';
      closeBtn.focus();
    }
    function closeDrawer() {
      drawer.classList.remove('is-open'); drawer.setAttribute('aria-hidden', 'true');
      tb.setAttribute('aria-expanded', 'false'); document.body.style.overflow = '';
      tb.focus();
    }
    tb.addEventListener('click', openDrawer);
    closeBtn.addEventListener('click', closeDrawer);
    document.getElementById('navDrawerBackdrop').addEventListener('click', closeDrawer);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) closeDrawer();
    });
    if (/[?&]open=1/.test(location.search)) openDrawer();
  }

  function boot() {
    injectStyleOnce();
    var drawer = document.getElementById('siteNavDrawer');
    var panel = drawer && drawer.querySelector('.nav-drawer-panel');
    if (panel) { standardMode(drawer, panel); }
    else {
      var gh = document.querySelector('.gallery-header');
      if (gh) galleryMode(gh);
    }
    var d2 = document.getElementById('siteNavDrawer');
    if (d2 && /[?&]open=1/.test(location.search) && !d2.classList.contains('is-open')) {
      d2.classList.add('is-open'); d2.setAttribute('aria-hidden', 'false');
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
