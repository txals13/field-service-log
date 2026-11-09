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

## Taules de dades (`tables[]`)

Un manual no porta només llistes de peces penjades d'un dibuix. Porta la llista de
recanvis recomanats, la llista de materials elèctrica, els plans d'inspecció, neteja i
lubricació, les peces de format, els punts de consignació… Totes són taules, i el
recanvis-splitter les extreu amb el mateix motor que les llistes de peces: marques la
regió al full, detecta les columnes i dius què és cadascuna. El resultat viatja al
mateix `<Manual>.json`, al costat dels `conjunts`:

```
tables:[ {
  kind,                      // spares | electrical | maint | format | spec |
                             // signals | loto | parts | free
  name,                      // com l'ha batejada qui ha fet l'extracció
  pages:[…],                 // pàgines del manual original d'on surt
  fields:[…],                // les claus que porten les files, en ordre
  labels:{clau:"Ròtul"},     // només a les taules lliures, el ròtul tal com es va escriure
  rows:[ { <clau>:valor, …, page } ]
} ]
```

Una sola forma per a totes les menes: qui ho llegeix mira `fields[]` i després cada
fila, sense haver de saber res de la taula per endavant. `rows[].page` és, com a les
llistes de peces, la pàgina **al manual original**.

Les **matrius** hi arriben com a taula lliure (`kind:"free"`) amb `labels`: la de
manteniment de components comercials (p. 107 del BPF-140) té un camp `component` i
tretze camps més, un per tasca, amb el ròtul de la tasca tal com el manual l'escriu
en diagonal («Check hoses») i a cada cel·la el codi de periodicitat (D, S/W, M, B,
T/Q, Bi, A) o res. El field app hi llegeix, per a un tipus de component, què toca
fer i cada quan.

## Lectura automàtica i índex del manual (`sections[]`)

Un manual PRODEC és el mateix manual cada vegada: la mateixa capçalera a cada pàgina
del cos, els mateixos encapçalaments numerats, la llista de recanvis sota els mateixos
quatre ròtuls, el mateix caixetí EPLAN a cada esquema. El recanvis-splitter té un botó
«⚡ Llegeix el manual» que fa una passada per totes les pàgines, reconstrueix l'índex
de seccions a partir dels encapçalaments del cos (l'índex imprès no porta els números
de pàgina al text) i dispara una recepta per secció: fitxa de màquina, recanvis
recomanats, matriu de manteniment, pàgines clau, i a l'annex el mapa de fulls, la
llista de materials elèctrica i **els dibuixos**. Tot el que en surt és el mateix que a
mà, als mateixos panells, i s'edita igual.

**Els dibuixos i la jerarquia.** Cada full de l'annex mecànic que porta la seva llista
de peces és un dibuix: nom i número del caixetí, files de la capçalera impresa. La
lectura automàtica els penja tots d'**un sol conjunt** (el de l'annex, amb el número
de projecte), **un grup per dibuix** amb el seu nom, i un subgrup amb el número i les
files. El field app no necessita que la jerarquia vulgui dir res: la resolució del toc
és `row.page === pàgina && row.pos === token`, i la jerarquia només alimenta el
selector de dibuixos — on una llista plana de dibuixos pel seu nom és el que el tècnic
busca. Si algun dia cal agrupar per família (els `02.18.*`, els `04.35.*`), es fa al
splitter sense tocar el contracte.

> Enllaç pendent al field app: els refs de la llista de recanvis (`15-27--0-20`) i els
> números dels dibuixos de peces de format (`1527-020`) són el mateix codi escrit de
> dues maneres; comparar-los sense res que no sigui lletra o xifra els fa coincidir.

L'índex viatja al JSON:

```
sections:[ { num:"5.9", title:"RECOMMENDED SPARE PARTS LIST", page:128 } ]
```

Al field app és la taula de continguts del manual vinculat: «obre'm la secció 5.3»
sense haver de saber a quina pàgina cau.

## Fitxa de màquina (`machine`)

`machine` ja no són només `serial`, `model` i `client`. El full de dades del manual
diu qui l'ha feta i amb què s'alimenta, i tot això s'agafa amb el mateix 🎯 que el
número de sèrie, apuntat a la pàgina que toqui (al BPF-140, la 8 per a les dades
generals i la 15 per a potència i aire):

```
machine:{ serial, model, client, manufacturer, project, year, purpose, site,
          voltage, freq, power, airBar, airLpm }     // tot text, tal com surt del full
```

Els valors són el text triat, no números parsejats («10 Kw», «6 (Bar)»): qui els
necessiti com a número els neteja en llegir-los. Les claus que falten o són buides
volen dir «no consta». Un catàleg antic només porta les tres primeres i segueix
sent vàlid.

## Pàgines marcades (`refs[]`)

Una part del que el manual sap no és text: on són els punts de consignació, per on
entra l'aire, quin quadre és quin, on comença cada secció. Són dibuixos i fotografies,
i no hi ha res a extreure'n — però hi ha la pàgina, i un número de pàgina ja és prou,
perquè el visor del field app obre qualsevol pàgina d'aquest mateix manual.

```
refs:[ { kind,            // location | section | procedure | other
         page,            // pàgina al manual original
         label } ]        // el nom que se li ha posat
```

Una pàgina, un punter: el recanvis-splitter no en deixa marcar dues vegades la mateixa.
Al field app això és, de moment, una llista de dreceres — «ensenya'm els punts de
consignació» obre la pàgina 110 del manual vinculat.

## Mapa de fulls d'esquema (`sheets[]`)

La llista de materials elèctrica diu a quin **full** és cada dispositiu (`full`: «90»,
«211», «741A»), i un full no és una pàgina: l'annex d'esquemes té la seva numeració,
impresa al caixetí de cada full, i on cau dins el PDF depèn del que el manual hi ha
posat davant. El recanvis-splitter llegeix el caixetí de cada pàgina de l'annex i en fa
el mapa:

```
sheets:[ { sheet:"90", page:245 } ]     // full d'esquema -> pàgina al manual original
```

Amb això, al field app un dispositiu de la llista (`tables[kind=electrical].rows[].full`)
és a dos tocs del seu circuit: `full` → `sheets` → `page` → visor. Els números de full
són text (poden dur lletra, «741A») i es comparen tal qual.

> **El remapatge, les taules, les pàgines marcades, el mapa de fulls i l'índex no es porten.** Viuen a pàgines que
> no són de cap conjunt (la 128 dels recanvis recomanats, la 285 de la llista
> elèctrica, la 110 de la consignació, tot l'annex d'esquemes), de manera que un PDF
> retallat no les conté i no
> hi ha cap numeració on posar-les. Per a la parella del field app, doncs: **manual
> sencer i renumeració desactivada**. L'exportació avisa si s'intenta el contrari.

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
  Compte: això i les `tables[]` / `refs[]` / `sheets[]` són incompatibles — un PDF retallat no conté
  les seves pàgines. Si algun dia es vol tot alhora, el retall haurà d'incloure-les.
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
