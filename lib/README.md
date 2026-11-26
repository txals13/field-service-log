# lib/ — les llibreries i les tipografies de l'app

Fins al 26 de novembre de 2026 l'app carregava aquests fitxers d'unpkg i de
jsdelivr cada vegada. Ara els carrega d'aqui, del mateix lloc d'on surt l'app:
un servidor de tercers ja no pot canviar el codi que s'executa dins de l'app, i
la primera carrega no depen de ningu mes. Les adreces dels CDN es queden als
carregadors d'`index.html` nomes com a reserva.

Son els mateixos fitxers, de les mateixes versions, que l'app ja feia servir.
**No s'han tocat:** cada un es va baixar de dues CDN (unpkg i jsdelivr), les
dues copies havien de ser identiques byte per byte, i el seu SHA-256 havia de
ser el que dona el cataleg de jsdelivr per a aquella versio del paquet.

| Fitxer | Per a que | Paquet de npm | Llicencia | Bytes | SHA-256 |
|---|---|---|---|---|---|
| `amiri-0.2.3/Amiri_400Regular.ttf` | Lletra del PDF en arab | `@expo-google-fonts/amiri@0.2.3` | SIL OFL 1.1 | 440772 | `4d3c30c7266adcfe434993a07f18ff94e012cb5a36722fb4eeab299188221201` |
| `docx-8.5.0/index.umd.js` | Informes en Word | `docx@8.5.0` | MIT | 742858 | `02d568d203c0180af37609bcf5ff6c0919d220f933a88ca896eba0556a08faad` |
| `jspdf-2.5.1/jspdf.umd.min.js` | Informes en PDF | `jspdf@2.5.1` | MIT | 364463 | `98ccf17aa10c20bb1301762618fcc9b6ab3a4e7f26b6071d64d0b41154df3875` |
| `jspdf-autotable-3.8.2/jspdf.plugin.autotable.min.js` | Taules del PDF | `jspdf-autotable@3.8.2` | MIT | 38976 | `27a9c3b61843c6312b87f142d40fe77c0f0f054c9f3cdeccc4bfd5f3322859c8` |
| `jszip-3.10.1/jszip.min.js` | ZIP del projecte | `jszip@3.10.1` | MIT o GPL-3.0 | 97630 | `acc7e41455a80765b5fd9c7ee1b8078a6d160bbbca455aeae854de65c947d59e` |
| `noto-sans-0.2.3/NotoSans_400Regular.ttf` | Lletra del PDF (llati ampliat, grec, cirilic) | `@expo-google-fonts/noto-sans@0.2.3` | SIL OFL 1.1 | 556216 | `4c8d67001d3c2977e5d6bf0a4f8add80cd564bd1df60b7569fd23751e7dda02a` |
| `noto-sans-0.2.3/NotoSans_700Bold.ttf` | Lletra del PDF (llati ampliat, grec, cirilic) | `@expo-google-fonts/noto-sans@0.2.3` | SIL OFL 1.1 | 557380 | `5528f4642755845dfc1f7ffff10d1e3887bc9f66d19d6b3ec8ec8d7e58c94c5e` |
| `pdfjs-3.11.174/pdf.min.js` | Lector de PDF (dibuixos, vista previa, tiquets) | `pdfjs-dist@3.11.174` | Apache-2.0 | 320004 | `5b5799e6f8c680663207ac5b42ee14eed2a406fa7af48f50c154f0c0b1566946` |
| `pdfjs-3.11.174/pdf.worker.min.js` | Lector de PDF (dibuixos, vista previa, tiquets) | `pdfjs-dist@3.11.174` | Apache-2.0 | 1087212 | `feabdf309770ed24bba31a5467836cdc8cf639c705af27d52b585b041bb8527b` |
| `xlsx-0.18.5/xlsx.full.min.js` | Excel | `xlsx@0.18.5` | Apache-2.0 | 881727 | `c9506197caf809a075b6dee1da0d36fb19da7158ffe8a88e7b0c96c5d8623c99` |

Al costat de cada fitxer hi ha el text de la llicencia del seu paquet. El de
les dues tipografies (`LICENSE_FONT`, SIL Open Font License) surt de la versio
seguent dels mateixos paquets (noto-sans 0.4.2 i amiri 0.4.1), perque la 0.2.3
no el portava; la llicencia de les tipografies es la mateixa.

## Per que la versio 0.2.3 de les tipografies

L'app les demanava sense numero de versio, i jsdelivr contestava amb la 0.2.3,
l'ultima que les te a l'arrel del paquet. S'han copiat exactament aquestes
(comprovat: son els mateixos bytes que tornava l'adreca que feia servir l'app),
perque els PDF surtin iguals que abans.

## Per canviar-ne una

1. Baixa la versio nova de dues CDN i comprova que son iguals i que el SHA-256
   es el del cataleg (`https://data.jsdelivr.com/v1/package/npm/<paquet>@<versio>/flat`).
2. Posa-la en una carpeta nova amb el numero de versio al nom: el service
   worker guarda aquests fitxers per sempre, i nomes una adreca nova en fa
   baixar una copia nova.
3. Canvia l'adreca al carregador d'`index.html` i a la llista `LIBS` de `sw.js`,
   i aquesta taula.

`.gitattributes` diu a git que no toqui els salts de linia de res d'aquesta
carpeta: si ho fes, els fitxers publicats deixarien de coincidir amb la taula.

Queden fora, perque s'han de carregar de Google: l'inici de sessio
(`accounts.google.com/gsi/client`) i Drive (`apis.google.com/js/api.js`). I la
tipografia Inter de les pantalles, que ve de Google Fonts.
