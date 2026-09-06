# Pohoda 2.0

One-page prezentace restaurace **Pohoda 2.0** — grill & pivnice, Strojírenská 396/4,
Žďár nad Sázavou. Klikatelné demo pro prezentaci klientovi: statické HTML, CSS a JavaScript,
žádný build, žádný backend.

## Spuštění

Stačí otevřít `index.html` v prohlížeči. Pokud chcete adresu na `localhost`
(mapa a fonty se načítají z CDN, takže je potřeba připojení):

```bash
python -m http.server 5173
```

Pak `http://localhost:5173`.

## Struktura

| Cesta | Obsah |
|---|---|
| `index.html` | Celá one-page prezentace |
| `rezervace.html` | Čtyřkrokový výběr termínu, času a konkrétního stolu v plánu |
| `assets/css/tokens.css` | Barvy, typografická škála, rozestupy, zlomy pro velké obrazovky |
| `assets/css/main.css` | Základ, komponenty a jednotlivé sekce |
| `assets/css/responsive.css` | Zlomy od 390 px po televizi, plus tisková verze lístku |
| `assets/css/rezervace.css` | Krokovník, kalendář, časové sloty a plán podniku |
| `assets/js/app.js` | Mobilní menu, filtr lístku, otevírací doba, odeslání formulářů |
| `assets/js/rezervace.js` | Průchod rezervací, obsazenost, vykreslení plánu |
| `DESIGN.md` | Design systém „Modern Bohemian Hearth" |

## Co je v demu jen naoko

Rezervace ani přihlášení k novinkám nikam neodesílají — potvrdí se v prohlížeči a tím to
končí. Obsazenost dnů, časů a stolů se dopočítává z data a času, takže při každém otevření
vypadá stejně, ale žádná skutečná data za ní nejsou. Otevírací doba a stav
„otevřeno / zavřeno" se počítají ze skutečných hodin, takže se během dne mění.

## Dispozice podniku v plánu

Vnitřní sál má 10 stolů (42 míst), zahrádka 4 stoly (18 míst) a je v provozu od dubna do
září. Rozmístění je návrh podle veřejně uváděné kapacity kolem 50 míst — než půjde demo
ke klientovi, patří ověřit se skutečnou dispozicí.

## Průchod demem

**Úvodní stránka:** Úvod → Příběh restaurace a speciality → Výběr z jídelního lístku
s filtrem → Polední meníčka → Rychlá rezervace a provozní informace → Patička s kontakty.

**Rezervace:** Termín a počet osob → Čas → Stůl v plánu sálu nebo zahrádky → Kontakt →
Potvrzení s číslem rezervace.
