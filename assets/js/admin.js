/* =============================================================
   POHODA 2.0 — provozní panel
   Ukázka: rezervace generuje podnik.js, změny stavů drží jen
   do obnovení stránky.
   ============================================================= */
(function () {
  'use strict';

  var P = window.POHODA;
  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var STAVY = {
    ceka:       { popis: 'Čeká',       dlouze: 'Čeká na potvrzení' },
    potvrzeno:  { popis: 'Potvrzeno',  dlouze: 'Potvrzeno' },
    dorazili:   { popis: 'U stolu',    dlouze: 'Hosté u stolu' },
    odesli:     { popis: 'Odešli',     dlouze: 'Odešli' },
    nedorazili: { popis: 'Nedorazili', dlouze: 'Nedorazili' },
    zruseno:    { popis: 'Zrušeno',    dlouze: 'Zrušeno' }
  };

  var OSA_OD = 10 * 60;
  var OSA_DO = 22 * 60;
  var ROZSAH = OSA_DO - OSA_OD;

  var den = new Date();
  var filtr = 'vse';
  var zona = 'sal';
  var casPlanu = 19 * 60;
  var otevrenyDetail = null;

  function rezervace() {
    return P.rezervaceNaDen(den).filter(function (r) { return r.stav !== 'zruseno'; });
  }

  function dvoj(n) { return String(n).padStart(2, '0'); }

  /* -----------------------------------------------------------
     Hlavička dne a souhrn
     ----------------------------------------------------------- */
  function vykresliDen() {
    $('[data-day-title]').textContent = P.jeDnes(den)
      ? 'Dnes, ' + P.formatDatum(den)
      : P.formatDatum(den).charAt(0).toUpperCase() + P.formatDatum(den).slice(1);

    $('[data-day-sub]').textContent = P.vecerniProvoz(den)
      ? 'Otevřeno 10:00 – 22:00 · kuchyně i gril po celou dobu'
      : 'Otevřeno 10:00 – 16:00 · večer zavřeno';

    $('[data-day-picker]').value = den.getFullYear() + '-' +
      dvoj(den.getMonth() + 1) + '-' + dvoj(den.getDate());

    var seznam = rezervace();
    var hostu = seznam.reduce(function (s, r) { return s + r.osob; }, 0);
    var ceka = seznam.filter(function (r) { return r.stav === 'ceka'; });

    nastavKartu('rezervaci', seznam.length,
      seznam.length ? Math.round(seznam.filter(function (r) { return r.kanal === 'web'; }).length /
        seznam.length * 100) + ' % přišlo přes web' : 'Zatím nic');

    nastavKartu('hostu', hostu,
      seznam.length ? 'Průměrně ' + (hostu / seznam.length).toFixed(1) + ' na stůl' : '—');

    var spicka = najdiSpicku(seznam);
    nastavKartu('spicka', spicka ? spicka.cas : '—',
      spicka ? P.sklonujOsoby(spicka.hostu) + ' u stolů' : 'Bez rezervací');

    nastavKartu('ceka', ceka.length,
      ceka.length ? 'Potvrďte hostům termín' : 'Vše vyřízeno');
    $('.card--action').classList.toggle('is-urgent', ceka.length > 0);
  }

  function nastavKartu(klic, hodnota, poznamka) {
    $('[data-stat="' + klic + '"]').textContent = hodnota;
    $('[data-stat-note="' + klic + '"]').textContent = poznamka;
  }

  /* Půlhodina, ve které je u stolů nejvíc lidí. */
  function najdiSpicku(seznam) {
    var nej = null;
    for (var m = OSA_OD; m <= OSA_DO; m += 30) {
      var hostu = seznam.reduce(function (s, r) {
        return s + (r.zacatek <= m && r.konec > m ? r.osob : 0);
      }, 0);
      if (hostu && (!nej || hostu > nej.hostu)) nej = { cas: P.naCas(m), hostu: hostu };
    }
    return nej;
  }

  /* -----------------------------------------------------------
     Časová osa
     ----------------------------------------------------------- */
  function vykresliOsu() {
    var hodiny = $('[data-timeline-hours]');
    var radky = $('[data-timeline-rows]');
    var seznam = rezervace();

    $('[data-timeline-range]').textContent = seznam.length
      ? P.sklonujRezervace(seznam.length) + ' · 10:00 až 22:00'
      : '10:00 až 22:00';
    $('[data-timeline-empty]').hidden = seznam.length > 0;

    hodiny.innerHTML = '';
    for (var h = 10; h <= 22; h += 2) {
      var znacka = document.createElement('span');
      znacka.className = 'timeline__hour';
      znacka.style.left = ((h * 60 - OSA_OD) / ROZSAH * 100) + '%';
      /* Krajní popisky zarovnáme dovnitř, jinak by přetekly osu. */
      if (h === 10) znacka.style.transform = 'translateX(0)';
      if (h === 22) znacka.style.transform = 'translateX(-100%)';
      znacka.textContent = h + ':00';
      hodiny.appendChild(znacka);
    }

    radky.innerHTML = '';
    var stoly = P.vsechnyStoly().filter(function (s) {
      return s.id < 11 || P.zahradkaOtevrena(den);
    });

    stoly.forEach(function (stul) {
      var radek = document.createElement('div');
      radek.className = 'trow';

      var stitek = document.createElement('div');
      stitek.className = 'trow__label';
      stitek.innerHTML = '<strong>' + stul.id + '</strong><span>' + stul.mist + ' míst</span>';
      radek.appendChild(stitek);

      var pas = document.createElement('div');
      pas.className = 'trow__track';

      seznam.filter(function (r) { return r.stul === stul.id; }).forEach(function (r) {
        pas.appendChild(blokRezervace(r));
      });

      radek.appendChild(pas);
      radky.appendChild(radek);
    });
  }

  function blokRezervace(r) {
    var podil = (r.konec - r.zacatek) / ROZSAH;
    var uzky = podil < 0.115;                     // kratší než ~83 minut

    var blok = document.createElement('button');
    blok.type = 'button';
    blok.className = 'tblock is-' + r.stav + (uzky ? ' tblock--uzky' : '');
    blok.dataset.rezervace = r.id;
    blok.style.left = ((r.zacatek - OSA_OD) / ROZSAH * 100) + '%';
    blok.style.width = (podil * 100) + '%';
    blok.title = r.host + ' · ' + r.cas + '–' + P.naCas(r.konec) + ' · ' +
                 P.sklonujOsoby(r.osob) + ' · ' + STAVY[r.stav].dlouze;
    blok.setAttribute('aria-label', blok.title);

    var jmeno = document.createElement('span');
    jmeno.className = 'tblock__name';
    jmeno.textContent = r.host;

    var meta = document.createElement('span');
    meta.className = 'tblock__meta';
    meta.textContent = r.cas + ' · ' + r.osob;

    blok.appendChild(jmeno);
    blok.appendChild(meta);
    return blok;
  }

  /* -----------------------------------------------------------
     Plán v čase
     ----------------------------------------------------------- */
  function vykresliPlan() {
    var seznam = rezervace();

    $('[data-plan-time]').textContent = P.naCas(casPlanu);

    var uStolu = seznam.filter(function (r) {
      return r.zacatek <= casPlanu && r.konec > casPlanu && r.stav !== 'nedorazili';
    });
    var hostu = uStolu.reduce(function (s, r) { return s + r.osob; }, 0);
    var stoluCelkem = P.vsechnyStoly().filter(function (s) {
      return s.id < 11 || P.zahradkaOtevrena(den);
    }).length;

    $('[data-plan-note]').textContent = uStolu.length
      ? 'V ' + P.naCas(casPlanu) + ' sedí u stolů ' + hostu + ' hostů, obsazeno ' +
        uStolu.length + ' z ' + stoluCelkem + ' stolů.'
      : 'V ' + P.naCas(casPlanu) + ' není obsazený žádný stůl.';

    Object.keys(P.STOLY).forEach(function (jmenoZony) {
      var plan = $('[data-plan="' + jmenoZony + '"]');
      if (!plan) return;
      var vrstva = $('[data-tables]', plan);
      vrstva.innerHTML = '';

      P.STOLY[jmenoZony].forEach(function (stul) {
        var r = uStolu.filter(function (x) { return x.stul === stul.id; })[0];
        var mimoSezonu = stul.id >= 11 && !P.zahradkaOtevrena(den);

        vrstva.appendChild(P.nakresliStul(stul, {
          atributy: {
            class: 'table' + (r ? ' is-' + r.stav : mimoSezonu ? ' is-small' : ''),
            'data-rezervace': r ? r.id : '',
            tabindex: r ? '0' : '-1',
            role: r ? 'button' : 'img',
            'aria-label': r
              ? 'Stůl ' + stul.id + ', ' + r.host + ', ' + P.sklonujOsoby(r.osob) + ', ' + STAVY[r.stav].dlouze
              : 'Stůl ' + stul.id + ' volný'
          },
          popis: r
            ? 'Stůl ' + stul.id + ' — ' + r.host + ', ' + P.sklonujOsoby(r.osob) +
              ', ' + r.cas + '–' + P.naCas(r.konec) + ', ' + STAVY[r.stav].dlouze
            : 'Stůl ' + stul.id + ' ' + stul.kde + ' — volný',
          spodniPopisek: r ? P.sklonujOsoby(r.osob).replace(' osoby', ' os.').replace(' osob', ' os.')
                           : stul.mist + ' míst'
        }));
      });
    });
  }

  function prepniZonu(nova) {
    zona = nova;
    $$('[data-azone]').forEach(function (tl) {
      tl.setAttribute('aria-selected', String(tl.dataset.azone === nova));
    });
    /* SVGElement nemá vlastnost hidden — přepínáme atribut. */
    $$('[data-plan]').forEach(function (plan) {
      if (plan.dataset.plan === nova) plan.removeAttribute('hidden');
      else plan.setAttribute('hidden', '');
    });
  }

  /* -----------------------------------------------------------
     Seznam rezervací
     ----------------------------------------------------------- */
  function vykresliSeznam() {
    var telo = $('[data-list]');
    telo.innerHTML = '';

    var seznam = rezervace().filter(function (r) {
      return filtr === 'vse' || r.stav === filtr;
    });

    $('[data-list-empty]').hidden = seznam.length > 0;

    seznam.forEach(function (r) {
      var stul = P.stulPodleId(r.stul);
      var radek = document.createElement('tr');
      radek.dataset.rezervace = r.id;

      radek.appendChild(bunka(r.cas + '–' + P.naCas(r.konec), 'acas'));
      radek.appendChild(bunka('č. ' + r.stul + ' · ' + stul.kde, 'astul'));

      var host = document.createElement('td');
      host.className = 'ahost';
      var jmeno = document.createElement('strong');
      jmeno.textContent = r.host;
      host.appendChild(jmeno);
      if (r.poznamka) {
        var pozn = document.createElement('span');
        pozn.textContent = r.poznamka;
        host.appendChild(pozn);
      }
      radek.appendChild(host);

      radek.appendChild(bunka(String(r.osob), 'aosob'));
      radek.appendChild(bunka(r.kanal === 'web' ? 'Web' : 'Telefon', 'akanal'));

      var stavB = document.createElement('td');
      var znacka = document.createElement('span');
      znacka.className = 'stav stav--' + r.stav;
      znacka.textContent = STAVY[r.stav].popis;
      stavB.appendChild(znacka);
      radek.appendChild(stavB);

      var akce = document.createElement('td');
      akce.className = 'aakce';
      tlacitkaAkci(r).forEach(function (tl) { akce.appendChild(tl); });
      var detail = document.createElement('button');
      detail.type = 'button';
      detail.className = 'abtn abtn--ghost';
      detail.dataset.detail = r.id;
      detail.textContent = 'Detail';
      akce.appendChild(detail);
      radek.appendChild(akce);

      telo.appendChild(radek);
    });
  }

  function bunka(text, trida) {
    var td = document.createElement('td');
    if (trida) td.className = trida;
    td.textContent = text;
    return td;
  }

  /* Nabízíme jen ten krok, který v daném stavu dává smysl. */
  function tlacitkaAkci(r) {
    var kroky = [];
    if (r.stav === 'ceka')      kroky.push(['potvrzeno', 'Potvrdit', 'abtn--ember']);
    if (r.stav === 'potvrzeno') kroky.push(['dorazili', 'Dorazili', 'abtn--ember'],
                                           ['nedorazili', 'Nedorazili', 'abtn--ghost']);
    if (r.stav === 'dorazili')  kroky.push(['odesli', 'Odešli', 'abtn--ghost']);

    return kroky.map(function (k) {
      var tl = document.createElement('button');
      tl.type = 'button';
      tl.className = 'abtn ' + k[2];
      tl.dataset.akce = k[0];
      tl.dataset.rezervace = r.id;
      tl.textContent = k[1];
      return tl;
    });
  }

  /* -----------------------------------------------------------
     Detail
     ----------------------------------------------------------- */
  function otevriDetail(id) {
    var r = rezervace().filter(function (x) { return x.id === id; })[0];
    if (!r) return;

    otevrenyDetail = id;
    var stul = P.stulPodleId(r.stul);

    $('[data-detail-host]').textContent = r.host;

    var radky = [
      ['Termín', P.formatDatum(den) + ', ' + r.cas + '–' + P.naCas(r.konec)],
      ['Stůl', 'č. ' + r.stul + ' ' + stul.kde + ' (' + P.sklonujOsoby(stul.mist) + ')'],
      ['Počet osob', P.sklonujOsoby(r.osob)],
      ['Telefon', r.telefon],
      ['Zdroj', r.kanal === 'web' ? 'Rezervace přes web' : 'Telefonicky'],
      ['Stav', STAVY[r.stav].dlouze],
      ['Číslo', r.id]
    ];
    if (r.poznamka) radky.push(['Poznámka', r.poznamka]);

    var list = $('[data-detail-list]');
    list.innerHTML = '';
    radky.forEach(function (par) {
      var blok = document.createElement('div');
      var dt = document.createElement('dt');
      var dd = document.createElement('dd');
      dt.textContent = par[0];
      dd.textContent = par[1];
      blok.appendChild(dt);
      blok.appendChild(dd);
      list.appendChild(blok);
    });

    var akce = $('[data-detail-actions]');
    akce.innerHTML = '';
    tlacitkaAkci(r).forEach(function (tl) {
      tl.classList.add('abtn--wide');
      akce.appendChild(tl);
    });

    var volat = document.createElement('a');
    volat.className = 'abtn abtn--ghost abtn--wide';
    volat.href = 'tel:' + r.telefon.replace(/\s/g, '');
    volat.innerHTML = '<i class="fa-solid fa-phone" aria-hidden="true"></i> Zavolat hostovi';
    akce.appendChild(volat);

    $('[data-detail-panel]').hidden = false;
    $('[data-detail-close]').focus();
  }

  function zavriDetail() {
    $('[data-detail-panel]').hidden = true;
    otevrenyDetail = null;
  }

  /* -----------------------------------------------------------
     Změna stavu
     ----------------------------------------------------------- */
  function zmenStav(id, stav) {
    P.nastavStav(den, id, stav);
    vykresliVse();
    if (otevrenyDetail === id) otevriDetail(id);
  }

  /* -----------------------------------------------------------
     Překreslení
     ----------------------------------------------------------- */
  function vykresliVse() {
    vykresliDen();
    vykresliOsu();
    vykresliPlan();
    vykresliSeznam();
  }

  function nastavDen(novy) {
    den = novy;
    zavriDetail();
    if (!P.zahradkaOtevrena(den) && zona === 'zahradka') prepniZonu('sal');
    vykresliVse();
  }

  /* -----------------------------------------------------------
     Start
     ----------------------------------------------------------- */
  function start() {
    if (!document.body.classList.contains('admin')) return;

    $$('[data-plan]').forEach(function (plan) {
      var jmenoZony = plan.dataset.plan;
      if (P.KOSTRA[jmenoZony]) plan.insertAdjacentHTML('afterbegin', P.KOSTRA[jmenoZony]);
    });

    /* Posuvník začíná v aktuální hodině, pokud panel běží během provozu. */
    var ted = new Date();
    var minutyTed = ted.getHours() * 60 + ted.getMinutes();
    if (minutyTed >= OSA_OD && minutyTed <= OSA_DO) casPlanu = Math.round(minutyTed / 15) * 15;
    $('[data-time-slider]').value = casPlanu;

    hodiny();
    setInterval(hodiny, 30000);

    $('[data-day-prev]').addEventListener('click', function () {
      var d = new Date(den); d.setDate(d.getDate() - 1); nastavDen(d);
    });
    $('[data-day-next]').addEventListener('click', function () {
      var d = new Date(den); d.setDate(d.getDate() + 1); nastavDen(d);
    });
    $('[data-day-today]').addEventListener('click', function () { nastavDen(new Date()); });
    $('[data-day-picker]').addEventListener('change', function (e) {
      if (!e.target.value) return;
      var c = e.target.value.split('-');
      nastavDen(new Date(Number(c[0]), Number(c[1]) - 1, Number(c[2])));
    });

    $('[data-time-slider]').addEventListener('input', function (e) {
      casPlanu = Number(e.target.value);
      vykresliPlan();
    });

    $$('[data-azone]').forEach(function (tl) {
      tl.addEventListener('click', function () { prepniZonu(tl.dataset.azone); });
    });

    $$('[data-filter-stav]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        filtr = chip.dataset.filterStav;
        $$('[data-filter-stav]').forEach(function (c) {
          c.setAttribute('aria-pressed', String(c.dataset.filterStav === filtr));
        });
        vykresliSeznam();
      });
    });

    /* Akce, detaily a bloky v ose řeší jeden posluchač na dokumentu. */
    document.addEventListener('click', function (e) {
      var akce = e.target.closest('[data-akce]');
      if (akce) { zmenStav(akce.dataset.rezervace, akce.dataset.akce); return; }

      var detail = e.target.closest('[data-detail]');
      if (detail && detail.dataset.detail) { otevriDetail(detail.dataset.detail); return; }

      var blok = e.target.closest('.tblock, .table[data-rezervace]');
      if (blok && blok.dataset.rezervace) { otevriDetail(blok.dataset.rezervace); return; }

      if (e.target.closest('[data-detail-close]') ||
          e.target === $('[data-detail-panel]')) zavriDetail();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !$('[data-detail-panel]').hidden) zavriDetail();
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var stul = e.target.closest && e.target.closest('.table[data-rezervace]');
      if (stul && stul.dataset.rezervace) {
        e.preventDefault();
        otevriDetail(stul.dataset.rezervace);
      }
    });

    prepniZonu('sal');
    vykresliVse();
  }

  function hodiny() {
    var t = new Date();
    $('[data-clock]').textContent = t.getHours() + ':' + dvoj(t.getMinutes());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

})();
