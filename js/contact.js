/* ===================================
   الصاج - المشوي — صفحة التواصل والتقييمات
   تفاعلات محلية فقط — لا تخزين مركزي ولا قاعدة بيانات (نسخة تجريبية)
   =================================== */
(function () {
    'use strict';

    var RD = (typeof window.RestaurantData !== 'undefined') ? window.RestaurantData : null;

    function esc(v) {
        return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }
    function digitsOf(v) { return String(v || '').replace(/\D/g, ''); }

    /* ===== 1) ملخص التقييمات: يُحسب من البطاقات المنشورة في الصفحة فقط ===== */
    var cards = [].slice.call(document.querySelectorAll('#reviewsGrid .review-card[data-stars]'));
    var avgEl = document.getElementById('ratingNum');
    if (avgEl && cards.length) {
        var sum = 0, dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        cards.forEach(function (c) {
            var s = parseInt(c.getAttribute('data-stars'), 10) || 0;
            sum += s;
            if (dist[s] != null) dist[s]++;
        });
        var avg = (sum / cards.length).toFixed(1);
        avgEl.textContent = avg;
        var full = Math.round(parseFloat(avg));
        var starsEl = document.getElementById('ratingStars');
        if (starsEl) {
            starsEl.innerHTML = '★★★★★'.slice(0, full) +
                '<span class="stars-dim">' + '★★★★★'.slice(0, 5 - full) + '</span>';
        }
        var countEl = document.getElementById('ratingCount');
        if (countEl) {
            countEl.textContent = 'متوسط ' + avg + ' من 5 — مبني على ' + cards.length +
                ' تقييمًا منشورًا رسميًا (حصرًا)';
        }
        var distEl = document.getElementById('ratingDist');
        if (distEl) {
            var html = '';
            for (var s = 5; s >= 1; s--) {
                var n = dist[s];
                var pct = Math.round((n / cards.length) * 100);
                html += '<div class="dist-row"><span>' + s + ' ★</span>' +
                    '<div class="dist-bar"><i style="width:' + pct + '%"></i></div>' +
                    '<em>' + n + '</em></div>';
            }
            distEl.innerHTML = html;
        }
    }

    /* ===== 2) تجربة كتابة تقييم (محلي فقط — لا يحفظ ولا ينشر) ===== */
    var starWrap = document.getElementById('starsInput');
    var starHint = document.getElementById('starHint');
    var selectedStars = 0;
    if (starWrap) {
        var opts = [].slice.call(starWrap.querySelectorAll('.star-opt'));
        function paint(n) {
            opts.forEach(function (o, i) { o.classList.toggle('is-active', i < n); });
        }
        opts.forEach(function (o) {
            var input = o.querySelector('input');
            input.addEventListener('change', function () {
                selectedStars = parseInt(input.value, 10) || 0;
                paint(selectedStars);
                if (starHint) starHint.textContent = 'اخترت ' + selectedStars + ' من 5 — شكرًا لك';
            });
        });
    }

    var demoMsg = document.getElementById('demoMsg');
    var demoName = document.getElementById('demoName');
    var demoErr = document.getElementById('demoError');
    var demoBtn = document.getElementById('demoSubmit');
    if (demoBtn) {
        demoBtn.addEventListener('click', function () {
            var msg = (demoMsg && demoMsg.value || '').trim();
            if (!selectedStars) { showDemoError('الرجاء اختيار عدد النجوم أولًا.'); return; }
            if (msg.length < 10) { showDemoError('اكتب رأيًا من 10 أحرف على الأقل لتجربة المعاينة.'); return; }
            hideDemoError();
            var name = (demoName && demoName.value || '').trim();
            var grid = document.getElementById('reviewsGrid');
            var el = document.createElement('article');
            el.className = 'review-card card demo-card';
            el.innerHTML =
                '<span class="demo-chip">مثال تفاعلي — لم يُحفظ ولم يُرسل</span>' +
                '<div class="review-header">' +
                '<h3 class="review-author">' + esc(name || 'زائر') + '</h3>' +
                '<span class="review-stars" aria-label="' + selectedStars + ' نجوم">' +
                '★★★★★'.slice(0, selectedStars) + '</span></div>' +
                '<p class="review-text">«' + esc(msg) + '»</p>';
            if (grid) grid.insertBefore(el, grid.firstChild);
            var note = document.getElementById('demoNote');
            if (note) {
                note.classList.add('ok');
                note.innerHTML = 'هكذا سيبدو تقييمك عند اعتماده مستقبلاً. في هذه النسخة التجريبية ' +
                    'لم يُحفظ أي شيء في نظام مركزي ولن يصل إلى المطعم — الربط والتخزين يحتاجان قرارًا وقناة فعلية.';
            }
            if (demoMsg) demoMsg.value = '';
            el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        });
    }
    function showDemoError(t) {
        if (!demoErr) return;
        demoErr.hidden = false; demoErr.textContent = t;
    }
    function hideDemoError() { if (demoErr) { demoErr.hidden = true; demoErr.textContent = ''; } }

    /* ===== 3) نموذج التواصل — تحقق + تسليم حقيقي عبر واتساب/بريد الزائر فقط ===== */
    var form = document.getElementById('contactForm');
    var cName = document.getElementById('cName');
    var cChannel = document.getElementById('cChannel');
    var cType = document.getElementById('cType');
    var cText = document.getElementById('cText');
    var waBtn = document.getElementById('waSendBtn');
    var mailBtn = document.getElementById('mailSendBtn');
    var formNote = document.getElementById('formResultNote');

    function setErr(id, text) {
        var e = document.getElementById(id);
        if (e) { e.textContent = text || ''; }
        return !text;
    }
    function markField(input, bad) {
        var f = input && input.closest('.field');
        if (f) f.classList.toggle('has-error', !!bad);
        if (input) input.setAttribute('aria-invalid', bad ? 'true' : 'false');
    }
    function validate() {
        var ok = true;
        var name = (cName && cName.value || '').trim();
        ok = setErr('errName', name.length < 2 ? 'فضلًا اكتب اسمك (حرفان على الأقل).' : '') && ok;
        markField(cName, name.length < 2);
        var ch = (cChannel && cChannel.value || '');
        ok = setErr('errChannel', ch ? '' : 'اختر وسيلة الرد المناسبة لك.') && ok;
        markField(cChannel, !ch);
        var tp = (cType && cType.value || '');
        ok = setErr('errType', tp ? '' : 'حدّد نوع الرسالة.') && ok;
        markField(cType, !tp);
        var txt = (cText && cText.value || '').trim();
        ok = setErr('errText', txt.length < 10 ? 'اكتب رسالتك (10 أحرف على الأقل).' : '') && ok;
        markField(cText, txt.length < 10);
        return { ok: ok, name: name, channel: ch, type: tp, text: txt };
    }
    function buildMessage(v) {
        return 'رسالة من موقع «الصاج - المشوي» (صفحة التواصل)' +
            '\nالاسم: ' + v.name +
            '\nنوع الرسالة: ' + v.type +
            '\nطريقة الرد المفضلة: ' + v.channel +
            '\n\n' + v.text;
    }
    function contactNumber() {
        return (RD && RD.contact && RD.contact.whatsapp) ? digitsOf(RD.contact.whatsapp) : '';
    }
    function contactEmail() {
        return (RD && RD.contact && RD.contact.email) ? RD.contact.email : '';
    }
    if (form) {
        form.addEventListener('submit', function (e) { e.preventDefault(); });
        if (waBtn) waBtn.addEventListener('click', function (e) {
            e.preventDefault();
            var v = validate(); if (!v.ok) return;
            var d = contactNumber();
            if (!d) { /* لا رقم معتمد: لا روابط وهمية */ return; }
            window.open('https://wa.me/' + d + '?text=' + encodeURIComponent(buildMessage(v)), '_blank', 'noopener');
            if (formNote) {
                formNote.classList.add('ok');
                formNote.innerHTML = 'فُتح واتساب برسالتك الجاهزة — الإرسال يتم من جهازك بعد ضغطتك في واتساب. ' +
                    'هذا الموقع التجريبي لا يخزّن الرسالة ولا يرسلها لوحده.';
            }
        });
        if (mailBtn) mailBtn.addEventListener('click', function (e) {
            e.preventDefault();
            var v = validate(); if (!v.ok) return;
            var m = contactEmail();
            if (!m) return;
            window.location.href = 'mailto:' + m +
                '?subject=' + encodeURIComponent('[' + v.type + '] من موقع الصاج المشوي — ' + v.name) +
                '&body=' + encodeURIComponent(buildMessage(v));
            if (formNote) {
                formNote.classList.add('ok');
                formNote.innerHTML = 'فُتح بريد جهازك بالرسالة الجاهزة للإرسال — الموقع نفسه لا يخزّن شيئًا.';
            }
        });
    }

    /* ===== 4) قنوات التواصل: من البيانات الرسمية فقط، دون روابط مخترعة ===== */
    var grid = document.getElementById('channelsGrid');
    if (grid && RD && RD.contact) {
        var C = RD.contact, out = [];
        if (C.phone) {
            out.push('<div class="channel card"><span class="channel-icon">📞</span><div><h3>الهاتف</h3>' +
                '<a href="tel:' + esc(C.phone) + '" dir="ltr">' + esc(C.phone) + '</a></div></div>');
        }
        var wd = digitsOf(C.whatsapp);
        if (wd) {
            out.push('<div class="channel card"><span class="channel-icon">💬</span><div><h3>واتساب</h3>' +
                '<a href="https://wa.me/' + wd + '" target="_blank" rel="noopener" dir="ltr">' +
                esc(C.whatsapp) + '</a></div></div>');
        }
        if (C.email) {
            out.push('<div class="channel card"><span class="channel-icon">✉️</span><div><h3>البريد الإلكتروني</h3>' +
                '<a href="mailto:' + esc(C.email) + '" dir="ltr">' + esc(C.email) + '</a></div></div>');
        }
        if (C.address) {
            out.push('<div class="channel card"><span class="channel-icon">📍</span><div><h3>العنوان</h3>' +
                '<p>' + esc(C.address).replace(/،/g, '،<br>') + '</p>' +
                '<p style="color:rgba(255,255,255,.45);font-size:.78rem;font-weight:400;margin-top:.3rem">رابط الخريطة سيُضاف عند اعتماده رسميًا</p></div></div>');
        }
        if (C.hours) {
            out.push('<div class="channel card"><span class="channel-icon">🕐</span><div><h3>ساعات العمل</h3>' +
                '<p>' + esc(C.hours) + '</p></div></div>');
        }
        var socials = (RD.social || []).filter(function (s) { return s && s.label; });
        if (socials.length) {
            var chips = socials.map(function (s) {
                if (s.url && /^http/.test(String(s.url))) {
                    return '<a class="social-chip" style="border-style:solid;color:#fff" href="' + esc(s.url) +
                        '" target="_blank" rel="noopener noreferrer">' + esc(s.label) + '</a>';
                }
                return '<span class="social-chip" aria-disabled="true" title="غير مفعّل حاليًا">' +
                    esc(s.label) + ' — قريبًا</span>';
            }).join('');
            out.push('<div class="channel card is-off"><span class="channel-icon">✨</span><div>' +
                '<h3>حسابات التواصل الاجتماعي</h3><div class="social-row">' + chips + '</div></div></div>');
        }
        grid.innerHTML = out.join('');
    }
})();
