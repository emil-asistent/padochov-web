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

  // --- Kontaktní formulář -> mailto (statický web bez backendu) ---
  var form = document.querySelector('form[data-mailto]');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var to = form.getAttribute('data-mailto');
      var name = (form.querySelector('[name=name]') || {}).value || '';
      var email = (form.querySelector('[name=email]') || {}).value || '';
      var tel = (form.querySelector('[name=telefon]') || {}).value || '';
      var msg = (form.querySelector('[name=message]') || {}).value || '';
      var subject = 'Dotaz z webu Rezidence Padochov';
      var body = 'Jméno a příjmení: ' + name + '\n' +
                 'E-mail: ' + email + '\n' +
                 'Telefon: ' + tel + '\n\n' +
                 'Zpráva:\n' + msg;
      window.location.href = 'mailto:' + to +
        '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(body);
    });
  }
})();
