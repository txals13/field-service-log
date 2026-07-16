# Integració Recanvis ↔ Field Service Log — Disseny

Objectiu: dins el **Field Service Log**, mentre es registra una incidència, el tècnic
pot obrir el dibuix de la màquina, **tocar el número de posició** sobre el plànol i
adjuntar les dades del recanvi (Pos / Ref / Cant / Denominació) a l'entrada, de manera
que surtin a l'informe.

Font de les dades: l'app **recanvis-splitter** (`Drawings data for field application`,
repo `recanvis-splitter`), que processa el manual PDF i n'exporta un catàleg JSON.

## Decisions preses

- **Selecció:** toc visual sobre el dibuix (no només llista).
- **Origen dels fitxers:** auto des de Drive per màquina, un cop provisionats.
- **Arquitectura:** dues apps separades + pont via JSON (baix acoblament).
- **Provisió:** gestor de "Manuals" DINS el field app (puja la parella PDF+JSON a Drive).

## Els dos fitxers enllaçats (el contracte)

Per màquina, una parella amb el **mateix nom base**:

| Fitxer | Conté | Rol |
|--------|-------|-----|
| `<Manual>.pdf` | Pàgines de dibuixos (el manual original complet) | El que es veu |
| `<Manual>.json` | Catàleg de recanvis | Les dades a l'informe |

Estructura del JSON (export combinat del recanvis-splitter):
```
{
  exportedAt, sourceFile:"<Manual>.pdf",
  machine:{serial, model, client}, portadaPage,
  conjunts:[ { name, num, grups:[ { name, pages:[…], subgrups:[
      { name, rows:[ {pos, ref, cant, denominacio, page} ] } ] } ] } ]
}
```
**Clau de l'enllaç:** cada `row` porta `page` = número de pàgina **al manual original**.
Per això el field app ha de carregar el **manual complet** (no el PDF retallat de
recanvis), perquè els números de pàgina hi coincideixin.

> Cap canvi necessari al recanvis-splitter: el JSON ja porta `page` a cada fila.

## Restricció Drive: scope `drive.file`

El field app només pot llegir fitxers que **ell mateix** ha creat. Conseqüència:
els manuals s'han de **pujar a través del field app** (així queden "seus" i després
els pot llistar/descarregar). Fitxers penjats per fora del field app NO serien visibles.
→ valida el gestor de Manuals com a única via de provisió.

## Canvis al model de dades (field app)

- **Entrada** guanya `parts: [{pos, ref, cant, denominacio, conjunt, grup, page}]`.
- **Sessió** guanya `manualRef: { name, pdfFileId, jsonFileId }` (quin manual té vinculat).
- **Índex de manuals** (llista de parelles disponibles a Drive), guardat al fitxer de
  sync o com a `manuals.json` a Drive.

### Disposició a Drive
```
Field Service Log/
  Manuals/
    <Manual>/
      <Manual>.pdf
      <Manual>.json
```

## Components i fluxos

### A. Gestor de Manuals (provisió, un cop per màquina)
- UI nova al field app: llista de manuals + botó "Afegeix manual".
- Puja la parella PDF+JSON → el field app la desa a `Manuals/<Manual>/` a Drive i
  afegeix una entrada a l'índex (nom, machine del JSON, ids de Drive).

### B. Vincular manual a sessió (un cop per sessió)
- A la sessió: "Vincula manual" → tria de l'índex de Manuals.
- Suggeriment automàtic comparant `session.machine` (text lliure) amb `machine.model`
  / `machine.serial` del catàleg.
- Es desa `session.manualRef`. A partir d'aquí, càrrega automàtica a qualsevol dispositiu.

### C. Visor de dibuixos (pdf.js)
- Carregar pdf.js per CDN amb fallbacks (patró existent; el SW ja deixa passar
  unpkg/jsdelivr/cdnjs).
- Descarregar el PDF del manual des de Drive un cop i **cachejar-lo a IndexedDB**
  (ús offline al camp). Renderitzar **només la pàgina necessària** (memòria mòbil).
- Navegació: triar conjunt/grup → obre la/les `page` corresponents.

### D. Toc sobre el número → resolució
- Reaprofitar la lògica "pick text" del recanvis-splitter (`buildPickItems` +
  hit-test de text-items de pdf.js amb coordenades de canvas).
- El tècnic toca a prop d'un globus de Pos → s'obté el token numèric → es busquen
  files on `row.page === pàginaActual && row.pos === token`.
- Si hi ha més d'una coincidència (rar, subgrups solapats a la mateixa pàgina) →
  petit selector. Confirmació abans d'adjuntar ("Pos. 12 — Ref … — nom. Afegir?").
- Fallback a mòbil: llista cercable de peces de la pàgina.

### E. Informe
- Entrades amb `parts[]` mostren una taula compacta (Pos / Ref / Denominació / Cant)
  sota la descripció, als exports HTML / PDF / DOCX (mateix patró que `images[]`).

## Consideracions tècniques

- **pdf.js** nou al field app (CDN + fallback). Worker mateix domini → cobert pel SW.
- **Memòria mòbil:** mai carregar el PDF sencer com a base64; obrir el doc i renderitzar
  pàgina a pàgina (com fa el recanvis-splitter).
- **Offline:** cachejar el PDF del manual + el JSON a IndexedDB després de la 1a càrrega.
- **Mida del manual:** si els manuals són molt grossos, optimització futura = exportar
  un PDF retallat AMB remapatge de `page` al JSON (feina extra al recanvis-splitter).
- **Precisió del toc a mòbil:** tolerància generosa al hit-test + confirmació + fallback llista.

## Ordre de construcció (per fases)

1. **Model + informe** — `entry.parts[]` + render als informes. Aïllat i provable de seguida.
2. **Gestor de Manuals** — pujar/llistar la parella a `Manuals/` a Drive.
3. **Vincular manual a sessió** (+ suggeriment per text de màquina).
4. **Visor de dibuixos** — pdf.js, descàrrega+cache, render per pàgina.
5. **Toc sobre el número** — resolució i adjuntar a l'entrada.

## Qüestions obertes (per decidir quan implementem)

- Índex de manuals: dins el fitxer de sync existent o `manuals.json` separat a Drive?
- Vinculació 1:N: una sessió pot necessitar més d'un manual (màquina + subconjunts)?
- Manuals grossos: acceptem descarregar el PDF sencer, o prioritzem el PDF retallat+remap?
- On viu el botó "Afegeix recanvi": a l'editor d'entrada, a la barra de l'entrada, o ambdós?
