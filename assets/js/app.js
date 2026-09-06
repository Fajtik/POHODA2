/* =============================================================
   POHODA 2.0 — chování one-page prezentace
   Demo: žádný backend, formuláře pouze potvrzují odeslání.
   ============================================================= */
(function () {
  'use strict';

  var $  = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* -----------------------------------------------------------
     Mobilní navigace
     ----------------------------------------------------------- */
  (function mobilniNavigace() {
    var burger = $('.nav__burger');
    var links  = $('.nav__links');
    if (!burger || !links) return;

    function nastavit(otevreno) {
      links.classList.toggle('is-open', otevreno);
      burger.setAttribute('aria-expanded', String(otevreno));
      burger.setAttribute('aria-label', otevreno ? 'Zavřít menu' : 'Otevřít menu');
      burger.innerHTML = otevreno
        ? '<i class="fa-solid fa-xmark" aria-hidden="true"></i>'
        : '<i class="fa-solid fa-bars" aria-hidden="true"></i>';
    }

    burger.addEventListener('click', function () {
      nastavit(!links.classList.contains('is-open'));
    });

    links.addEventListener('click', function (e) {
      if (e.target.closest('a')) nastavit(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && links.classList.contains('is-open')) {
        nastavit(false);
        burger.focus();
      }
    });
  })();

  /* -----------------------------------------------------------
     Filtr jídelního lístku
     ----------------------------------------------------------- */
  (function filtrJidel() {
    var chipy  = $$('.chip[data-filter]');
    var jidla  = $$('.dish[data-category]');
    var prazdno = $('#zadna-jidla');
    if (!chipy.length || !jidla.length) return;

    function filtrovat(kategorie) {
      var videt = 0;

      jidla.forEach(function (jidlo) {
        var sedi = kategorie === 'vse' || jidlo.dataset.category === kategorie;
        jidlo.style.display = sedi ? '' : 'none';
        if (sedi) videt++;
      });

      chipy.forEach(function (chip) {
        chip.setAttribute('aria-pressed', String(chip.dataset.filter === kategorie));
      });

      if (prazdno) prazdno.hidden = videt > 0;
    }

    chipy.forEach(function (chip) {
      chip.addEventListener('click', function () { filtrovat(chip.dataset.filter); });
    });

    /* Odkazy z karet specialit rovnou přepnou filtr. */
    $$('[data-filter-jump]').forEach(function (odkaz) {
      odkaz.addEventListener('click', function () {
        filtrovat(odkaz.dataset.filterJump);
      });
    });
  })();

  /* -----------------------------------------------------------
     Otevírací doba podle dnešního dne
     ----------------------------------------------------------- */
  (function otviraciDoba() {
    var dnes = new Date().getDay();          // 0 = neděle
    var seznam = $('[data-hours]');
    var radekDnes = null;

    if (seznam) {
      $$('li[data-day]', seznam).forEach(function (radek) {
        var dny = radek.dataset.day.split(' ').map(Number);
        var jeDnes = dny.indexOf(dnes) !== -1;
        radek.classList.toggle('is-today', jeDnes);
        if (jeDnes) radekDnes = radek;
      });
    }

    var hodiny = radekDnes ? radekDnes.querySelector('.time').textContent.trim() : null;
    var cil = $('[data-today-hours]');
    if (cil && hodiny) cil.textContent = hodiny;

    if (!hodiny) return;

    /* Stav se počítá z dnešní doby — odznak i horní lišta říkají totéž. */
    var casti = hodiny.split('–').map(function (s) { return s.trim(); });
    var naMinuty = function (t) {
      var d = t.split(':');
      return Number(d[0]) * 60 + Number(d[1]);
    };
    var ted = new Date();
    var minutyTed = ted.getHours() * 60 + ted.getMinutes();
    var otevreno = minutyTed >= naMinuty(casti[0]) && minutyTed < naMinuty(casti[1]);

    var popisek = $('[data-today-label]');
    if (popisek) popisek.textContent = otevreno ? 'Dnes otevřeno:' : 'Dnes zavřeno, otevírací doba:';

    var odznak = $('.badge-open');
    if (odznak && !otevreno) {
      odznak.classList.add('is-closed');
      odznak.lastChild.textContent = ' Právě zavřeno';
    }
  })();

  /* -----------------------------------------------------------
     Zvýraznění právě čtené sekce v navigaci
     ----------------------------------------------------------- */
  (function aktivniSekce() {
    var odkazy = $$('.nav__links a[href^="#"]');
    if (!odkazy.length || !('IntersectionObserver' in window)) return;

    var mapa = {};
    var sekce = [];

    odkazy.forEach(function (odkaz) {
      var cil = document.getElementById(odkaz.getAttribute('href').slice(1));
      if (cil) { mapa[cil.id] = odkaz; sekce.push(cil); }
    });

    var pozorovatel = new IntersectionObserver(function (zaznamy) {
      zaznamy.forEach(function (z) {
        if (!z.isIntersecting) return;
        odkazy.forEach(function (o) { o.classList.remove('is-current'); });
        if (mapa[z.target.id]) mapa[z.target.id].classList.add('is-current');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    sekce.forEach(function (s) { pozorovatel.observe(s); });
  })();

  /* -----------------------------------------------------------
     Rezervační formulář — demo bez backendu
     ----------------------------------------------------------- */
  /* Kontaktní formulář na úvodní stránce. Rezervace stolu se dělá výhradně
     přes rezervace.html, tenhle formulář slouží jen k dotazům. */
  (function kontaktniFormular() {
    var form = $('#formular-zprava');
    if (!form) return;

    var stav = $('#stav-zpravy');

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var jmeno  = $('#jmeno', form);
      var email  = $('#email', form);
      var zprava = $('#zprava', form);

      var chybi = !jmeno.value.trim() ? jmeno
                : !email.value.trim() ? email
                : !zprava.value.trim() ? zprava : null;

      if (chybi) {
        zobrazit('Doplňte prosím jméno, e-mail a text zprávy, ať víme, komu a na co odpovědět.', 'chyba');
        chybi.focus();
        return;
      }

      zobrazit('Zpráva odeslána. Ozveme se na ' + email.value.trim() +
               ', obvykle do druhého dne.', 'ok');
      form.reset();
    });

    function zobrazit(text, typ) {
      if (!stav) return;
      stav.hidden = false;
      stav.textContent = text;
      stav.className = 'form__status is-' + typ;
      stav.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  })();

  /* -----------------------------------------------------------
     Odběr novinek — demo bez backendu
     ----------------------------------------------------------- */
  (function novinky() {
    var form = $('#formular-novinky');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var pole = $('input[type="email"]', form);
      if (!pole.value.trim()) { pole.focus(); return; }

      form.innerHTML = '<p class="news__done"><i class="fa-regular fa-circle-check" aria-hidden="true"></i> ' +
                       'Přihlášeno. Nabídku posíláme každý čtvrtek.</p>';
    });
  })();

})();
