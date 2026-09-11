# Visa+OFF Perpinyà

Guia mòbil **independent** (no oficial) per visitar a peu les exposicions de **Visa pour
l'Image** i el circuit **OFF** a Perpinyà. HTML/CSS/JS amb mòduls, 100% estàtica —
cap backend, cap base de dades remota, cap servei de pagament.

**Estat: `productionReady: false`.** Vegeu [`INFORME_COBERTURA.md`](INFORME_COBERTURA.md)
abans de presentar-ho com un catàleg complet — l'OFF és una mostra de 10 exposicions
sobre les 146 anunciades.

## Executar en local

Qualsevol servidor HTTP estàtic serveix — cap build, cap `npm install`:

```bash
cd 99_test/prj_visa_off_perpinya/aplicacions/visaOffPerpinya
python -m http.server 8917
# → http://localhost:8917/
```

O des de `panell` (:4321): targeta *Visa+OFF Perpinyà* → «Obrir».

La geolocalització real (a «A prop» i «Ruta») només funciona amb **HTTPS** o a
`localhost` — una obertura per fitxer (`file://`) o per IP HTTP de xarxa no la té
disponible (limitació del navegador, no de l'app).

## Desplegament

Qualsevol allotjament d'estàtics amb HTTPS (imprescindible per a la geolocalització
real en un mòbil fora de `localhost`): un `python -m http.server` no serveix per a
producció, cal HTTPS de debò. Cap variable d'entorn ni clau — el JSON del catàleg ja
és a `data/`, versionat amb el codi.

Un cop desplegat, la PWA (`manifest.json` + `sw.js`) permet «Afegeix a la pantalla
d'inici» des del navegador mòbil; després d'una primera càrrega en línia, el catàleg,
els preferits i la ruta segueixen consultables sense connexió (el mapa i la
geolocalització no — necessiten xarxa).

## Actualitzar el catàleg (futures edicions)

1. Edita o substitueix `data/editions.json` / `authors.json` / `venues.json` /
   `exhibitions.json`, mantenint el mateix esquema (ids estables, mai la posició).
2. `node validate-catalog.cjs` — comprova referències trencades, ids duplicats i
   coordenades fora de l'entorn de Perpinyà.
3. Actualitza `data/coverage.json` amb els comptadors reals (no forcis els
   recomptes anunciats si la importació no els assoleix).
4. No cal tocar cap HTML/JS — tota la lògica llegeix el catàleg per `fetch`.

## Estructura

```
index.html / explora.html / ruta.html / mapa.html / fitxa.html   → les 5 pantalles
js/config.js               → configuració (window.APP)
js/modules/                → mòduls ES reals (dades, horaris, geo, estat, UI)
js/{aprop,explora,ruta,mapa,fitxa}.js  → un script per pantalla (import() dinàmic)
data/*.json                 → catàleg (font única, mai al codi)
assets/css/                  → còpia local del design-system compartit + app.css propi
assets/vendor/leaflet1.9.3/  → Leaflet vendoritzat (fixat, sense CDN)
manifest.json, sw.js          → PWA
validate-catalog.cjs          → validador d'integritat del catàleg
```

Detall d'arquitectura, decisions i desviacions de normativa: [`index.md`](index.md).
Normativa aplicada: `web-vanilla` (`_wiki-intern/normatives/norm-web-vanilla.md`).

## Comprovat en aquesta sessió (11/09/2026)

- `node --check` net a tots els `.js` (pàgines + mòduls + `sw.js`).
- `node validate-catalog.cjs` — 0 errors (37 exposicions, 19 emplaçaments, 40 autors,
  2 edicions).
- Totes les rutes internes (`href`/`src` de cada pàgina) verificades amb `curl` contra
  un servidor local — totes 200.
- Navegador real (Playwright, viewport 390×844): les 5 pantalles carreguen sense errors
  de consola; recorregut sencer targeta → fitxa → «Afegir a la ruta» → pestanya Ruta
  reflecteix la parada, provat també amb l'exposició en conflicte (Guttenfelder).
- `claude-inspector --project=...` — cadena `CLAUDE.md`/`index.md`/normativa sencera,
  0 trencats.

## Limitacions conegudes (no amagades)

- Catàleg OFF parcial (10/146) — vegeu `INFORME_COBERTURA.md` per als intents fets i
  per què la resta no és recuperable automàticament.
- Un conflicte de font sense resoldre (emplaçament de David Guttenfelder).
- Cap biografia d'autor verificada.
- El mapa i la geolocalització necessiten connexió i (en producció) HTTPS.
- Icones d'aplicació (`assets/icons/icon.svg`): marca pròpia («V+O») inventada
  expressament — **no** el logotip de Visa pour l'Image (l'app és una guia
  independent, no l'oficial).
