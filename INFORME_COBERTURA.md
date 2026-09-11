# Informe de cobertura — Visa+OFF Perpinyà

Preparat: 2026-09-11. **`productionReady: false`** — aquest catàleg no és una guia
exhaustiva. Aquest informe separa, com exigeix l'encàrrec, exposicions **anunciades**,
**importades**, amb **seu verificada**, amb **coordenades verificades**, amb **horari
verificat** i **pendents** — sense forçar cap recompte.

## Resum

| | Anunciades | Importades | Seu assignada | Coordenades | Horari confirmat |
|---|---|---|---|---|---|
| **Visa** | 27 | **27** | 26 (1 en conflicte) | 27/27 (via seu) | 27/27 (regla general) |
| **OFF** | 146 | **10** | 10/10 | 9/10 (via seu) | 0/10 |

**Emplaçaments:** 19/19 geocodificats (Nominatim, 11/09/2026) — 12 amb portal exacte, 7
a nivell de carrer/plaça (sense número). **Autors:** 40, cap biografia verificada.

## Visa pour l'Image — 27/27 importades

Els 27 títols, autors i emplaçaments del fitxer de recerca inicial s'han **contrastat
amb una font de premsa independent** (phototrend.fr, article del 08/2026) — coincideixen
literalment. L'horari (10-20h, gratuït, 29/08-13/09) és la **regla general publicada pel
festival** (font pròpia, `visapourlimage.com/les-expositions/`, no la fitxa individual de
cada exposició).

**No verificat directament en aquesta sessió:** el contingut de cada fitxa individual
(`visapourlimage.com/les-expositions/2026/...`) ni el preprograma PDF — **el lloc bloqueja
totes les peticions automatitzades (HTTP 403)**, tant a l'HTML com al PDF. Es va provar:
fetch directe de la pàgina de llistat, fetch d'una fitxa individual, fetch del PDF, i
`web.archive.org` (no accessible des d'aquest entorn). Cap ha funcionat.

**Conflicte sense resoldre:** l'exposició de **David Guttenfelder** (*The People of
Minneapolis vs. ICE*) té dues fonts contradictòries sobre l'emplaçament (Minimes segons
la fitxa web recollida al fitxer inicial; Dominicains segons el preprograma PDF del
07/08/2026). S'ha intentat resoldre-ho contra la font oficial (bloquejada) i amb premsa
(cap article esmenta l'emplaçament). **Es mostra a l'app amb totes dues afirmacions i les
fonts, sense assignar-hi un punt definitiu** — tal com exigia l'encàrrec.

## OFF de Perpinyà — 10/146 importades (mostra, no catàleg complet)

Els 10 registres del fitxer inicial (Annex B) s'han mantingut, amb les adreces **confir­mades
i, en alguns casos, precisades** contra `festivaloff-perpignan.fr/les-commerçants` (llista
completa de 94 comerços participants recuperada amb èxit en aquesta sessió).

**Intents de completar les 136 exposicions restants (aquesta sessió, 11/09/2026):**

1. Guia 2026 completa (calameo, flipbook) — `www.calameo.com/capsud66/...`: **socket
   hang up** en un intent, i en un segon intent el contingut és només imatges sense text
   associat.
2. Pàgines de categoria del web (`festivaloff-perpignan.fr/categorie-2`, `/categorie-3`,
   `/les-expos-2026`, `/les-expos-2026-1`): totes mostren **galeries d'imatges numerades
   genèricament** (`EXPO_OFF-01.jpg` … `EXPO_OFF-103.jpg`) **sense `alt` ni text associat
   amb títol, autor o emplaçament**.
3. Cerca web (premsa, blogs) de llistats del programa OFF 2026: només resultats generals
   sobre el festival (xifres, tema, patrocinadors), cap llistat d'exposicions.

**Conclusió: les dades de les 136 exposicions restants no són recuperables amb les eines
d'aquesta sessió** — coincideix amb el que ja anotava l'encàrrec ("l'enllaç de la guia i
les imatges de les categories no s'han pogut recuperar íntegrament"). La via real per
completar-ho és la **inspecció visual manual** de la guia (PDF/flipbook) que el mateix
encàrrec preveia com a pla B — descarregar-la i revisar-la pàgina a pàgina no és una tasca
d'scraping automàtic.

**Recomanació per completar el catàleg:** obrir `www.calameo.com/capsud66/books/...` (o
demanar el PDF directament a l'associació OFF) i, full a full, anotar títol/autor/emplaçament
a `data/exhibitions.json` seguint l'esquema existent — after `node validate-catalog.cjs`
per comprovar-ho abans de publicar.

## Limitacions explícites (no s'han saltat per completar el catàleg)

- Cap resum editorial ni biografia generats a partir només del títol o el nom — quan no
  n'hi ha una font, el camp queda `null` i la interfície ho mostra com a pendent.
- Cap coordenada inventada — les 19 són d'una geocodificació real (Nominatim), amb el
  nivell de precisió (portal / carrer) marcat explícitament.
- El recompte de 27/146 anunciades és el que publiquen els organitzadors — no s'ha
  «arrodonit» ni forçat cap xifra d'importació per fer-la semblar més completa.
