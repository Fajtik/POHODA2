/* =============================================================
   POHODA 2.0 — rezervace stolu
   Ukázková verze: obsazenost je dopočítaná z data a času, takže
   je při každém otevření stejná, ale žádná data se neodesílají.
   ============================================================= */
(function () {
  'use strict';

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* -----------------------------------------------------------
     Podnik: 10 stolů v sále (42 míst) a 4 na zahrádce (18 míst)
     ----------------------------------------------------------- */
  var STOLY = {
    sal: [
      { id: 1,  mist: 2, tvar: 'kruh', x: 112, y: 108, r: 28, kde: 'u okna' },
      { id: 2,  mist: 2, tvar: 'kruh', x: 242, y: 108, r: 28, kde: 'u okna' },
      { id: 3,  mist: 4, tvar: 'kruh', x: 392, y: 112, r: 36, kde: 'u okna' },
      { id: 4,  mist: 4, tvar: 'kruh', x: 528, y: 112, r: 36, kde: 'u okna' },
      { id: 5,  mist: 4, tvar: 'kruh', x: 202, y: 224, r: 36, kde: 've středu sálu' },
      { id: 6,  mist: 4, tvar: 'kruh', x: 366, y: 238, r: 36, kde: 've středu sálu' },
      { id: 7,  mist: 4, tvar: 'kruh', x: 522, y: 254, r: 36, kde: 'u výčepu' },
      { id: 8,  mist: 4, tvar: 'kruh', x: 512, y: 378, r: 36, kde: 'u výčepu' },
      { id: 9,  mist: 6, tvar: 'deska', x: 228, y: 356, w: 118, h: 66, kde: 'u grilu' },
      { id: 10, mist: 8, tvar: 'deska', x: 654, y: 378, w: 130, h: 70, kde: 'v salonku' }
    ],
    zahradka: [
      { id: 11, mist: 4, tvar: 'kruh', x: 206, y: 246, r: 36, kde: 'na zahrádce' },
      { id: 12, mist: 4, tvar: 'kruh', x: 206, y: 388, r: 36, kde: 'na zahrádce' },
      { id: 13, mist: 4, tvar: 'kruh', x: 396, y: 318, r: 36, kde: 'na zahrádce' },
      { id: 14, mist: 6, tvar: 'deska', x: 594, y: 148, w: 126, h: 68, kde: 'pod pergolou' }
    ]
  };

  var CASY_OBED  = ['11:00', '11:30', '12:00', '12:30', '13:00', '13:30'];
  var CASY_VECER = ['17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00'];

  var DNY   = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota'];
  var MESICE = ['ledna', 'února', 'března', 'dubna', 'května', 'června',
                'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'];
  var MESICE_1 = ['Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen',
                  'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'];

  /* -----------------------------------------------------------
     Pomocné výpočty
     ----------------------------------------------------------- */

  /* Stabilní pseudonáhoda: stejný vstup vrátí vždy stejné číslo 0–1,
     aby obsazenost při proklikávání neposkakovala. */
  function sud(text) {
    var h = 2166136261;
    for (var i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = (h * 16777619) >>> 0;
    }
    return (h % 10000) / 10000;
  }

  function klic(d) {
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }

  function vecerniProvoz(d) {
    var den = d.getDay();               // 0 = neděle
    return den >= 3 && den <= 6;        // středa až sobota
  }

  function zahradkaOtevrena(d) {
    var m = d.getMonth();               // 0 = leden
    return m >= 3 && m <= 8;            // duben až září
  }

  /* Jak plno ten den je: 0 = prázdno, 1 = nabito. */
  function naplnenost(d) {
    var den = d.getDay();
    var zaklad = sud('den' + klic(d)) * 0.5;
    if (den === 5 || den === 6) zaklad += 0.45;   // pátek, sobota
    else if (den === 4) zaklad += 0.25;           // čtvrtek
    else if (den === 0) zaklad += 0.15;           // neděle
    return Math.min(zaklad, 0.97);
  }

  function jeMinulost(d) {
    var dnes = new Date();
    dnes.setHours(0, 0, 0, 0);
    return d < dnes;
  }

  function stavDne(d) {
    if (jeMinulost(d)) return 'minulost';
    if (!maVolnyCas(d)) return 'full';
    var p = naplnenost(d);
    if (p > 0.85) return 'full';
    if (p > 0.6)  return 'busy';
    return 'free';
  }

  function jeDnes(d) {
    return d.toDateString() === new Date().toDateString();
  }

  /* Poslední objednávku bereme hodinu před zavírací dobou. */
  function slotProsel(d, cas) {
    if (!jeDnes(d)) return false;
    var ted = new Date();
    var casti = cas.split(':');
    return Number(casti[0]) * 60 + Number(casti[1]) <= ted.getHours() * 60 + ted.getMinutes();
  }

  function slotObsazen(d, cas) {
    if (slotProsel(d, cas)) return true;
    return sud('slot' + klic(d) + cas) < naplnenost(d) * 0.75;
  }

  /* Zbývá na daný den ještě aspoň jeden volný čas? */
  function maVolnyCas(d) {
    var casy = CASY_OBED.concat(vecerniProvoz(d) ? CASY_VECER : []);
    return casy.some(function (cas) { return !slotObsazen(d, cas); });
  }

  /* Stůl je obsazený tím častěji, čím plnější je daný večer. */
  function stulObsazen(d, cas, id) {
    if (!d || !cas) return false;
    return sud('stul' + klic(d) + cas + '#' + id) < naplnenost(d) * 0.8;
  }

  function formatDatum(d) {
    return DNY[d.getDay()] + ' ' + d.getDate() + '. ' + MESICE[d.getMonth()];
  }

  function sklonujOsoby(n) {
    if (n === 1) return '1 osoba';
    if (n < 5)   return n + ' osoby';
    return n + ' osob';
  }

  /* -----------------------------------------------------------
     Stav rezervace
     ----------------------------------------------------------- */
  var stav = {
    datum: null,
    osob: 4,
    cas: null,
    zona: 'sal',
    stul: null,
    krok: 1
  };

  var kurzor = new Date();   // zobrazený měsíc v kalendáři

  /* -----------------------------------------------------------
     Kalendář
     ----------------------------------------------------------- */
  function vykresliKalendar() {
    var grid = $('[data-cal-grid]');
    var nadpis = $('[data-cal-month]');
    if (!grid) return;

    nadpis.textContent = MESICE_1[kurzor.getMonth()] + ' ' + kurzor.getFullYear();
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
      var stavD = stavDne(d);
      var tl = document.createElement('button');

      tl.type = 'button';
      tl.className = 'cal__cell is-' + stavD;
      tl.dataset.date = d.toISOString().slice(0, 10);
      tl.textContent = den;

      var popis = formatDatum(d);
      if (stavD === 'minulost') {
        tl.disabled = true;
        popis += ' — už proběhlo';
      } else if (stavD === 'full') {
        tl.disabled = true;
        popis += jeDnes(d) ? ' — na dnešek už nemáme volný čas' : ' — obsazeno';
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
    if (!zahradkaOtevrena(d) && stav.zona === 'zahradka') prepniZonu('sal');
    vykresliKalendar();
    vykresliSouhrn();
  }

  /* -----------------------------------------------------------
     Časové sloty
     ----------------------------------------------------------- */
  function vykresliSloty() {
    if (!stav.datum) return;

    var vecer = vecerniProvoz(stav.datum);
    var blokVecer = $('[data-slots-vecere]');
    var prazdno = $('[data-slots-empty]');

    if (blokVecer) blokVecer.hidden = !vecer;
    if (prazdno) {
      prazdno.hidden = vecer;
      prazdno.textContent = vecer ? '' :
        'V ' + DNY[stav.datum.getDay()] + ' zavíráme v 16:00, večerní stoly proto nenabízíme. ' +
        'Na večeři se stavte od středy do soboty.';
    }

    naplnRadu($('[data-slots="obed"]'), CASY_OBED);
    if (vecer) naplnRadu($('[data-slots="vecer"]'), CASY_VECER);
  }

  function naplnRadu(box, casy) {
    if (!box) return;
    box.innerHTML = '';

    casy.forEach(function (cas) {
      var obsazeno = slotObsazen(stav.datum, cas);
      var tl = document.createElement('button');

      tl.type = 'button';
      tl.className = 'slot' + (obsazeno ? ' is-taken' : '');
      tl.dataset.time = cas;
      tl.disabled = obsazeno;
      var popisStavu = !obsazeno ? 'volno'
        : slotProsel(stav.datum, cas) ? 'už proběhlo'
        : 'obsazeno';
      tl.innerHTML = '<span class="slot__time">' + cas + '</span>' +
                     '<span class="slot__state">' + popisStavu + '</span>';

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
  var NS = 'http://www.w3.org/2000/svg';

  function svgPrvek(nazev, atributy) {
    var el = document.createElementNS(NS, nazev);
    Object.keys(atributy).forEach(function (k) { el.setAttribute(k, atributy[k]); });
    return el;
  }

  function vykresliPlan() {
    Object.keys(STOLY).forEach(function (zona) {
      var plan = $('[data-plan="' + zona + '"]');
      if (!plan) return;

      var vrstva = $('[data-tables]', plan);
      vrstva.innerHTML = '';

      STOLY[zona].forEach(function (stul) {
        vrstva.appendChild(nakresliStul(stul, zona));
      });
    });
  }

  function nakresliStul(stul, zona) {
    var obsazeno = stulObsazen(stav.datum, stav.cas, stul.id);
    var maly = stul.mist < stav.osob;
    var vybrany = stav.stul === stul.id && stav.zona === zona;
    var volny = !obsazeno && !maly;

    var g = svgPrvek('g', {
      class: 'table' + (obsazeno ? ' is-taken' : '') + (maly ? ' is-small' : '') +
             (vybrany ? ' is-picked' : ''),
      'data-table': stul.id,
      tabindex: volny ? '0' : '-1',
      role: 'button',
      'aria-disabled': volny ? 'false' : 'true',
      'aria-pressed': vybrany ? 'true' : 'false'
    });

    var popis = 'Stůl ' + stul.id + ' ' + stul.kde + ', ' + sklonujOsoby(stul.mist) + ' — ' +
                (obsazeno ? 'obsazeno' : maly ? 'malý pro váš počet' : 'volný');
    g.appendChild(svgPrvek('title', {})).textContent = popis;

    /* Židle kolem stolu dávají plánu měřítko. */
    var zidle = svgPrvek('g', { class: 'chairs' });
    if (stul.tvar === 'kruh') {
      for (var i = 0; i < stul.mist; i++) {
        var uhel = (Math.PI * 2 * i) / stul.mist - Math.PI / 2;
        zidle.appendChild(svgPrvek('circle', {
          cx: stul.x + Math.cos(uhel) * (stul.r + 13),
          cy: stul.y + Math.sin(uhel) * (stul.r + 13),
          r: 7
        }));
      }
      g.appendChild(zidle);
      g.appendChild(svgPrvek('circle', { class: 'top', cx: stul.x, cy: stul.y, r: stul.r }));
    } else {
      var naStranu = stul.mist / 2;
      for (var j = 0; j < naStranu; j++) {
        var krok = stul.w / naStranu;
        var px = stul.x - stul.w / 2 + krok * (j + 0.5);
        zidle.appendChild(svgPrvek('circle', { cx: px, cy: stul.y - stul.h / 2 - 13, r: 7 }));
        zidle.appendChild(svgPrvek('circle', { cx: px, cy: stul.y + stul.h / 2 + 13, r: 7 }));
      }
      g.appendChild(zidle);
      g.appendChild(svgPrvek('rect', {
        class: 'top',
        x: stul.x - stul.w / 2, y: stul.y - stul.h / 2,
        width: stul.w, height: stul.h
      }));
    }

    var cislo = svgPrvek('text', { class: 'table__id', x: stul.x, y: stul.y - 2 });
    cislo.textContent = stul.id;
    g.appendChild(cislo);

    var kapacita = svgPrvek('text', { class: 'table__seats', x: stul.x, y: stul.y + 15 });
    kapacita.textContent = stul.mist + ' os.';
    g.appendChild(kapacita);

    return g;
  }

  function vyberStul(id) {
    var stul = STOLY[stav.zona].filter(function (s) { return s.id === id; })[0];
    if (!stul) return;
    if (stulObsazen(stav.datum, stav.cas, id) || stul.mist < stav.osob) return;

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
    /* SVGElement nemá vlastnost hidden — přepínáme atribut, jinak by se
       nastavila jen JS property a prvek by zůstal viditelný. */
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
    nastavRadek('datum', stav.datum ? formatDatum(stav.datum) : null);
    nastavRadek('osob', sklonujOsoby(stav.osob));
    nastavRadek('cas', stav.cas);

    var stul = stav.stul
      ? STOLY[stav.zona].filter(function (s) { return s.id === stav.stul; })[0]
      : null;
    nastavRadek('stul', stul ? ('č. ' + stul.id + ' ' + stul.kde) : null);

    var kdy = $('[data-plan-when]');
    if (kdy) {
      kdy.textContent = stav.datum && stav.cas
        ? formatDatum(stav.datum) + ' v ' + stav.cas + ' · pro ' + sklonujOsoby(stav.osob)
        : 'Nejdřív vyberte termín a čas';
    }

    var zahradkaTl = $('[data-zone="zahradka"]');
    if (zahradkaTl && stav.datum) {
      var otevrena = zahradkaOtevrena(stav.datum);
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

    var hlavicka = $('.rez-head');
    if (hlavicka) window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function zkusDal(cil) {
    if (cil >= 2 && !stav.datum)  return chyba('Vyberte prosím datum návštěvy.');
    if (cil >= 3 && !stav.cas)    return chyba('Vyberte prosím čas příchodu.');
    if (cil >= 4 && !stav.stul)   return chyba('Vyberte prosím stůl v plánu podniku.');
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
    if (!krok) return null;
    var noha = $('.step__foot', krok);
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
    var stul = STOLY[stav.zona].filter(function (s) { return s.id === stav.stul; })[0];

    var radky = [
      ['Host', jmeno],
      ['Telefon', telefon],
      ['Termín', formatDatum(stav.datum) + ' v ' + stav.cas],
      ['Počet osob', sklonujOsoby(stav.osob)],
      ['Stůl', 'č. ' + stul.id + ' ' + stul.kde + ' (' + sklonujOsoby(stul.mist) + ')']
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

    var dvojmisto = function (n) { return String(n).padStart(2, '0'); };
    var cislo = 'PH-' + stav.datum.getFullYear() +
                dvojmisto(stav.datum.getMonth() + 1) +
                dvojmisto(stav.datum.getDate()) + '-' + dvojmisto(stul.id);
    $('[data-done-code]').textContent = cislo;

    naKrok(5);
  }

  /* -----------------------------------------------------------
     Navěšení událostí
     ----------------------------------------------------------- */
  function start() {
    if (!$('.rez-flow')) return;

    /* Kalendář */
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
      if (bunka && !bunka.disabled) vyberDatum(new Date(bunka.dataset.date));
    });

    /* Počet osob */
    $('[data-party]').addEventListener('click', function (e) {
      var tl = e.target.closest('.party__btn');
      if (!tl) return;
      stav.osob = Number(tl.dataset.people);
      stav.stul = null;
      $$('.party__btn').forEach(function (b) { b.classList.toggle('is-selected', b === tl); });
      vykresliSouhrn();
    });

    /* Časy */
    $$('.slots__row').forEach(function (rada) {
      rada.addEventListener('click', function (e) {
        var tl = e.target.closest('.slot');
        if (tl && !tl.disabled) vyberCas(tl.dataset.time);
      });
    });

    /* Zóny a stoly */
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

    /* Příležitost */
    var prilezitost = $('[data-occasion]');
    if (prilezitost) {
      prilezitost.addEventListener('click', function (e) {
        var tl = e.target.closest('.tagbtn');
        if (!tl) return;
        $$('.tagbtn', prilezitost).forEach(function (b) { b.classList.toggle('is-selected', b === tl); });
      });
    }

    /* Krokování */
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

    /* Odeslání */
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

      var vybranaPrilezitost = $('.tagbtn.is-selected');
      dokonci(jmeno, telefon,
              vybranaPrilezitost ? vybranaPrilezitost.dataset.occasionValue : '',
              $('#poznamka').value.trim());
    });

    /* Nová rezervace */
    $('[data-restart]').addEventListener('click', function () {
      stav.datum = null; stav.cas = null; stav.stul = null; stav.osob = 4; stav.zona = 'sal';
      form.reset();
      $('#stav-rezervace').hidden = true;
      $$('.party__btn').forEach(function (b) { b.classList.toggle('is-selected', b.dataset.people === '4'); });
      $$('.tagbtn').forEach(function (b, i) { b.classList.toggle('is-selected', i === 0); });
      prepniZonu('sal');
      vykresliKalendar();
      vykresliSouhrn();
      naKrok(1);
    });

    /* Výchozí stav: nejbližší den, kdy se dá večeřet. */
    var start = new Date();
    for (var i = 0; i < 14; i++) {
      var kandidat = new Date();
      kandidat.setDate(start.getDate() + i);
      if (stavDne(kandidat) !== 'full' && stavDne(kandidat) !== 'minulost') {
        kurzor = new Date(kandidat.getFullYear(), kandidat.getMonth(), 1);
        vyberDatum(kandidat);
        break;
      }
    }

    vykresliKalendar();
    vykresliPlan();
    vykresliSouhrn();
    naKrok(1);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

})();
