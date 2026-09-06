/* =============================================================
   POHODA 2.0 — průvodce rezervací stolu
   Data i obsazenost přebírá z podnik.js, aby se s provozním
   panelem nikdy nerozešly.
   ============================================================= */
(function () {
  'use strict';

  var P = window.POHODA;
  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var stav = { datum: null, osob: 4, cas: null, zona: 'sal', stul: null, krok: 1 };
  var kurzor = new Date();

  /* -----------------------------------------------------------
     Kalendář
     ----------------------------------------------------------- */
  function vykresliKalendar() {
    var grid = $('[data-cal-grid]');
    if (!grid) return;

    $('[data-cal-month]').textContent = P.MESICE_1[kurzor.getMonth()] + ' ' + kurzor.getFullYear();
    grid.innerHTML = '';

    var prvni = new Date(kurzor.getFullYear(), kurzor.getMonth(), 1);
    var posun = (prvni.getDay() + 6) % 7;                 // pondělí první
    var pocet = new Date(kurzor.getFullYear(), kurzor.getMonth() + 1, 0).getDate();

    for (var i = 0; i < posun; i++) {
      var mezera = document.createElement('span');
      mezera.className = 'cal__cell cal__cell--empty';
      grid.appendChild(mezera);
    }

    for (var den = 1; den <= pocet; den++) {
      var d = new Date(kurzor.getFullYear(), kurzor.getMonth(), den);
      var stavD = P.stavDne(d);
      var tl = document.createElement('button');

      tl.type = 'button';
      tl.className = 'cal__cell is-' + stavD;
      tl.dataset.date = P.klic(d);
      tl.textContent = den;

      var popis = P.formatDatum(d);
      if (stavD === 'minulost') {
        tl.disabled = true;
        popis += ' — už proběhlo';
      } else if (stavD === 'full') {
        tl.disabled = true;
        popis += P.jeDnes(d) ? ' — na dnešek už nemáme volný čas' : ' — obsazeno';
      } else {
        popis += stavD === 'busy' ? ' — poslední stoly' : ' — volno';
      }
      tl.setAttribute('aria-label', popis);

      if (stav.datum && stav.datum.toDateString() === d.toDateString()) {
        tl.classList.add('is-picked');
        tl.setAttribute('aria-current', 'date');
      }

      grid.appendChild(tl);
    }
  }

  function vyberDatum(d) {
    stav.datum = d;
    stav.cas = null;
    stav.stul = null;
    if (!P.zahradkaOtevrena(d) && stav.zona === 'zahradka') prepniZonu('sal');
    vykresliKalendar();
    vykresliSouhrn();
  }

  /* -----------------------------------------------------------
     Časové sloty
     ----------------------------------------------------------- */
  function vykresliSloty() {
    if (!stav.datum) return;

    var vecer = P.vecerniProvoz(stav.datum);
    var blokVecer = $('[data-slots-vecere]');
    var prazdno = $('[data-slots-empty]');

    if (blokVecer) blokVecer.hidden = !vecer;
    if (prazdno) {
      prazdno.hidden = vecer;
      prazdno.textContent = vecer ? '' :
        'V ' + P.DNY[stav.datum.getDay()] + ' zavíráme v 16:00, večerní stoly proto nenabízíme. ' +
        'Na večeři se stavte od středy do soboty.';
    }

    naplnRadu($('[data-slots="obed"]'), P.CASY_OBED);
    if (vecer) naplnRadu($('[data-slots="vecer"]'), P.CASY_VECER);
  }

  function naplnRadu(box, casy) {
    if (!box) return;
    box.innerHTML = '';

    casy.forEach(function (cas) {
      var obsazeno = P.slotObsazen(stav.datum, cas);
      var prosel = P.jeDnes(stav.datum) &&
                   P.minuty(cas) <= new Date().getHours() * 60 + new Date().getMinutes();

      var tl = document.createElement('button');
      tl.type = 'button';
      tl.className = 'slot' + (obsazeno ? ' is-taken' : '');
      tl.dataset.time = cas;
      tl.disabled = obsazeno;
      tl.innerHTML = '<span class="slot__time">' + cas + '</span>' +
                     '<span class="slot__state">' +
                     (!obsazeno ? 'volno' : prosel ? 'už proběhlo' : 'obsazeno') +
                     '</span>';

      if (stav.cas === cas) tl.classList.add('is-picked');
      box.appendChild(tl);
    });
  }

  function vyberCas(cas) {
    stav.cas = cas;
    stav.stul = null;
    vykresliSloty();
    vykresliSouhrn();
  }

  /* -----------------------------------------------------------
     Plán podniku
     ----------------------------------------------------------- */
  function vykresliPlan() {
    Object.keys(P.STOLY).forEach(function (zona) {
      var plan = $('[data-plan="' + zona + '"]');
      if (!plan) return;

      var vrstva = $('[data-tables]', plan);
      vrstva.innerHTML = '';

      P.STOLY[zona].forEach(function (stul) {
        var obsazeno = P.stulObsazen(stav.datum, stav.cas, stul.id);
        var maly = stul.mist < stav.osob;
        var vybrany = stav.stul === stul.id && stav.zona === zona;
        var volny = !obsazeno && !maly;

        vrstva.appendChild(P.nakresliStul(stul, {
          atributy: {
            class: 'table' + (obsazeno ? ' is-taken' : '') + (maly ? ' is-small' : '') +
                   (vybrany ? ' is-picked' : ''),
            'data-table': stul.id,
            tabindex: volny ? '0' : '-1',
            role: 'button',
            'aria-disabled': volny ? 'false' : 'true',
            'aria-pressed': vybrany ? 'true' : 'false'
          },
          popis: 'Stůl ' + stul.id + ' ' + stul.kde + ', ' + P.sklonujOsoby(stul.mist) + ' — ' +
                 (obsazeno ? 'obsazeno' : maly ? 'malý pro váš počet' : 'volný')
        }));
      });
    });
  }

  function vyberStul(id) {
    var stul = P.STOLY[stav.zona].filter(function (s) { return s.id === id; })[0];
    if (!stul) return;
    if (P.stulObsazen(stav.datum, stav.cas, id) || stul.mist < stav.osob) return;

    stav.stul = id;
    vykresliPlan();
    vykresliSouhrn();
  }

  function prepniZonu(zona) {
    stav.zona = zona;
    stav.stul = null;

    $$('[data-zone]').forEach(function (tl) {
      tl.setAttribute('aria-selected', String(tl.dataset.zone === zona));
    });

    /* SVGElement nemá vlastnost hidden — přepínáme atribut. */
    $$('[data-plan]').forEach(function (plan) {
      if (plan.dataset.plan === zona) plan.removeAttribute('hidden');
      else plan.setAttribute('hidden', '');
    });

    vykresliPlan();
    vykresliSouhrn();
  }

  /* -----------------------------------------------------------
     Souhrn
     ----------------------------------------------------------- */
  function vykresliSouhrn() {
    nastavRadek('datum', stav.datum ? P.formatDatum(stav.datum) : null);
    nastavRadek('osob', P.sklonujOsoby(stav.osob));
    nastavRadek('cas', stav.cas);

    var stul = stav.stul ? P.stulPodleId(stav.stul) : null;
    nastavRadek('stul', stul ? ('č. ' + stul.id + ' ' + stul.kde) : null);

    var kdy = $('[data-plan-when]');
    if (kdy) {
      kdy.textContent = stav.datum && stav.cas
        ? P.formatDatum(stav.datum) + ' v ' + stav.cas + ' · pro ' + P.sklonujOsoby(stav.osob)
        : 'Nejdřív vyberte termín a čas';
    }

    var zahradkaTl = $('[data-zone="zahradka"]');
    if (zahradkaTl && stav.datum) {
      var otevrena = P.zahradkaOtevrena(stav.datum);
      zahradkaTl.disabled = !otevrena;
      zahradkaTl.title = otevrena ? '' : 'Zahrádka je v provozu od dubna do září.';
    }
  }

  function nastavRadek(klicRadku, hodnota) {
    var radek = $('[data-recap="' + klicRadku + '"]');
    if (!radek) return;
    radek.querySelector('dd').textContent = hodnota || '—';
    radek.classList.toggle('is-set', Boolean(hodnota));
  }

  /* -----------------------------------------------------------
     Průchod kroky
     ----------------------------------------------------------- */
  function naKrok(cislo) {
    stav.krok = cislo;

    $$('[data-step]').forEach(function (sekce) {
      sekce.hidden = Number(sekce.dataset.step) !== cislo;
    });
    $$('[data-step-nav]').forEach(function (polozka) {
      var n = Number(polozka.dataset.stepNav);
      polozka.classList.toggle('is-active', n === cislo);
      polozka.classList.toggle('is-done', n < cislo);
    });

    if (cislo === 2) vykresliSloty();
    if (cislo === 3) { vykresliPlan(); vykresliSouhrn(); }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function zkusDal(cil) {
    if (cil >= 2 && !stav.datum) return chyba('Vyberte prosím datum návštěvy.');
    if (cil >= 3 && !stav.cas)   return chyba('Vyberte prosím čas příchodu.');
    if (cil >= 4 && !stav.stul)  return chyba('Vyberte prosím stůl v plánu podniku.');
    naKrok(cil);
  }

  function chyba(text) {
    var box = $('.step:not([hidden]) .step__error') || vytvorChybu();
    if (!box) return;
    box.textContent = text;
    box.hidden = false;
    box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    clearTimeout(box._timer);
    box._timer = setTimeout(function () { box.hidden = true; }, 5000);
  }

  function vytvorChybu() {
    var krok = $('.step:not([hidden])');
    var noha = krok && $('.step__foot', krok);
    if (!noha) return null;
    var box = document.createElement('p');
    box.className = 'step__error';
    box.hidden = true;
    noha.parentNode.insertBefore(box, noha);
    return box;
  }

  /* -----------------------------------------------------------
     Dokončení
     ----------------------------------------------------------- */
  function dokonci(jmeno, telefon, prilezitost, poznamka) {
    var stul = P.stulPodleId(stav.stul);

    var radky = [
      ['Host', jmeno],
      ['Telefon', telefon],
      ['Termín', P.formatDatum(stav.datum) + ' v ' + stav.cas],
      ['Počet osob', P.sklonujOsoby(stav.osob)],
      ['Stůl', 'č. ' + stul.id + ' ' + stul.kde + ' (' + P.sklonujOsoby(stul.mist) + ')']
    ];
    if (prilezitost) radky.push(['Příležitost', prilezitost]);
    if (poznamka)    radky.push(['Poznámka', poznamka]);

    var recap = $('[data-done-recap]');
    recap.innerHTML = '';
    radky.forEach(function (par) {
      var blok = document.createElement('div');
      var dt = document.createElement('dt');
      var dd = document.createElement('dd');
      dt.textContent = par[0];
      dd.textContent = par[1];
      blok.appendChild(dt);
      blok.appendChild(dd);
      recap.appendChild(blok);
    });

    var dvoj = function (n) { return String(n).padStart(2, '0'); };
    $('[data-done-code]').textContent = 'PH-' + stav.datum.getFullYear() +
      dvoj(stav.datum.getMonth() + 1) + dvoj(stav.datum.getDate()) + '-' + dvoj(stul.id);

    naKrok(5);
  }

  /* -----------------------------------------------------------
     Navěšení událostí
     ----------------------------------------------------------- */
  function start() {
    if (!$('.rez-flow')) return;

    /* Kostry plánů plníme z jednoho zdroje, ať je panel i průvodce kreslí stejně. */
    $$('[data-plan]').forEach(function (plan) {
      var zona = plan.dataset.plan;
      if (P.KOSTRA[zona]) plan.insertAdjacentHTML('afterbegin', P.KOSTRA[zona]);
    });

    $('[data-cal-prev]').addEventListener('click', function () {
      kurzor = new Date(kurzor.getFullYear(), kurzor.getMonth() - 1, 1);
      vykresliKalendar();
    });
    $('[data-cal-next]').addEventListener('click', function () {
      kurzor = new Date(kurzor.getFullYear(), kurzor.getMonth() + 1, 1);
      vykresliKalendar();
    });
    $('[data-cal-grid]').addEventListener('click', function (e) {
      var bunka = e.target.closest('.cal__cell[data-date]');
      if (bunka && !bunka.disabled) {
        var c = bunka.dataset.date.split('-');
        vyberDatum(new Date(Number(c[0]), Number(c[1]) - 1, Number(c[2])));
      }
    });

    $('[data-party]').addEventListener('click', function (e) {
      var tl = e.target.closest('.party__btn');
      if (!tl) return;
      stav.osob = Number(tl.dataset.people);
      stav.stul = null;
      $$('.party__btn').forEach(function (b) { b.classList.toggle('is-selected', b === tl); });
      vykresliSouhrn();
    });

    $$('.slots__row').forEach(function (rada) {
      rada.addEventListener('click', function (e) {
        var tl = e.target.closest('.slot');
        if (tl && !tl.disabled) vyberCas(tl.dataset.time);
      });
    });

    $$('[data-zone]').forEach(function (tl) {
      tl.addEventListener('click', function () { prepniZonu(tl.dataset.zone); });
    });

    $$('[data-plan]').forEach(function (plan) {
      plan.addEventListener('click', function (e) {
        var g = e.target.closest('[data-table]');
        if (g) vyberStul(Number(g.dataset.table));
      });
      plan.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        var g = e.target.closest('[data-table]');
        if (!g) return;
        e.preventDefault();
        vyberStul(Number(g.dataset.table));
      });
    });

    var prilezitost = $('[data-occasion]');
    if (prilezitost) {
      prilezitost.addEventListener('click', function (e) {
        var tl = e.target.closest('.tagbtn');
        if (!tl) return;
        $$('.tagbtn', prilezitost).forEach(function (b) { b.classList.toggle('is-selected', b === tl); });
      });
    }

    $$('[data-next]').forEach(function (tl) {
      tl.addEventListener('click', function () { zkusDal(Number(tl.dataset.next)); });
    });
    $$('[data-back]').forEach(function (tl) {
      tl.addEventListener('click', function () { naKrok(Number(tl.dataset.back)); });
    });
    $$('[data-step-nav]').forEach(function (polozka) {
      polozka.addEventListener('click', function () {
        var cil = Number(polozka.dataset.stepNav);
        if (cil < stav.krok) naKrok(cil);
      });
    });

    var form = $('#formular-rezervace');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var jmeno = $('#jmeno').value.trim();
      var telefon = $('#telefon').value.trim();
      var stavBox = $('#stav-rezervace');

      if (!jmeno || !telefon) {
        stavBox.hidden = false;
        stavBox.className = 'form__status is-chyba';
        stavBox.textContent = 'Vyplňte prosím jméno a telefon — bez nich rezervaci nepotvrdíme.';
        (jmeno ? $('#telefon') : $('#jmeno')).focus();
        return;
      }

      var vybrana = $('.tagbtn.is-selected');
      dokonci(jmeno, telefon, vybrana ? vybrana.dataset.occasionValue : '',
              $('#poznamka').value.trim());
    });

    $('[data-restart]').addEventListener('click', function () {
      stav.cas = null; stav.stul = null; stav.osob = 4; stav.zona = 'sal';
      form.reset();
      $('#stav-rezervace').hidden = true;
      $$('.party__btn').forEach(function (b) { b.classList.toggle('is-selected', b.dataset.people === '4'); });
      $$('.tagbtn').forEach(function (b, i) { b.classList.toggle('is-selected', i === 0); });
      prepniZonu('sal');
      vyberNejblizsiDen();
      naKrok(1);
    });

    vyberNejblizsiDen();
    vykresliKalendar();
    vykresliPlan();
    vykresliSouhrn();
    naKrok(1);
  }

  /* Nejbližší den, na který se ještě dá přijít. */
  function vyberNejblizsiDen() {
    for (var i = 0; i < 21; i++) {
      var kandidat = new Date();
      kandidat.setDate(new Date().getDate() + i);
      var s = P.stavDne(kandidat);
      if (s !== 'full' && s !== 'minulost') {
        kurzor = new Date(kandidat.getFullYear(), kandidat.getMonth(), 1);
        vyberDatum(kandidat);
        return;
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

})();
