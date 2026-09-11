---
tipus: aplicacio
ambits: []
ecosistemes: []
tecnologies:
  - html
  - css
  - javascript
  - leaflet
estat: pendent
ruta: "."
classificacio: "99"
---

# visaOffPerpinya

Normativa: [[norm-web-vanilla]]

Codi: `apps/99_test/prj_visa_off_perpinya/aplicacions/visaOffPerpinya/`

Guia mòbil independent (no oficial) per visitar a peu les exposicions de **Visa pour
l'Image** i el circuit **OFF** a Perpinyà: catàleg combinat dels dos circuits, estat
d'obertura en temps real, preferits/visitades i una ruta personal amb ordre suggerit per
proximitat. **`productionReady: false`** — vegeu `INFORME_COBERTURA.md`: el catàleg OFF
és una mostra de 10 exposicions sobre les 146 anunciades, no una importació completa.

<!-- DESIGN-SYSTEM:START -->
Estil: els estils CSS d'aquesta aplicació són una còpia local del `design-system`
compartit (`apps/00_eines/0005_disseny/prj_design_system/aplicacions/design-system/`),
feta en crear el projecte a `assets/css/` — NO és un enllaç en viu. Consulta
`design-system/README.md` per veure l'origen i quins components hi ha disponibles; per
actualitzar la còpia local amb canvis posteriors del compartit, cal l'acció explícita
"Resincronitza design-system" des de l'admin del panell — no passa sol en desar/regenerar.
<!-- DESIGN-SYSTEM:END -->

## Decisions per defecte

- **Nom / `<title>`:** "Visa+OFF Perpinyà". **Subtítol:** "Visa + OFF, a peu per
  Perpinyà".
- **Skin:** només `neutra` (sense selector de skin al topbar — l'skin corporativa
  `ajuntament` de Mataró no té sentit temàtic aquí).
- **Sense backend, sense base de dades remota, sense autenticació.** Catàleg com a JSON
  estàtic versionat a `data/`; preferits/visitades/ruta a `localStorage` (sense compte
  d'usuari).
- **Primera sortida configurada:** `2026-09-12` (`js/config.js` →
  `APP.defaultPlanDate`) — només és el valor per defecte del selector de data en mode
  «Planificar»; el mode «Ara» sempre fa servir l'hora real del dispositiu, convertida a
  `Europe/Paris`.
- **Llindar de «tanca aviat»:** 45 minuts (`APP.closingSoonMinutes`), preferència
  d'interfície, no una dada del programa.
- **Node de classificació:** `99` sandbox; reclassificació manual posterior (Ajuntament
  de Mataró → probablement `03_mobilitat` o un node de turisme/lleure personal, a decidir
  quan el catàleg estigui complet).
- **Motor de mapa:** Leaflet **1.9.3** vendoritzat (còpia del `leaflet.js`/`leaflet.css`
  «pelats» que ja porta `mapes-base`, sense el motor `MapJS` ni la configuració SIG de
  Mataró — vegeu «Desviació de normativa»).
- **Geocodificació:** Nominatim (OpenStreetMap), una vegada per emplaçament durant la
  preparació del catàleg (mai en obrir l'app) — 19/19 emplaçaments geocodificats
  l'11/09/2026, 12 amb portal exacte i 7 a nivell de carrer/plaça (sense número).

## Arquitectura

Multi-pàgina amb `router.js` del design-system (navegació sense recàrrega, `#main-content`
+ `<title>` es canvien dins d'un `startViewTransition`; el chrome —capçalera compacta i
la barra de navegació inferior— no es toca mai):

```
index.html    → "A prop" (vista inicial): llista agrupada per seu + distància
explora.html  → "Explora": cerca + filtres sobre tot el catàleg
ruta.html     → "Ruta": selecció agrupada per seu, ordre suggerit, estimació editorial
mapa.html     → "Mapa" (secundària): un marcador per emplaçament, Leaflet + OSM
fitxa.html    → Fitxa d'una exposició (?edition=…&id=…), accessible per URL directa
```

- **`js/config.js`** → `window.APP` (títol, subtítol, data per defecte, llindars, punt de
  referència del centre de Perpinyà, claus de `localStorage`).
- **`js/modules/`** (ES modules reals, `export`/`import`): `storage.js` (embolcall
  try/catch de `localStorage`), `data.js` (`fetch` del catàleg + índexs, amb còpia a
  `localStorage` per a ús sense connexió), `opening.js` (estat d'obertura — obert / tanca
  aviat / tancat / no començat / finalitzat / desconegut — sempre en «hora de paret» de
  `Europe/Paris`), `geo.js` (geolocalització sota demanda, distància en línia recta,
  enllaç «Com arribar» a Google Maps mode a peu), `state.js` (preferits/visitades/ruta/punt
  de partida/mode Ara-Planificar, tot a `localStorage`), `ui.js` (targeta d'exposició, grup
  per seu, píndola d'estat — sense `innerHTML` amb dades del catàleg).
- **`js/aprop.js` / `explora.js` / `ruta.js` / `mapa.js` / `fitxa.js`** — un script
  **clàssic** (no `type="module"`) per pantalla, que carrega els mòduls anteriors amb
  `import()` **dinàmic** dins d'una IIFE. Vegeu «Desviació de normativa» — és necessari
  perquè `router.js` funcioni bé amb navegació sense recàrrega.

## Model de dades (`data/*.json`)

`editions.json` / `authors.json` / `venues.json` / `exhibitions.json` + `coverage.json`
(comptadors d'importació/verificació, separats del catàleg mateix). Identificadors
estables (`visa-2026-loin-du-ciel`, `minimes`…), mai la posició en un array. Una
exposició referencia `editionId` + `authorIds[]` + `venueId` (o `venueCandidates[]` +
`venueClaims[]` quan hi ha un conflicte de font sense resoldre, com l'exposició de David
Guttenfelder). `openingHours.intervals` és una llista de `[inici,fi]`; `null` = horari
desconegut (mai substituït per un valor inventat), `[]` = tancat confirmat. Preferits,
visitades i ruta guarden `editionId::exhibitionId`, no posicions.

**Actualitzar el catàleg en una edició futura:** edita els `data/*.json` (o substitueix-los
sencers) mantenint el mateix esquema, i executa `node validate-catalog.cjs` (arrel del
projecte) — comprova referències trencades, ids duplicats i coordenades fora de l'entorn
de Perpinyà abans de publicar. No cal tocar cap fitxer HTML/JS.

## Desviació de normativa

- **Càrrega de mòduls ES amb `import()` dinàmic des d'scripts clàssics** (`js/aprop.js`
  i companyia), en lloc de `<script type="module" src="…">` directe: `router.js` del
  design-system compartit recrea els `<script src>` en navegar sense recàrrega però **no
  conserva `type="module"`** — un script de pàgina carregat així trencaria en la primera
  navegació. `import()` dinàmic funciona igual des d'un script clàssic i és compatible amb
  el contracte real de `router.js` (recarregat només un cop, `ds:navigated` per als
  re-renders). Els mòduls compartits (`js/modules/*.js`) sí són ES modules «normals»
  (`export`/`import`), ja que mai es referencien directament amb `<script src>` — només
  amb `import()`. **No s'ha tocat `router.js` compartit** per no arriscar la resta d'apps
  que en depenen.
- **Motor de mapa:** Leaflet «pla» (còpia del `leaflet.js`/`leaflet.css` de `mapes-base`,
  sense el motor `MapJS` ni la configuració SIG de Mataró — les capes WMS de `mapes-base`
  són específiques del territori de Mataró, no de Perpinyà) + tessel·les públiques
  d'OpenStreetMap. **No es fa servir `components/map.css` (`.ds-map*`)**: la pantalla
  «Mapa» és a pantalla completa sota el chrome mòbil, no el shell de 3 zones (cerca +
  mapa + llista) pensat per a escriptori que `map.css` dona per fet. Mateix tipus de
  desviació que documenten [[seguimentTerritori]] i `visorMapes`.
- **Component nou al catàleg compartit:** `.ds-tabbar` (barra de navegació inferior mòbil)
  — no hi havia cap component equivalent (`.ds-nav` és per a escriptori). Detall,
  justificació i fitxa de demostració: `design-system/README.md` § Components i
  `estilguia/pages/tots-els-components.html#tabbar`.

## Normes del projecte

- Aplicació personal, sense multiusuari ni backend (norma web-vanilla). Cap credencial ni
  servei de pagament.
- Tots els textos visibles, en català; títols originals de les exposicions, sense traduir.
- Les dades de negoci van als JSON (`data/`), mai al codi JavaScript. Resums editorials
  només quan hi ha una font verificada — mai generats a partir només del títol o del nom
  de l'autor (norma explícita de l'encàrrec).
- Res d'`innerHTML` amb dades del catàleg — DOM via `createElement`/`textContent`
  (`js/modules/ui.js`).
- No s'ha afegit cap framework (React, jQuery…) ni servei de tercers de pagament.
- **PWA (millora progressiva):** `manifest.json` + `sw.js` — cache-first per al shell,
  network-first amb reserva per als JSON del catàleg. **No es cachegen tessel·les de mapa
  ni peticions a Nominatim** (política dels servidors públics d'OSM).

## Comandes de verificació

- `node --check js/*.js js/modules/*.js sw.js` — ha de sortir net (fet: 11/09/2026, tots
  OK).
- `node validate-catalog.cjs` — integritat referencial del catàleg (ids duplicats,
  referències trencades, coordenades fora de l'entorn de Perpinyà). Fet: cap error, 37
  exposicions / 19 emplaçaments / 40 autors / 2 edicions.
- Servir amb qualsevol servidor HTTP simple (`python -m http.server`, o `panell` via
  `/files/`) i comprovar les 5 pantalles + la fitxa amb `?edition=…&id=…` directe —
  **totes les rutes internes (`href`/`src` de cada pàgina) s'han comprovat amb `curl`
  contra un servidor local i totes resolen 200** (fet: 11/09/2026).
- `claude-inspector`:
  `node cli.js --project=C:/Users/jbertran/apps/99_test/prj_visa_off_perpinya/aplicacions/visaOffPerpinya`

## Cobertura de dades i limitacions conegudes

Vegeu `INFORME_COBERTURA.md` i `data/coverage.json` per al detall complet (què s'ha
verificat, què queda pendent, i per què). Resum:

- **Visa: 27/27 exposicions importades**, títols contrastats amb una font de premsa
  independent. Horari = regla general del festival (font pública diferent, verificada).
  **1 conflicte sense resoldre**: emplaçament de David Guttenfelder (Minimes segons la
  fitxa web, Dominicains segons el preprograma PDF) — `visapourlimage.com` ha bloquejat
  totes les peticions automatitzades d'aquesta sessió (HTTP 403, HTML i PDF).
- **OFF: 10/146 exposicions** (mostra, no catàleg complet) — la guia 2026 (calameo,
  flipbook) i les pàgines de categories no exposen text extraïble, només imatges; s'ha
  confirmat de nou aquest bloqueig en aquesta sessió. **94 adreces de comerços** sí s'han
  pogut recuperar (`festivaloff-perpignan.fr/les-commerçants`) i s'han fet servir per
  confirmar/precisar les 9 adreces OFF ja conegudes — no s'han inventat exposicions noves.
- **19/19 emplaçaments geocodificats** (Nominatim, 11/09/2026): 12 amb portal exacte, 7 a
  nivell de carrer/plaça.
- **Cap biografia d'autor verificada** (40 autors, `bioCa: null` a tots) — secundari
  segons l'encàrrec i bloquejat per la mateixa limitació de `visapourlimage.com`.
