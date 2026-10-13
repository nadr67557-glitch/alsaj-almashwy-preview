/* ===================================
   الصاج - المشوي
   Main JavaScript
   =================================== */
(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ===== 1. Hero Video =====
    const heroVideo = document.querySelector('.hero-video');
    if (heroVideo) {
        if (prefersReducedMotion) {
            heroVideo.pause();
            heroVideo.removeAttribute('autoplay');
            heroVideo.currentTime = 0;
        } else {
            const playPromise = (typeof heroVideo.play === 'function') ? heroVideo.play() : undefined;
            if (playPromise !== undefined) {
                playPromise.catch(err => console.log('Video autoplay blocked:', err.message));
            }
        }
    }

    // ===== 1b. Hero Portrait Variant (mobile portrait only) =====
    const heroPortraitMQ = window.matchMedia('(max-width: 768px) and (orientation: portrait)');
    const HERO_ORIGINAL = 'videos/hero.mp4';
    const HERO_PORTRAIT = 'videos/hero-portrait.mp4';

    // حالة صوت الجمر (جوال عمودي فقط، تفعيل بلمسة المستخدم)
    const heroSoundBtn = document.getElementById('heroSoundBtn');
    let heroSoundOn = false;

    function updateHeroSoundUI() {
        if (!heroSoundBtn) return;
        heroSoundBtn.classList.toggle('is-on', heroSoundOn);
        heroSoundBtn.setAttribute('aria-pressed', heroSoundOn ? 'true' : 'false');
        heroSoundBtn.setAttribute('aria-label', heroSoundOn ? 'كتم صوت الجمر' : 'تشغيل صوت الجمر');
    }

    function applyHeroSoundState(isPortrait) {
        if (!heroVideo) return;
        const wantMuted = !(heroSoundOn && isPortrait);
        if (heroVideo.muted !== wantMuted) heroVideo.muted = wantMuted;
        updateHeroSoundUI();
    }

    function toggleHeroSound() {
        if (!heroVideo) return;
        if (!heroSoundOn) {
            heroVideo.muted = false;
            if (heroVideo.paused && !prefersReducedMotion) {
                const p = heroVideo.play();
                if (p && typeof p.catch === 'function') {
                    p.catch(function () {
                        heroVideo.muted = true;
                        heroSoundOn = false;
                        updateHeroSoundUI();
                    });
                }
            }
            heroSoundOn = true;
        } else {
            heroVideo.muted = true;
            heroSoundOn = false;
        }
        updateHeroSoundUI();
    }

    function syncHeroVariant() {
        if (!heroVideo) return;
        const cur = (heroVideo.currentSrc || heroVideo.getAttribute('src') || '').split('?')[0];
        const want = heroPortraitMQ.matches ? HERO_PORTRAIT : HERO_ORIGINAL;
        if (cur.indexOf(want) === -1) {
            const t = heroVideo.currentTime || 0;
            heroVideo.src = want;
            heroVideo.load();
            heroVideo.currentTime = t;
            if (!prefersReducedMotion) {
                const p = heroVideo.play();
                if (p && typeof p.catch === 'function') p.catch(function () {});
            }
            applyHeroSoundState(heroPortraitMQ.matches);
        }
    }

    if (heroVideo) {
        heroVideo.addEventListener('error', function () {
            if ((heroVideo.src || '').indexOf(HERO_PORTRAIT) > -1) {
                heroVideo.src = HERO_ORIGINAL;
                heroVideo.load();
                if (!prefersReducedMotion) {
                    const p = heroVideo.play();
                    if (p && typeof p.catch === 'function') p.catch(function () {});
                }
                heroSoundOn = false;
                heroVideo.muted = true;
                updateHeroSoundUI();
            }
        });
        syncHeroVariant();
        if (heroPortraitMQ.addEventListener) heroPortraitMQ.addEventListener('change', syncHeroVariant);
    }

    if (heroSoundBtn) {
        heroSoundBtn.addEventListener('click', toggleHeroSound);
    }
    updateHeroSoundUI();

    // ===== 2. Smooth scroll for Hero CTA =====
    const ctaButton = document.querySelector('.hero-cta');
    if (ctaButton) {
        ctaButton.addEventListener('click', function(e) {
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
            }
        });
    }

    // ===== 3. المنيو الحقيقي — مصدر وحيد: window.RestaurantData =====
    const MENU_DATA = window.RestaurantData || null;

    function menuEsc(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    var IMG_PH_HTML = '<span class="menu-image-placeholder" aria-hidden="true"><span>الصورة قريبًا</span><em>ننتظر الصورة الأصلية</em></span>';

    // قرار معتمد: المنتجات متعددة الأسعار تُعرض ويُحسب لها أعلى سعر فقط.
    // prices[] الأصلية تبقى داخل RestaurantData كما هي — لا تعديل ولا حذف.
    function maxOf(prices) {
        var nums = prices.map(Number).filter(function (n) { return Number.isFinite(n); });
        return nums.length ? Math.max.apply(null, nums) : null;
    }

    function menuPriceText(item) {
        if (!item) return '';
        if (item.price != null && String(item.price).trim() !== '') {
            return menuEsc(item.price) + ' ر.س';
        }
        if (Array.isArray(item.prices) && item.prices.length) {
            var top = maxOf(item.prices);
            if (top !== null) return menuEsc(top) + ' ر.س';
        }
        return '';
    }

    var currentActiveCategoryId = null;
    var renderCategoryItemsList = null;

    if (MENU_DATA && Array.isArray(MENU_DATA.menuItems) && MENU_DATA.menuItems.length) {
        function menuImageStyle(item) {
            if (!item.image || String(item.image).trim() === '') return '';
            return ' style="background-image: url(\'' + menuEsc(item.image) + '\');"';
        }

        // بلايسهولر احترافي عند غياب الصورة — لا طلب ملف ولا 404؛ يختفي تلقائيًا عند وجود image حقيقي
        function menuImagePlaceholder(item) {
            if (item.image && String(item.image).trim() !== '') return '';
            return IMG_PH_HTML;
        }

        function menuDescHtml(item) {
            var parts = [];
            if (item.description && String(item.description).trim() !== '') parts.push(String(item.description));
            if (item.calories != null && String(item.calories).trim() !== '') parts.push(item.calories + ' سعرة');
            if (!parts.length) return '';
            return '<p class="menu-item-desc">' + menuEsc(parts.join(' — ')) + '</p>';
        }

        // ===== 3a. نموذج المنيو المعتمد: التصنيفات الـ12 والقائمة المضغوطة =====
        // الصور الحقيقية المؤكدة فقط للتصنيفات من بيانات المشروع الفعلية — بلا تخمين وبلا صور بديلة
        var CONFIRMED_CATEGORY_IMAGES = {
            'pizza': 'images/menu/batch02-photo-12.jpg',    // بيتزا ببروني (pizza-23)
            'brost': 'images/menu/batch03-photo-07.jpg',    // بروست عادي (brost-1)
            'shawarma': 'images/menu/batch05-photo-05.jpg', // شاورما عربي مكسيكي (shawarma-17)
            'grills': 'images/menu/batch04-photo-01.jpg',   // كباب دجاج (grills-2)
            'potatoes': 'images/menu/batch05-photo-03.jpg'  // بطاط كرسي (potatoes-2)
        };

        function getCartItemQty(itemId) {
            if (!cart || !Array.isArray(cart)) return 0;
            var found = cart.find(function (c) { return c && c.product && c.product.id === itemId; });
            return found ? (found.quantity || 0) : 0;
        }

        function renderCategoriesGrid() {
            var grid = document.getElementById('categoriesGrid');
            if (!grid || !Array.isArray(MENU_DATA.categories)) return;

            var counts = {};
            MENU_DATA.menuItems.forEach(function (it) {
                if (it && it.category) {
                    counts[it.category] = (counts[it.category] || 0) + 1;
                }
            });

            grid.innerHTML = MENU_DATA.categories.map(function (cat) {
                var count = counts[cat.id] || 0;
                var confirmedImg = CONFIRMED_CATEGORY_IMAGES[cat.id] || null;
                var mediaHtml = '';

                if (confirmedImg) {
                    mediaHtml = '<div class="category-card-media has-image">' +
                        '<img src="' + menuEsc(confirmedImg) + '" alt="' + menuEsc(cat.name) + '" loading="lazy" class="category-card-img">' +
                        '<div class="category-card-overlay"></div>' +
                    '</div>';
                } else {
                    mediaHtml = '<div class="category-card-media no-image">' +
                        '<div class="category-card-pattern" aria-hidden="true"></div>' +
                    '</div>';
                }

                return '<article class="category-card" data-category-id="' + menuEsc(cat.id) + '" role="button" tabindex="0" aria-label="تصفح تصنيف ' + menuEsc(cat.name) + '">' +
                    mediaHtml +
                    '<div class="category-card-body">' +
                        '<div class="category-card-meta">' +
                            '<h3 class="category-card-name">' + menuEsc(cat.name) + '</h3>' +
                            '<span class="category-card-count">' + count + ' صنفًا</span>' +
                        '</div>' +
                        '<button type="button" class="category-card-btn" data-category-id="' + menuEsc(cat.id) + '">' +
                            '<span>تصفح التصنيف</span>' +
                            '<span class="btn-arrow" aria-hidden="true">‹</span>' +
                        '</button>' +
                    '</div>' +
                '</article>';
            }).join('');
        }

        renderCategoryItemsList = function(catId) {
            var list = document.getElementById('categoryItemsList');
            if (!list) return;

            var items = MENU_DATA.menuItems.filter(function (it) {
                return it && it.category === catId;
            });

            if (!items.length) {
                list.innerHTML = '<div class="empty-category-msg">لا توجد أصناف في هذا التصنيف حاليًا.</div>';
                return;
            }

            list.innerHTML = items.map(function (item) {
                var inCartQty = getCartItemQty(item.id);
                var priceText = menuPriceText(item) || '—';

                var descParts = [];
                if (item.description && String(item.description).trim() !== '') {
                    descParts.push(String(item.description));
                }
                if (item.calories != null && String(item.calories).trim() !== '') {
                    descParts.push(item.calories + ' سعرة');
                }
                var descHtml = descParts.length
                    ? '<p class="compact-item-desc">' + menuEsc(descParts.join(' — ')) + '</p>'
                    : '';

                // صورة مؤكدة فقط للصنف الحقيقي — بلا أي بلايسهولر أو صور بديلة
                var thumbHtml = '';
                if (item.image && String(item.image).trim() !== '') {
                    thumbHtml = '<img src="' + menuEsc(item.image) + '" alt="' + menuEsc(item.name || '') + '" class="compact-item-thumb" loading="lazy">';
                }

                var stepperHtml = '';
                if (inCartQty > 0) {
                    stepperHtml = '<div class="compact-qty-control" data-item-id="' + menuEsc(item.id) + '">' +
                        '<button type="button" class="compact-qty-btn" data-action="dec" data-item-id="' + menuEsc(item.id) + '" aria-label="إنقاص الكمية">−</button>' +
                        '<span class="compact-qty-val">' + inCartQty + '</span>' +
                        '<button type="button" class="compact-qty-btn" data-action="inc" data-item-id="' + menuEsc(item.id) + '" aria-label="زيادة الكمية">+</button>' +
                    '</div>';
                } else {
                    stepperHtml = '<button type="button" class="compact-add-btn" data-action="add" data-item-id="' + menuEsc(item.id) + '" aria-label="إضافة ' + menuEsc(item.name || '') + ' للسلة">' +
                        '<span class="btn-plus" aria-hidden="true">+</span>' +
                        '<span>للسلة</span>' +
                    '</button>';
                }

                return '<article class="compact-menu-item" data-item-id="' + menuEsc(item.id) + '">' +
                    thumbHtml +
                    '<div class="compact-item-content">' +
                        '<div class="compact-item-info" role="button" tabindex="0" title="اضغط لعرض تفاصيل الصنف">' +
                            '<h4 class="compact-item-name">' + menuEsc(item.name || '') + '</h4>' +
                            descHtml +
                        '</div>' +
                        '<div class="compact-item-actions">' +
                            '<span class="compact-item-price">' + menuEsc(priceText) + '</span>' +
                            '<div class="compact-item-stepper-wrap">' + stepperHtml + '</div>' +
                        '</div>' +
                    '</div>' +
                '</article>';
            }).join('');
        };

        function showCategoryView(catId, updateHash) {
            if (!catId || !Array.isArray(MENU_DATA.categories)) return;
            var cat = MENU_DATA.categories.find(function (c) {
                return c.id === catId || c.name === catId;
            });
            if (!cat) {
                showCategoriesOverview(true);
                return;
            }

            currentActiveCategoryId = cat.id;

            var catView = document.getElementById('categoriesView');
            var detailView = document.getElementById('categoryDetailView');
            var titleEl = document.getElementById('categoryDetailTitle');
            var countEl = document.getElementById('categoryDetailCount');

            if (catView) catView.hidden = true;
            if (detailView) detailView.hidden = false;

            var count = MENU_DATA.menuItems.filter(function (it) { return it && it.category === cat.id; }).length;
            if (titleEl) titleEl.textContent = cat.name;
            if (countEl) countEl.textContent = count + ' صنفًا';

            renderCategoryItemsList(cat.id);

            var noteBox = document.getElementById('categoryNoteBox');
            if (noteBox) {
                if (cat.id === 'pizza' && MENU_DATA.sections && MENU_DATA.sections.pizza && MENU_DATA.sections.pizza.pizzaCategoryNote) {
                    var pn = MENU_DATA.sections.pizza.pizzaCategoryNote;
                    noteBox.hidden = false;
                    noteBox.innerHTML = '<p class="category-note-text">🍕 ' + menuEsc(pn.doughNote || '') + ' | ' + menuEsc(pn.edgesCheeseNote || '') + '</p>';
                } else {
                    noteBox.hidden = true;
                    noteBox.innerHTML = '';
                }
            }

            if (updateHash !== false) {
                if (window.location.hash !== '#' + cat.id) {
                    history.pushState({ categoryId: cat.id }, '', '#' + cat.id);
                }
            }

            var menuSection = document.getElementById('menu');
            if (menuSection) {
                menuSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }

        function showCategoriesOverview(updateHash) {
            currentActiveCategoryId = null;

            var catView = document.getElementById('categoriesView');
            var detailView = document.getElementById('categoryDetailView');

            if (detailView) detailView.hidden = true;
            if (catView) catView.hidden = false;

            if (updateHash !== false) {
                if (window.location.hash) {
                    history.pushState(null, '', window.location.pathname + window.location.search);
                }
            }

            var menuSection = document.getElementById('menu');
            if (menuSection) {
                menuSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }

        function findCategoryByHash(hashStr) {
            if (!hashStr || !Array.isArray(MENU_DATA.categories)) return null;
            var raw = hashStr.replace(/^#/, '').trim();
            var decoded = '';
            try { decoded = decodeURIComponent(raw); } catch (e) { decoded = raw; }
            var norm = function(s) {
                return String(s || '').trim().toLowerCase().replace(/^ال/, '').replace(/[\s\-_]+/g, '');
            };
            var target = norm(decoded);
            var targetRaw = norm(raw);
            return MENU_DATA.categories.find(function (c) {
                return c.id.toLowerCase() === raw.toLowerCase() ||
                       c.name === decoded ||
                       c.name === raw ||
                       norm(c.id) === target ||
                       norm(c.id) === targetRaw ||
                       norm(c.name) === target ||
                       norm(c.name) === targetRaw;
            }) || null;
        }

        function checkHashRoute() {
            var rawHash = window.location.hash;
            if (!rawHash || rawHash === '#') {
                showCategoriesOverview(false);
                return;
            }
            var matchedCat = findCategoryByHash(rawHash);
            if (matchedCat) {
                showCategoryView(matchedCat.id, false);
            } else {
                showCategoriesOverview(false);
            }
        }

        // تهيئة واجهة المنيو
        renderCategoriesGrid();
        checkHashRoute();

        window.addEventListener('hashchange', checkHashRoute);
        window.addEventListener('popstate', checkHashRoute);

        var backBtn = document.getElementById('backToCategoriesBtn');
        if (backBtn) {
            backBtn.addEventListener('click', function (e) {
                e.preventDefault();
                showCategoriesOverview(true);
            });
        }

        var categoriesGridEl = document.getElementById('categoriesGrid');
        if (categoriesGridEl) {
            categoriesGridEl.addEventListener('click', function (e) {
                var card = e.target.closest('[data-category-id]');
                if (!card) return;
                var catId = card.getAttribute('data-category-id');
                if (catId) showCategoryView(catId, true);
            });
            categoriesGridEl.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    var card = e.target.closest('[data-category-id]');
                    if (card) {
                        e.preventDefault();
                        var catId = card.getAttribute('data-category-id');
                        if (catId) showCategoryView(catId, true);
                    }
                }
            });
        }

        // معالجة أزرار القائمة المضغوطة (إضافة / زيادة / إنقاص)
        var categoryItemsListEl = document.getElementById('categoryItemsList');
        if (categoryItemsListEl) {
            categoryItemsListEl.addEventListener('click', function (e) {
                var btn = e.target.closest('button[data-action]');
                if (!btn) return;
                e.stopPropagation();
                e.preventDefault();
                var action = btn.getAttribute('data-action');
                var itemId = btn.getAttribute('data-item-id');
                var prod = findProductById(itemId);
                if (!prod) return;

                var existing = cart.find(function (c) { return c && c.product && c.product.id === prod.id; });

                if (action === 'add') {
                    if (existing) {
                        existing.quantity += 1;
                    } else {
                        cart.push({ product: prod, quantity: 1 });
                    }
                } else if (action === 'inc') {
                    if (existing) existing.quantity += 1;
                    else cart.push({ product: prod, quantity: 1 });
                } else if (action === 'dec') {
                    if (existing) {
                        existing.quantity -= 1;
                        if (existing.quantity <= 0) {
                            cart = cart.filter(function (c) { return c && c.product && c.product.id !== prod.id; });
                        }
                    }
                }

                saveCartToStorage();
                updateCartBadges();
                renderCart();
                if (currentActiveCategoryId && typeof renderCategoryItemsList === 'function') {
                    renderCategoryItemsList(currentActiveCategoryId);
                }
            });
        }

        // ===== 3b. «أبرز الأطباق» — 8 معرفات معتمدة فقط من data.js =====
        var FEATURED_IDS = ['grills-2','grills-5','brost-1','potatoes-6','brost-12','pizza-30','shawarma-17','pizza-21'];

        function renderFeaturedDishes() {
            var grid = document.getElementById('featuredGrid');
            if (!grid) return;
            grid.innerHTML = FEATURED_IDS.map(function (fid) {
                return MENU_DATA.menuItems.find(function (item) { return item.id === fid; });
            }).filter(Boolean).map(function (item) {
                var cal = (item.calories != null && String(item.calories).trim() !== '')
                    ? '<p class="menu-item-desc">' + menuEsc(item.calories) + ' سعرة</p>' : '';
                return '<article class="dish-card" data-item-id="' + menuEsc(item.id) + '">' +
                    '<div class="dish-image"' + menuImageStyle(item) + '>' + menuImagePlaceholder(item) +
                        '<span class="dish-badge">مميز</span>' +
                    '</div>' +
                    '<div class="dish-info">' +
                        '<h3 class="dish-name">' + menuEsc(item.name || '') + '</h3>' +
                        '<p class="dish-price">' + (menuPriceText(item) || '—') + '</p>' +
                        cal +
                        '<button class="dish-add-btn" type="button">' +
                            '<span>أضف للسلة</span><span class="btn-icon">+</span>' +
                        '</button>' +
                    '</div></article>';
            }).join('');
        }

        renderFeaturedDishes();

        // ===== 3c. الخدمات — تُولَّد من MENU_DATA.services فقط، بلا خدمات مخترعة =====
        // SERVICE_IMAGES_READY: تم اعتماد وتعيين الصور الفعلية للخدمات الأربع
        var SERVICE_IMAGES_READY = ['service-1', 'service-2', 'service-3', 'service-4'];
        var SERVICE_IMAGES_BY_NAME = {
            'الشواء على الصاج': 'images/services/service-1.jpg',
            'الطلب السريع': 'images/services/service-2.jpg',
            'التوصيل': 'images/services/service-3.jpg',
            'الحجوزات': 'images/services/service-4.jpg'
        };

        function getServiceImage(item) {
            if (item && item.name && SERVICE_IMAGES_BY_NAME[item.name]) {
                return SERVICE_IMAGES_BY_NAME[item.name];
            }
            return item ? item.image : '';
        }

        function serviceImageStyle(item) {
            var imgSrc = getServiceImage(item);
            if (imgSrc && SERVICE_IMAGES_READY.indexOf(item.id) !== -1) {
                return ' style="background-image: url(\'' + menuEsc(imgSrc) + '\');"';
            }
            return '';
        }

        function renderServices() {
            var grid = document.getElementById('servicesGrid');
            if (!grid || !Array.isArray(MENU_DATA.services)) return;
            grid.innerHTML = MENU_DATA.services.map(function (item) {
                var visual = (SERVICE_IMAGES_READY.indexOf(item.id) !== -1) ? getServiceImage(item) : null;
                return '<div class="service-card" data-service-id="' + menuEsc(item.id || '') + '">' +
                    '<div class="service-image"' + serviceImageStyle(item) + '>' + menuImagePlaceholder({ image: visual }) + '</div>' +
                    '<h3 class="service-name">' + menuEsc(item.name || '') + '</h3>' +
                '</div>';
            }).join('');
        }

        renderServices();
    } else {
        // وضع احتياطي (بلا بيانات محمّلة): نفس منطق الفلترة السابق على البطاقات الثابتة
        const categoryBtns = document.querySelectorAll('.category-btn');
        const menuItems = document.querySelectorAll('.menu-item');
        categoryBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                categoryBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                const category = this.dataset.category;
                menuItems.forEach(item => {
                    if (category === 'all' || item.dataset.category === category) {
                        item.style.display = '';
                    } else {
                        item.style.display = 'none';
                    }
                });
            });
        });
    }

    // ===== 4. Cart System (Standalone cart.html + localStorage persistence) =====
    const CART_STORAGE_KEY = 'alsaj_cart_items';
    const cartBody = document.getElementById('cartBody');
    const cartTotal = document.getElementById('cartTotal');
    const cartCheckout = document.getElementById('cartCheckout');
    const branchSelect = document.getElementById('branchSelect');

    function findProductById(id) {
        if (!id) return null;
        if (MENU_DATA && Array.isArray(MENU_DATA.menuItems)) {
            return MENU_DATA.menuItems.find(function(p) { return p && p.id === id; }) || null;
        }
        return null;
    }

    function loadCartFromStorage() {
        try {
            var raw = localStorage.getItem(CART_STORAGE_KEY);
            if (!raw) return [];
            var parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [];
            var loaded = [];
            parsed.forEach(function (entry) {
                if (!entry || !entry.id) return;
                var prod = findProductById(entry.id);
                if (prod) {
                    var q = parseInt(entry.quantity, 10);
                    loaded.push({ product: prod, quantity: (Number.isFinite(q) && q > 0) ? q : 1 });
                }
            });
            return loaded;
        } catch (e) {
            return [];
        }
    }

    function saveCartToStorage() {
        try {
            var minimal = cart.map(function (item) {
                var p = item && item.product;
                return {
                    id: p ? p.id : '',
                    quantity: item.quantity || 1
                };
            }).filter(function (item) {
                return item.id && item.quantity > 0;
            });
            localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(minimal));
        } catch (e) {}
    }

    function updateCartBadges() {
        var totalCount = cart.reduce(function (sum, item) {
            return sum + (item.quantity || 0);
        }, 0);
        var badges = document.querySelectorAll('.nav-cart-badge, #navCartBadge, #cartFabCount');
        badges.forEach(function (b) {
            b.textContent = String(totalCount);
        });
    }

    let cart = loadCartFromStorage();

    // بطاقة/زر المنيو أو بطاقة «أبرز الأطباق» → فتح Modal ببيانات الصنف الحقيقي
    document.addEventListener('click', function(e) {
        if (e.target.closest('button[data-action], .compact-qty-control, .category-card, .back-to-categories-btn')) return;
        var btn = e.target.closest('.dish-add-btn, .menu-item-add');
        var card = e.target.closest('[data-item-id]');
        if (!btn && !card) return;
        e.preventDefault();
        var itemId = card ? card.getAttribute('data-item-id') : null;
        var product = null;
        if (itemId && MENU_DATA && Array.isArray(MENU_DATA.menuItems)) {
            product = MENU_DATA.menuItems.find(function (item) { return item.id === itemId; }) || null;
        }
        openProductModal(product);
    });

    // سعر وحدة رقمي آمن: price المفرد فقط؛ المتعدد يبقى غير محسوب — بلا اختيار تلقائي
    function unitPriceNumber(entry) {
        var p = entry && entry.product;
        if (!p) return null;
        if (p.price != null && String(p.price).trim() !== '') {
            var n = Number(p.price);
            if (Number.isFinite(n) && n > 0) return n;
        }
        if (Array.isArray(p.prices) && p.prices.length) {
            var top = maxOf(p.prices); // أعلى سعر
            if (top !== null) return top;
        }
        return null;
    }

    function renderCart() {
        updateCartBadges();
        if (!cartBody) return;

        if (cart.length === 0) {
            cartBody.innerHTML = '<div class="cart-empty" style="text-align:center;padding:3rem 1rem;">' +
                '<p style="font-size:1.25rem;font-weight:700;color:#fff;margin-bottom:0.5rem;">سلتك فارغة حاليًا</p>' +
                '<p class="cart-empty-hint" style="color:rgba(255,255,255,0.6);margin-bottom:1.5rem;">أضف أطباقك المفضلة من المنيو</p>' +
                '<a href="menu.html" class="hero-cta" style="display:inline-block;padding:0.8rem 1.6rem;border-radius:999px;background:linear-gradient(135deg,#ff6b1a,#c81d1d);color:#fff;text-decoration:none;font-weight:700;"><span>تصفح المنيو</span></a>' +
            '</div>';
            if (cartCheckout) cartCheckout.disabled = true;
        } else {
            if (cartCheckout) cartCheckout.disabled = false;
            cartBody.innerHTML = cart.map(function (entry) {
                var p = entry.product || {};
                var id = menuEsc(p.id || '');
                var priceLine = menuPriceText(p) || '—';
                var n = unitPriceNumber(entry);
                var totalLine = n ? (n * entry.quantity) + ' ر.س' : '';

                var thumbHtml = '';
                if (p.image && String(p.image).trim() !== '') {
                    thumbHtml = '<img src="' + menuEsc(p.image) + '" alt="' + menuEsc(p.name || '') + '" style="width:58px;height:58px;border-radius:8px;object-fit:cover;border:1px solid rgba(255,107,26,0.3);flex-shrink:0;">';
                } else {
                    thumbHtml = '<div style="width:58px;height:58px;border-radius:8px;background:rgba(255,107,26,0.12);border:1px solid rgba(255,107,26,0.25);display:flex;align-items:center;justify-content:center;font-size:1.5rem;flex-shrink:0;">🍽️</div>';
                }

                var addonsHtml = '';
                if (Array.isArray(p.addons) && p.addons.length) {
                    addonsHtml = '<div style="font-size:0.82rem;color:rgba(255,255,255,0.65);margin:2px 0 4px;">إضافات: ' + menuEsc(p.addons.join('، ')) + '</div>';
                } else if (p.addons && typeof p.addons === 'string') {
                    addonsHtml = '<div style="font-size:0.82rem;color:rgba(255,255,255,0.65);margin:2px 0 4px;">إضافات: ' + menuEsc(p.addons) + '</div>';
                }

                return '<div class="cart-line" style="display:flex;align-items:center;gap:0.85rem;padding:0.9rem 0;border-bottom:1px solid rgba(255,255,255,0.08);flex-wrap:wrap;">' +
                    thumbHtml +
                    '<div style="flex:1;min-width:160px;">' +
                        '<p style="font-weight:700;font-size:1.02rem;margin:0 0 3px;word-break:break-word;color:#ffffff;">' + menuEsc(p.name || '') + '</p>' +
                        addonsHtml +
                        '<p style="color:#ff6b1a;font-weight:700;font-size:0.9rem;margin:0;">' + menuEsc(priceLine) + (totalLine ? ' = ' + menuEsc(totalLine) : '') + '</p>' +
                    '</div>' +
                    '<div class="qty-control" style="flex:none;display:flex;align-items:center;gap:4px;background:rgba(255,255,255,0.06);padding:3px 6px;border-radius:8px;">' +
                        '<button type="button" class="qty-btn" data-cart-dec="' + id + '" aria-label="إنقاص الكمية">−</button>' +
                        '<span class="qty-value">' + entry.quantity + '</span>' +
                        '<button type="button" class="qty-btn" data-cart-inc="' + id + '" aria-label="زيادة الكمية">+</button>' +
                    '</div>' +
                    '<button type="button" class="cart-line-del" data-cart-del="' + id + '" aria-label="حذف الصنف" style="font-size:1.1rem;font-weight:800;padding:0.4rem 0.6rem;background:rgba(200,29,29,0.2);border:1px solid rgba(200,29,29,0.4);border-radius:8px;color:#ff6b6b;cursor:pointer;line-height:1;">✕</button>' +
                '</div>';
            }).join('');
        }

        if (cartTotal) {
            cartTotal.textContent = cart.reduce((s, i) => {
                var n = unitPriceNumber(i);
                return s + (n ? n * i.quantity : 0);
            }, 0).toFixed(2);
        }
    }

    renderCart();
    updateCartBadges();

    // تحكم أسطر السلة (زيادة/نقص/حذف) — تفويض أحداث على الحاوية الموجودة
    if (cartBody) {
        cartBody.addEventListener('click', function (e) {
            var inc = e.target.closest('[data-cart-inc]');
            var dec = e.target.closest('[data-cart-dec]');
            var del = e.target.closest('[data-cart-del]');
            var pid = (inc || dec || del) ? (inc || dec || del).dataset[(inc ? 'cartInc' : dec ? 'cartDec' : 'cartDel')] : null;
            if (!pid) return;
            e.preventDefault();
            var entry = cart.find(function (x) { return x.product && x.product.id === pid; });
            if (!entry) return;

            if (inc) {
                entry.quantity += 1;
            } else if (dec) {
                entry.quantity = Math.max(1, entry.quantity - 1);
            } else if (del) {
                cart = cart.filter(function (x) { return x !== entry; });
            } else {
                return;
            }

            saveCartToStorage();
            updateCartBadges();
            renderCart();
        });
    }

    // ===== 4b. تعبئة قائمة الفروع داخل السلة من بيانات RestaurantData =====
    // لا إنشاء فروع ولا أرقام: فقط ما هو موجود داخل branches.
    function branchList() {
        var out = [];
        if (MENU_DATA && MENU_DATA.branches) {
            if (MENU_DATA.branches.main) out.push(MENU_DATA.branches.main);
            if (Array.isArray(MENU_DATA.branches.additional)) out = out.concat(MENU_DATA.branches.additional);
        }
        return out;
    }

    function renderBranchOptions() {
        if (!branchSelect) return;
        var branches = branchList();
        if (!branches.length) return;
        // يعاد بناء الخيارات فقط عند وجود فروع في البيانات؛ نص الـplaceholder كما هو في الصفحة
        branchSelect.innerHTML = '';
        var ph = document.createElement('option');
        ph.value = '';
        ph.textContent = '— اختر فرعاً —';
        branchSelect.appendChild(ph);
        branches.forEach(function (br) {
            if (!br || !br.id) return;
            var op = document.createElement('option');
            op.value = br.id;
            op.textContent = (br.name || '') + (br.city ? ' — ' + br.city : '');
            branchSelect.appendChild(op);
        });
    }

    renderBranchOptions();

    // الفرع النشط بصريًا — branch-main افتراضيًا عند التحميل (بيانات data.js كما هي)
    var selectedBranchId = 'branch-main';

    function renderBranches() {
        var grid = document.getElementById('branchesGrid');
        if (!grid) return;
        var branches = branchList();
        if (!branches.length) return;
        var sub = document.getElementById('branchesSubtitle');
        if (sub && branches[0].city && branches[0].address) {
            sub.textContent = branches[0].city + '، ' + branches[0].address;
        }
        grid.innerHTML = branches.map(function (br) {
            if (!br || !br.id) return '';
            var isMain = br.id === 'branch-main';
            var isActive = br.id === selectedBranchId;
            var actions = '';
            if (br.phone) {
                actions += '<a class="branch-btn branch-call" href="tel:' + menuEsc(br.phone) + '"><span>📞</span> اتصال</a>';
            }
            if (br.whatsapp) {
                var digits = String(br.whatsapp).replace(/\D/g, '');
                // لا اختراع أرقام: نستخدم القيمة كما هي في data.js
                if (digits) actions += '<a class="branch-btn branch-whatsapp" target="_blank" rel="noopener" href="https://wa.me/' + digits + '"><span>💬</span> واتساب</a>';
            }
            // زر الخريطة لا يظهر إطلاقًا ما لم يوجد mapUrl حقيقي في البيانات — بلا إنشاء روابط
            if (br.mapUrl) {
                actions += '<a class="branch-btn branch-map" target="_blank" rel="noopener" href="' + menuEsc(br.mapUrl) + '"><span>🗺️</span> الاتجاهات</a>';
            }
            // منطقة "الخريطة" بصرية فقط بالـCSS — لا صورة، لا GPS، لا خرائط خارجية
            return '<article class="branch-card' + (isMain ? ' branch-main' : '') + (isActive ? ' is-active' : '') + '"' +
                ' data-branch-id="' + menuEsc(br.id) + '" tabindex="0" role="button" aria-pressed="' + (isActive ? 'true' : 'false') + '">' +
                '<div class="branch-locate" aria-hidden="true"><span class="branch-pin"></span>' +
                    '<div class="branch-info-panel">' +
                        '<p class="branch-info-name">' + menuEsc(br.name || '') + '</p>' +
                        (br.phone ? '<p class="branch-info-phone" dir="ltr">' + menuEsc(br.phone) + '</p>' : '') +
                        (br.address ? '<p class="branch-info-address">' + menuEsc(br.address) + '</p>' : '') +
                    '</div>' +
                '</div>' +
                '<div class="branch-body">' +
                '<h3 class="branch-name">' + menuEsc(br.name || '') + '</h3>' +
                (br.address ? '<p class="branch-address">' + menuEsc(br.address) + '</p>' : '') +
                (actions ? '<div class="branch-actions">' + actions + '</div>' : '') +
                '</div>' +
            '</article>';
        }).join('');
    }

    renderBranches();

    // ===== اختيار الفرع النشط (بدون route / بدون تغيير URL — نفس الصفحة) =====
    function applyBranchActiveClass(id) {
        var cards = document.querySelectorAll('#branchesGrid .branch-card');
        for (var i = 0; i < cards.length; i++) {
            var on = cards[i].getAttribute('data-branch-id') === id;
            cards[i].classList.toggle('is-active', on);
            cards[i].setAttribute('aria-pressed', on ? 'true' : 'false');
        }
    }

    function selectBranch(id, opts) {
        if (!id) return;
        selectedBranchId = id;
        applyBranchActiveClass(id);
        // مزامنة آمنة مع قائمة الفرع في السلة: لا نلمس منطق checkout ولا الإرسال
        if (branchSelect && !(opts && opts.fromSelect)) {
            for (var j = 0; j < branchSelect.options.length; j++) {
                if (branchSelect.options[j].value === id) {
                    branchSelect.value = id;
                    break;
                }
            }
        }
    }

    var branchesGridEl = document.getElementById('branchesGrid');
    if (branchesGridEl) {
        branchesGridEl.addEventListener('click', function (e) {
            if (e.target.closest('a')) return; // اتصال/واتساب/اتجاهات لا تُعتبر اختيارًا
            var card = e.target.closest('.branch-card');
            if (card) selectBranch(card.getAttribute('data-branch-id'));
        });
        branchesGridEl.addEventListener('keydown', function (e) {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            var card = e.target.closest('.branch-card');
            if (!card) return;
            e.preventDefault();
            selectBranch(card.getAttribute('data-branch-id'));
        });
    }

    // عند تغيير القائمة المنسدلة في السلة تتحدث البطاقة النشطة فقط (منطق السلة كما هو)
    if (branchSelect) {
        branchSelect.addEventListener('change', function () {
            if (branchSelect.value) selectBranch(branchSelect.value, { fromSelect: true });
        });
    }

    // ===== 5. إرسال الطلب عبر واتساب =====
    if (cartCheckout) {
        cartCheckout.addEventListener('click', function() {
            var branchId = branchSelect ? branchSelect.value : '';

            if (cart.length === 0) {
                alert('السلة فارغة');
                return;
            }

            if (!branchId) {
                alert('الرجاء اختيار الفرع أولاً');
                return;
            }

            var branch = branchList().find(function (br) { return br && br.id === branchId; }) || null;

            // الرقم من بيانات الفرع المختار (whatsapp)، وإلا من بيانات التواصل المعتمدة — لا اختراع أرقام
            var raw = (branch && branch.whatsapp) ||
                      (MENU_DATA && MENU_DATA.contact && MENU_DATA.contact.whatsapp) || '';
            var phoneNumber = String(raw).replace(/\D/g, '');
            if (!phoneNumber) {
                alert('رقم واتساب هذا الفرع غير معتمد بعد.');
                return;
            }

            var lines = cart.map(function (entry) {
                var p = entry.product || {};
                return '• ' + (p.name || '') + ' × ' + entry.quantity + ' = ' + (menuPriceText(p) || '');
            });

            var parts = ['طلب جديد من موقع الصاج - المشوي', 'الفرع: ' + (branch && branch.name ? branch.name : branchId)]
                .concat(lines)
                .concat(['الإجمالي: ' + (cartTotal ? cartTotal.textContent : '0') + ' ر.س']);
            var orderNotesEl = document.getElementById('orderNotes');
            var notes = orderNotesEl ? orderNotesEl.value.trim() : '';
            if (notes) parts.push('ملاحظات: ' + notes);

            var message = encodeURIComponent(parts.join('\n'));

            window.open('https://wa.me/' + phoneNumber + '?text=' + message, '_blank');
        });
    }

    // ===== 5b. «تواصل معنا» ديناميكي — مصدر واحد: MENU_DATA.contact + MENU_DATA.social =====
    function renderContact() {
        var grid = document.getElementById('contactGrid');
        if (!grid || !MENU_DATA || !MENU_DATA.contact) return;
        var C = MENU_DATA.contact;
        var addressLines = C.address ? C.address.split('، ') : [];
        var cards = '';
        if (C.phone) {
            cards += '<div class="contact-item"><span class="contact-icon">📞</span><h3>الهاتف</h3>' +
                '<a href="tel:' + menuEsc(C.phone) + '" dir="ltr">' + menuEsc(C.phone) + '</a></div>';
        }
        if (C.whatsapp) {
            var wd = String(C.whatsapp).replace(/\D/g, '');
            if (wd) {
                cards += '<div class="contact-item"><span class="contact-icon">💬</span><h3>واتساب</h3>' +
                    '<a href="https://wa.me/' + wd + '" target="_blank" rel="noopener" dir="ltr">' + menuEsc(C.phone || wd) + '</a></div>';
            }
        }
        if (C.email) {
            cards += '<div class="contact-item"><span class="contact-icon">✉️</span><h3>البريد الإلكتروني</h3>' +
                '<a href="mailto:' + menuEsc(C.email) + '" dir="ltr">' + menuEsc(C.email) + '</a></div>';
        }
        if (addressLines.length) {
            cards += '<div class="contact-item"><span class="contact-icon"><span class="red-blinking-dot" aria-hidden="true"></span></span><h3>العنوان</h3>' +
                '<p>' + addressLines.map(function (line) { return menuEsc(line); }).join('<br>') + '</p></div>';
        }
        if (C.hours) {
            cards += '<div class="contact-item"><span class="contact-icon">🕐</span><h3>ساعات العمل</h3>' +
                '<p>' + menuEsc(C.hours) + '</p></div>';
        }
        grid.innerHTML = cards;
    }

    const SOCIAL_ICONS = {
        facebook: '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',
        snapchat: '<svg class="snapchat-ghost-svg" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path fill="#ffffff" stroke="#000000" stroke-width="1.3" stroke-linejoin="round" d="M12.001 3.2c-3.13 0-5.32 2.27-5.32 5.1 0 .68.16 1.35.34 1.88-.49.16-1.02.44-1.02 1 0 .54.46.93 1.02 1.05-.02.26-.03.54-.03.85 0 1.95 1.52 3.84 3.97 4.09-.34.22-.81.37-1.43.43-.53.05-.94.4-.78.9.14.45.72.6 1.36.43.82-.22 1.42-.54 1.9-.54.48 0 1.08.32 1.9.54.64.17 1.22.02 1.36-.43.16-.5-.25-.85-.78-.9-.62-.06-1.09-.21-1.43-.43 2.45-.25 3.97-2.14 3.97-4.09 0-.31-.01-.59-.03-.85.56-.12 1.02-.51 1.02-1.05 0-.56-.53-.84-1.02-1 .18-.53.34-1.2.34-1.88 0-2.83-2.19-5.1-5.32-5.1z"/></svg>',
        instagram: '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>',
        x: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>'
    };

    function renderSocial() {
        var wrap = document.getElementById('socialLinks');
        if (!wrap || !MENU_DATA || !Array.isArray(MENU_DATA.social)) return;
        wrap.innerHTML = MENU_DATA.social.map(function (s) {
            if (!s || !s.platform) return '';
            var key = String(s.platform).toLowerCase();
            var iconSvg = SOCIAL_ICONS[key] || '';
            var label = menuEsc(s.label || s.platform || '');
            var attr = 'class="social-link" data-platform="' + menuEsc(key) + '" aria-label="' + label + '" title="' + label + '"';
            // رابط معتمد إذا وُجد في البيانات، وبخلاف ذلك أيقونة غير مرتبطة مؤقتًا بدون روابط وهمية
            if (s.url && String(s.url).trim() !== '' && String(s.url).startsWith('http')) {
                return '<a href="' + menuEsc(s.url) + '" target="_blank" rel="noopener noreferrer" ' + attr + '>' + iconSvg + '</a>';
            } else {
                return '<span ' + attr + ' role="img">' + iconSvg + '</span>';
            }
        }).join('');
    }

    renderContact();
    renderSocial();

    // ===== 6. السنة الحالية في Footer =====
    const yearEl = document.getElementById('currentYear');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // ===== 7. Escape key لإغلاق السلة =====
    document.addEventListener('keydown', function(e) {
        // Cart drawer removed
    });

    // ===== 8. فتح/إغلاق Product Modal — هيكل فقط، بلا ربط بأي بيانات منتجات =====
    const productModal = document.getElementById('productModal');
    const modalBackdrop = document.getElementById('modalBackdrop');
    const modalClose = document.getElementById('modalClose');

    function openProductModal(product) {
        if (!productModal) return;
        pendingProduct = product || null; // المنتج الحقيقي الممرَّر — لا نسخة ولا بيانات Demo
        ensureModalEmpty();               // تنظيف كامل لكل فتحة (بما فيها حقول صنف سابق)
        if (pendingProduct) fillModalFromProduct(pendingProduct);
        setModalQty(1); // كل فتح يبدأ من 1 — منطق الكمية الحالي بلا تغيير
        productModal.setAttribute('aria-hidden', 'false');
        productModal.classList.add('is-open');
        document.body.style.overflow = 'hidden';
    }

    // يعرض المتوفر فقط: name، price أو prices كاملة، calories، image عند وجودها فقط — بلا اختراع
    function fillModalFromProduct(product) {
        if (!product || typeof product !== 'object') return;
        var name = document.getElementById('modalName');
        var desc = document.getElementById('modalDesc');
        var price = document.getElementById('modalPrice');
        var image = document.getElementById('modalImage');

        if (name) name.textContent = product.name != null ? String(product.name) : '';

        var descParts = [];
        if (product.description != null && String(product.description).trim() !== '') {
            descParts.push(String(product.description));
        }
        if (product.calories != null && String(product.calories).trim() !== '') {
            descParts.push(product.calories + ' سعرة');
        }
        if (desc) desc.textContent = descParts.length ? descParts.join(' — ') : '';

        if (price) price.textContent = menuPriceText(product);

        if (image) {
            var oldPh = image.querySelector('.menu-image-placeholder');
            if (oldPh) oldPh.remove();
            var img = (typeof product.image === 'string') ? product.image.trim() : '';
            if (img !== '') {
                image.style.backgroundImage = "url('" + img.replace(/'/g, "\\'") + "')";
            } else {
                image.insertAdjacentHTML('beforeend', IMG_PH_HTML);
                // null/فارغ ⇒ بلايسهولر داخل المودال أيضًا، بلا طلب ملف غير موجود
            }
        }
        // #modalAdditions يبقى مخفيًا: لا بيانات إضافات لكل صنف حاليًا في data.js
    }

    function ensureModalEmpty() {
        var image = document.getElementById('modalImage');
        var name = document.getElementById('modalName');
        var desc = document.getElementById('modalDesc');
        var price = document.getElementById('modalPrice');
        var additions = document.getElementById('modalAdditions');
        var qty = document.getElementById('qtyValue');
        if (image) {
            if (image.style.backgroundImage) image.style.backgroundImage = '';
            var ph = image.querySelector('.menu-image-placeholder');
            if (ph) ph.remove();
        }
        if (name && name.textContent) name.textContent = '';
        if (desc && desc.textContent) desc.textContent = '';
        if (price && price.textContent) price.textContent = '';
        if (additions && !additions.hidden) additions.hidden = true;
        if (qty && qty.textContent !== '1') qty.textContent = '1';
    }

    function closeProductModal() {
        if (!productModal) return;
        productModal.setAttribute('aria-hidden', 'true');
        productModal.classList.remove('is-open');
        document.body.style.overflow = '';
        pendingProduct = null;
    }

    // إغلاق النافذة عبر زر ×
    if (modalClose) {
        modalClose.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            closeProductModal();
        });
    }

    // إغلاق النافذة عند الضغط على الخلفية خارج محتوى النافذة
    if (modalBackdrop) {
        modalBackdrop.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            closeProductModal();
        });
    }

    // إغلاق النافذة بمفتاح Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && productModal && (productModal.classList.contains('is-open') || productModal.getAttribute('aria-hidden') === 'false')) {
            closeProductModal();
        }
    });

    // عدّاد الكمية داخل الـModal — بلا ربط بمنتج/سعر/سلة في هذه المرحلة
    function getModalQty() {
        var el = document.getElementById('qtyValue');
        var n = el ? parseInt(el.textContent, 10) : 1;
        return (Number.isFinite(n) && n >= 1) ? n : 1;
    }

    function setModalQty(n) {
        var el = document.getElementById('qtyValue');
        if (el) el.textContent = String(Math.max(1, n));
    }

    var qtyMinusBtn = document.getElementById('qtyMinus');
    var qtyPlusBtn = document.getElementById('qtyPlus');
    if (qtyPlusBtn) qtyPlusBtn.addEventListener('click', function() { setModalQty(getModalQty() + 1); });
    if (qtyMinusBtn) qtyMinusBtn.addEventListener('click', function() { setModalQty(getModalQty() - 1); });

    // ===== إضافة المنتج الحقيقي من الـModal إلى السلة =====
    const modalAddBtn = document.getElementById('modalAddBtn');
    var pendingProduct = null; // المنتج الحقيقي المحال من RestaurantData — لا نسخ ولا إعادة كتابة

    if (modalAddBtn) {
        modalAddBtn.addEventListener('click', function() {
            if (!pendingProduct) return;
            var quantity = getModalQty();
            var existing = cart.find(function (e) { return e.product && e.product.id === pendingProduct.id; });
            if (existing) existing.quantity += quantity;
            else cart.push({ product: pendingProduct, quantity: quantity });
            saveCartToStorage();
            updateCartBadges();
            renderCart();
            if (typeof renderCategoryItemsList === 'function' && currentActiveCategoryId) {
                renderCategoryItemsList(currentActiveCategoryId);
            }
            closeProductModal();
        });
    }
})();
