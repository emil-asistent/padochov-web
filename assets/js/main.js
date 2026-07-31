// REZIDENCE PADOCHOV — statický web
(function () {
  // --- Mobilní menu ---
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.main-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', nav.classList.contains('open'));
    });
    nav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { nav.classList.remove('open'); });
    });
  }

  // --- Hero slider (auto, jako původní auto="on") ---
  var hero = document.querySelector('.hero');
  if (hero) {
    var slides = Array.prototype.slice.call(hero.querySelectorAll('.hero__slide'));
    var dotsWrap = hero.querySelector('.hero__dots');
    var i = 0, timer;
    function show(n) {
      slides.forEach(function (s, idx) { s.classList.toggle('is-active', idx === n); });
      if (dotsWrap) Array.prototype.forEach.call(dotsWrap.children, function (d, idx) {
        d.classList.toggle('is-active', idx === n);
      });
      i = n;
    }
    if (slides.length > 1) {
      slides.forEach(function (_, idx) {
        var b = document.createElement('button');
        b.setAttribute('aria-label', 'Snímek ' + (idx + 1));
        b.addEventListener('click', function () { show(idx); restart(); });
        if (dotsWrap) dotsWrap.appendChild(b);
      });
      function next() { show((i + 1) % slides.length); }
      function restart() { clearInterval(timer); timer = setInterval(next, 6000); }
      restart();
    }
    show(0);
  }

  // --- Kontaktní formulář -> přímé odeslání na e-mail přes /api/contact (bez mailto) ---
  var contactForms = document.querySelectorAll('form[data-contact]');
  Array.prototype.forEach.call(contactForms, function (form) {
    var statusEl = form.querySelector('.form-status');
    var btn = form.querySelector('button[type=submit]') || form.querySelector('.btn');
    var btnText = btn ? btn.textContent : 'Odeslat poptávku';
    function setStatus(msg, kind) {
      if (!statusEl) return;
      statusEl.textContent = msg || '';
      statusEl.className = 'form-status' + (kind ? ' is-' + kind : '');
    }
    function val(n) { var el = form.querySelector('[name=' + n + ']'); return el ? el.value.trim() : ''; }
    // předvyplnění, o který dům jde (odkaz z detailu domu: /kontakt?dum=01)
    try {
      var dumParam = (new URLSearchParams(window.location.search)).get('dum') || '';
      if (/^0[1-6]$/.test(dumParam)) {
        var hidden = form.querySelector('input[name="dum"]');
        if (hidden) hidden.value = dumParam;
        var msgEl = form.querySelector('[name="message"]');
        if (msgEl && !msgEl.value) msgEl.value = 'Mám zájem o Dům ' + dumParam + '. ';
      }
    } catch (err) {}

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = val('name'), email = val('email');
      if (!name || !email) { setStatus('Vyplňte prosím jméno a e-mailovou adresu.', 'err'); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setStatus('Zkontrolujte prosím e-mailovou adresu.', 'err'); return; }
      var payload = { name: name, email: email, phone: val('telefon'), msg: val('message'), company: val('company'), dum: val('dum') };
      if (btn) { btn.disabled = true; btn.textContent = 'Odesílám…'; }
      setStatus('', '');
      fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return r.ok && j.ok; }); })
        .then(function (ok) {
          if (ok) {
            form.reset();
            setStatus('Děkujeme, poptávku jsme přijali. Brzy se vám ozveme.', 'ok');
          } else {
            setStatus('Odeslání se nepodařilo. Zkuste to prosím znovu, nebo napište na reality@cermakhonza.cz.', 'err');
          }
        })
        .catch(function () {
          setStatus('Odeslání se nepodařilo. Zkuste to prosím znovu, nebo napište na reality@cermakhonza.cz.', 'err');
        })
        .then(function () { if (btn) { btn.disabled = false; btn.textContent = btnText; } });
    });
  });

  // --- Lightbox galerie (rozklik fotek) ---
  var gImgs = Array.prototype.slice.call(document.querySelectorAll('.foto-hero, .galerie .g-item img'));
  if (gImgs.length) {
    var lb = document.createElement('div');
    lb.className = 'lb';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-label', 'Prohlížeč fotografií');
    lb.innerHTML =
      '<button class="lb__btn lb__close" aria-label="Zavřít"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
      '<button class="lb__btn lb__prev" aria-label="Předchozí"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></button>' +
      '<button class="lb__btn lb__next" aria-label="Další"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg></button>' +
      '<img class="lb__img" alt="">' +
      '<div class="lb__cap"><span class="lb__count"></span><span class="lb__text"></span></div>';
    document.body.appendChild(lb);
    var lbImg = lb.querySelector('.lb__img');
    var lbCount = lb.querySelector('.lb__count');
    var lbText = lb.querySelector('.lb__text');
    var cur = 0;
    function lbRender() {
      var im = gImgs[cur];
      lbImg.src = im.getAttribute('data-full') || im.currentSrc || im.src;
      lbImg.alt = im.alt || '';
      lbText.textContent = im.alt || '';
      lbCount.textContent = (cur + 1) + ' / ' + gImgs.length;
    }
    function lbOpen(n) { cur = n; lbRender(); lb.classList.add('is-open'); document.body.classList.add('lb-open'); }
    function lbClose() { lb.classList.remove('is-open'); document.body.classList.remove('lb-open'); }
    function lbGo(d) { cur = (cur + d + gImgs.length) % gImgs.length; lbRender(); }
    gImgs.forEach(function (im, idx) {
      im.addEventListener('click', function () { lbOpen(idx); });
    });
    lb.querySelector('.lb__close').addEventListener('click', lbClose);
    lb.querySelector('.lb__prev').addEventListener('click', function (e) { e.stopPropagation(); lbGo(-1); });
    lb.querySelector('.lb__next').addEventListener('click', function (e) { e.stopPropagation(); lbGo(1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) lbClose(); });
    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') lbClose();
      else if (e.key === 'ArrowLeft') lbGo(-1);
      else if (e.key === 'ArrowRight') lbGo(1);
    });
    var lbSx = null;
    lb.addEventListener('touchstart', function (e) { lbSx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (lbSx === null) return;
      var dx = e.changedTouches[0].clientX - lbSx;
      if (Math.abs(dx) > 40) lbGo(dx < 0 ? 1 : -1);
      lbSx = null;
    }, { passive: true });
  }

  // --- Videoprohlídka: poster + play, výběr velikosti dle zařízení (1080p desktop / 720p mobil) ---
  var tour = document.querySelector('.tour-video');
  if (tour) {
    var vWrap = tour.closest('.video-embed');
    var playBtn = vWrap ? vWrap.querySelector('.tour-play') : null;
    var src = tour.querySelector('source');
    var vw = Math.min(window.innerWidth || 9999, (window.screen && screen.width) || 9999);
    var saveData = navigator.connection && navigator.connection.saveData;
    var want = (vw >= 900 && !saveData) ? tour.getAttribute('data-mp4-1080') : tour.getAttribute('data-mp4-720');
    // Verzi přepínáme až při prvním spuštění. Volání load() hned po načtení stránky totiž
    // navzdory preload="none" stáhne celý soubor (na desktopu 68 MB), i když si video nikdo nepustí.
    var srcHotovy = false;
    function tourNactiZdroj() {
      if (srcHotovy) return;
      srcHotovy = true;
      if (src && want && src.getAttribute('src') !== want) { src.setAttribute('src', want); tour.load(); }
    }
    function tourStart() {
      tourNactiZdroj();
      if (vWrap) vWrap.classList.add('is-playing');
      var p = tour.play();
      if (p && p.catch) p.catch(function () {});
    }
    // když uživatel míří na nativní tlačítko přehrávání, přepneme zdroj ještě před klikem
    // (na 'play' už ne, load() by rozjeté přehrávání zastavil)
    tour.addEventListener('pointerdown', tourNactiZdroj, { once: true });
    if (playBtn) playBtn.addEventListener('click', tourStart);
    tour.addEventListener('play', function () { if (vWrap) vWrap.classList.add('is-playing'); });
  }

  // --- Reely: normální přehrávač (play uprostřed, nativní ovládání = pauza/posuvník/zvuk) ---
  Array.prototype.forEach.call(document.querySelectorAll('.reel'), function (fig) {
    var frame = fig.querySelector('.reel__frame');
    var v = fig.querySelector('.reel-video');
    var playBtn = fig.querySelector('.reel__play');
    if (!frame || !v) return;
    function startReel() {
      frame.classList.add('is-playing');
      var p = v.play(); if (p && p.catch) p.catch(function () {});
    }
    if (playBtn) playBtn.addEventListener('click', startReel);
    v.addEventListener('play', function () { frame.classList.add('is-playing'); });
    // po skončení ukázat zase velké play tlačítko
    v.addEventListener('ended', function () { frame.classList.remove('is-playing'); });
  });
})();
