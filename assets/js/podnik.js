/* =============================================================
   POHODA 2.0 — společná data podniku
   Sdílí je rezervační průvodce i provozní panel, aby obě strany
   viděly stejnou obsazenost. Vše je dopočítané z data, žádný
   backend, žádné skutečné rezervace.
   ============================================================= */
window.POHODA = (function () {
  'use strict';

  /* -----------------------------------------------------------
     Dispozice: 10 stolů v sále (42 míst), 4 na zahrádce (18 míst)
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

  var DNY = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota'];
  var DNY_ZKRATKA = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];
  var MESICE = ['ledna', 'února', 'března', 'dubna', 'května', 'června',
                'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'];
  var MESICE_1 = ['Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen',
                  'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'];

  /* Ukázková jména hostů — slouží jen k tomu, aby panel nebyl prázdný.
     Rody držíme oddělené, jinak by vznikaly nesmysly jako „Tomáš Nováková". */
  var JMENA = {
    zena: {
      krestni: ['Jana', 'Marie', 'Lucie', 'Eva', 'Hana', 'Kateřina', 'Veronika',
                'Tereza', 'Alena', 'Barbora', 'Zuzana', 'Klára', 'Šárka', 'Monika'],
      prijmeni: ['Nováková', 'Dvořáková', 'Procházková', 'Veselá', 'Němcová',
                 'Pokorná', 'Krausová', 'Fialová', 'Bláhová', 'Urbanová',
                 'Šimková', 'Vávrová', 'Konečná', 'Ryšavá']
    },
    muz: {
      krestni: ['Petr', 'Tomáš', 'Martin', 'Jakub', 'Ondřej', 'Filip', 'David',
                'Michal', 'Lukáš', 'Vojtěch', 'Radek', 'Zdeněk', 'Karel', 'Štěpán'],
      prijmeni: ['Svoboda', 'Černý', 'Kučera', 'Horák', 'Marek', 'Sedláček',
                 'Beneš', 'Doležal', 'Bláha', 'Urban', 'Šimek', 'Vávra',
                 'Konečný', 'Ryšavý']
    }
  };
  var POZNAMKY = ['Dětská židlička.', 'Rádi bychom stůl u okna.',
                  'Bezlepkové jídlo pro jednoho.', 'Přijedeme možná o 10 minut později.',
                  'Oslava narozenin — dort si přineseme.', '', '', '', '', ''];

  /* -----------------------------------------------------------
     Pomocné výpočty
     ----------------------------------------------------------- */

  /* Stabilní pseudonáhoda: stejný vstup vrátí vždy stejné číslo 0–1. */
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

  function minuty(cas) {
    var c = cas.split(':');
    return Number(c[0]) * 60 + Number(c[1]);
  }

  function naCas(min) {
    var h = Math.floor(min / 60);
    var m = min % 60;
    return h + ':' + (m < 10 ? '0' + m : m);
  }

  function vecerniProvoz(d) {
    var den = d.getDay();
    return den >= 3 && den <= 6;        // středa až sobota
  }

  function zahradkaOtevrena(d) {
    var m = d.getMonth();
    return m >= 3 && m <= 8;            // duben až září
  }

  function zavira(d) { return vecerniProvoz(d) ? 22 * 60 : 16 * 60; }

  /* Jak plno ten den je: 0 = prázdno, 1 = nabito. */
  function naplnenost(d) {
    var den = d.getDay();
    var zaklad = sud('den' + klic(d)) * 0.5;
    if (den === 5 || den === 6) zaklad += 0.45;
    else if (den === 4) zaklad += 0.25;
    else if (den === 0) zaklad += 0.15;
    return Math.min(zaklad, 0.97);
  }

  function jeDnes(d) { return d.toDateString() === new Date().toDateString(); }

  function jeMinulost(d) {
    var dnes = new Date();
    dnes.setHours(0, 0, 0, 0);
    return d < dnes;
  }

  function formatDatum(d) {
    return DNY[d.getDay()] + ' ' + d.getDate() + '. ' + MESICE[d.getMonth()];
  }

  function formatKratce(d) {
    return DNY_ZKRATKA[d.getDay()] + ' ' + d.getDate() + '. ' + (d.getMonth() + 1) + '.';
  }

  function sklonujOsoby(n) {
    if (n === 1) return '1 osoba';
    if (n < 5)   return n + ' osoby';
    return n + ' osob';
  }

  function sklonujRezervace(n) {
    if (n === 1) return '1 rezervace';
    if (n < 5)   return n + ' rezervace';
    return n + ' rezervací';
  }

  function vsechnyStoly() {
    return STOLY.sal.concat(STOLY.zahradka);
  }

  function stulPodleId(id) {
    return vsechnyStoly().filter(function (s) { return s.id === id; })[0] || null;
  }

  /* -----------------------------------------------------------
     Rezervace na daný den
     Jediný zdroj obsazenosti — průvodce i provozní panel se ptají
     na totéž, takže si nikdy neodporují.
     ----------------------------------------------------------- */
  var mezipamet = {};

  function delkaSezeni(osob) { return osob >= 6 ? 150 : osob >= 4 ? 120 : 90; }

  /* Dvakrát stejné jméno v jednom dni by v panelu vypadalo jako chyba,
     proto při kolizi posouváme příjmení, dokud nenajdeme volné. */
  function jmenoHosta(zrno, pouzita) {
    var sada = sud('rod' + zrno) < 0.5 ? JMENA.zena : JMENA.muz;
    var krestni = sada.krestni[Math.floor(sud('jm' + zrno) * sada.krestni.length)];
    var start = Math.floor(sud('pr' + zrno) * sada.prijmeni.length);

    for (var i = 0; i < sada.prijmeni.length; i++) {
      var cele = krestni + ' ' + sada.prijmeni[(start + i) % sada.prijmeni.length];
      if (!pouzita[cele]) { pouzita[cele] = true; return cele; }
    }
    return krestni + ' ' + sada.prijmeni[start];
  }

  function rezervaceNaDen(d) {
    var id = klic(d);
    if (mezipamet[id]) return mezipamet[id];

    var seznam = [];
    var plnost = naplnenost(d);
    var casy = CASY_OBED.concat(vecerniProvoz(d) ? CASY_VECER : []);
    var zahrada = zahradkaOtevrena(d);
    var poradi = 0;
    var pouzitaJmena = {};

    vsechnyStoly().forEach(function (stul) {
      var jeVenku = stul.id >= 11;
      if (jeVenku && !zahrada) return;

      var obsazenoDo = 0;

      casy.forEach(function (cas) {
        var zacatek = minuty(cas);
        if (zacatek < obsazenoDo) return;              // stůl je ještě zabraný

        var los = sud('rez' + id + cas + '#' + stul.id);
        if (los >= plnost * 0.42) return;

        /* Skupina se vejde do stolu a spíš ho vyplní, než aby seděla sama. */
        var osob = Math.max(2, Math.min(stul.mist,
          2 + Math.floor(sud('osob' + id + cas + stul.id) * (stul.mist - 1))));
        var delka = delkaSezeni(osob);
        if (zacatek + delka > zavira(d)) return;

        poradi++;
        seznam.push({
          id: 'PH-' + id.replace(/-/g, '') + '-' + poradi,
          stul: stul.id,
          zona: jeVenku ? 'zahradka' : 'sal',
          cas: cas,
          zacatek: zacatek,
          konec: zacatek + delka,
          osob: osob,
          host: jmenoHosta(id + cas + stul.id, pouzitaJmena),
          telefon: '+420 ' + (601 + Math.floor(sud('tel' + id + cas + stul.id) * 178)) + ' ' +
                   String(100 + Math.floor(sud('t2' + id + cas + stul.id) * 900)) + ' ' +
                   String(100 + Math.floor(sud('t3' + id + cas + stul.id) * 900)),
          poznamka: POZNAMKY[Math.floor(sud('pz' + id + cas + stul.id) * POZNAMKY.length)],
          kanal: sud('kan' + id + cas + stul.id) < 0.62 ? 'web' : 'telefon',
          stav: null                                    // doplní se níže
        });

        obsazenoDo = zacatek + delka + 15;              // úklid stolu
      });
    });

    seznam.sort(function (a, b) { return a.zacatek - b.zacatek || a.stul - b.stul; });
    seznam.forEach(function (r) { r.stav = vychoziStav(d, r); });

    mezipamet[id] = seznam;
    return seznam;
  }

  /* Stav odvozený z času: co už proběhlo, má výsledek; co teprve přijde, čeká. */
  function vychoziStav(d, r) {
    var ted = new Date();
    var minutyTed = ted.getHours() * 60 + ted.getMinutes();

    if (jeMinulost(d) || (jeDnes(d) && r.konec < minutyTed)) {
      return sud('noshow' + r.id) < 0.08 ? 'nedorazili' : 'odesli';
    }
    if (jeDnes(d) && r.zacatek <= minutyTed) return 'dorazili';
    return sud('potvr' + r.id) < 0.25 ? 'ceka' : 'potvrzeno';
  }

  /* Drží někdo tenhle stůl v daný čas? */
  function stulObsazen(d, cas, stulId) {
    if (!d || !cas) return false;
    var zacatek = minuty(cas);
    var konec = zacatek + 90;

    return rezervaceNaDen(d).some(function (r) {
      if (r.stul !== stulId) return false;
      if (r.stav === 'zruseno' || r.stav === 'nedorazili') return false;
      return zacatek < r.konec && konec > r.zacatek;
    });
  }

  /* Zbývá v daný čas aspoň jeden volný stůl? */
  function slotObsazen(d, cas) {
    if (jeDnes(d)) {
      var ted = new Date();
      if (minuty(cas) <= ted.getHours() * 60 + ted.getMinutes()) return true;
    }
    var zahrada = zahradkaOtevrena(d);
    return !vsechnyStoly().some(function (s) {
      if (s.id >= 11 && !zahrada) return false;
      return !stulObsazen(d, cas, s.id);
    });
  }

  function maVolnyCas(d) {
    var casy = CASY_OBED.concat(vecerniProvoz(d) ? CASY_VECER : []);
    return casy.some(function (cas) { return !slotObsazen(d, cas); });
  }

  function stavDne(d) {
    if (jeMinulost(d)) return 'minulost';
    if (!maVolnyCas(d)) return 'full';
    var p = naplnenost(d);
    if (p > 0.85) return 'full';
    if (p > 0.6)  return 'busy';
    return 'free';
  }

  /* Ruční změna stavu z provozního panelu — drží se jen do reloadu. */
  function nastavStav(d, rezervaceId, stav) {
    var r = rezervaceNaDen(d).filter(function (x) { return x.id === rezervaceId; })[0];
    if (r) r.stav = stav;
    return r;
  }

  /* -----------------------------------------------------------
     Kostra plánu — stejná grafika v průvodci i v panelu
     ----------------------------------------------------------- */
  var KOSTRA = {
    sal:
      '<rect class="wall" x="16" y="16" width="728" height="438"/>' +
      '<g class="window">' +
        '<line x1="80" y1="16" x2="220" y2="16"/>' +
        '<line x1="270" y1="16" x2="410" y2="16"/>' +
        '<line x1="460" y1="16" x2="600" y2="16"/>' +
      '</g>' +
      '<text class="plan-note" x="340" y="46">okna do ulice</text>' +
      '<rect class="fixture" x="596" y="150" width="148" height="120"/>' +
      '<text class="fixture-label" x="670" y="205">VÝČEP</text>' +
      '<text class="fixture-label fixture-label--sub" x="670" y="226">Budvar · Pardál</text>' +
      '<rect class="fixture fixture--fire" x="16" y="300" width="126" height="110"/>' +
      '<text class="fixture-label" x="79" y="350">GRIL</text>' +
      '<text class="fixture-label fixture-label--sub" x="79" y="371">otevřený</text>' +
      '<g class="door"><line x1="330" y1="454" x2="440" y2="454"/></g>' +
      '<text class="plan-note" x="385" y="440">vchod</text>',

    zahradka:
      '<rect class="wall wall--soft" x="16" y="16" width="728" height="438"/>' +
      '<rect class="fixture" x="458" y="34" width="272" height="186"/>' +
      '<text class="fixture-label fixture-label--left" x="476" y="60">PERGOLA</text>' +
      '<text class="fixture-label fixture-label--sub fixture-label--left" x="476" y="79">zastřešeno</text>' +
      '<rect class="fixture fixture--fire" x="34" y="34" width="132" height="104"/>' +
      '<text class="fixture-label" x="100" y="80">GRIL</text>' +
      '<text class="fixture-label fixture-label--sub" x="100" y="101">zahradní</text>' +
      '<g class="green">' +
        '<circle cx="62" cy="212" r="26"/>' +
        '<circle cx="700" cy="304" r="22"/>' +
        '<circle cx="686" cy="392" r="30"/>' +
      '</g>' +
      '<g class="door"><line x1="300" y1="454" x2="410" y2="454"/></g>' +
      '<text class="plan-note" x="355" y="440">vstup ze sálu</text>'
  };

  var NS = 'http://www.w3.org/2000/svg';

  function svgPrvek(nazev, atributy) {
    var el = document.createElementNS(NS, nazev);
    Object.keys(atributy).forEach(function (k) { el.setAttribute(k, atributy[k]); });
    return el;
  }

  /* Vykreslí stůl i s židlemi. Volající dodá třídu a popis. */
  function nakresliStul(stul, nastaveni) {
    var g = svgPrvek('g', nastaveni.atributy || {});

    if (nastaveni.popis) {
      var titulek = svgPrvek('title', {});
      titulek.textContent = nastaveni.popis;
      g.appendChild(titulek);
    }

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

    var spodek = svgPrvek('text', { class: 'table__seats', x: stul.x, y: stul.y + 15 });
    spodek.textContent = nastaveni.spodniPopisek || (stul.mist + ' os.');
    g.appendChild(spodek);

    return g;
  }

  return {
    STOLY: STOLY, KOSTRA: KOSTRA,
    CASY_OBED: CASY_OBED, CASY_VECER: CASY_VECER,
    DNY: DNY, DNY_ZKRATKA: DNY_ZKRATKA, MESICE: MESICE, MESICE_1: MESICE_1,
    sud: sud, klic: klic, minuty: minuty, naCas: naCas,
    vecerniProvoz: vecerniProvoz, zahradkaOtevrena: zahradkaOtevrena, zavira: zavira,
    naplnenost: naplnenost, jeDnes: jeDnes, jeMinulost: jeMinulost,
    formatDatum: formatDatum, formatKratce: formatKratce,
    sklonujOsoby: sklonujOsoby, sklonujRezervace: sklonujRezervace,
    vsechnyStoly: vsechnyStoly, stulPodleId: stulPodleId,
    rezervaceNaDen: rezervaceNaDen, nastavStav: nastavStav,
    stulObsazen: stulObsazen, slotObsazen: slotObsazen,
    maVolnyCas: maVolnyCas, stavDne: stavDne,
    svgPrvek: svgPrvek, nakresliStul: nakresliStul
  };
})();
