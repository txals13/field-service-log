# Segona eina de traduccions: troba els textos de la interficie sense traduccio i
# els trossos enganxats a una dada, que el pas pel DOM no pot traduir.
#   python i18n2.py <index.html> scan  <out.json>          -> llista del que falta
#   python i18n2.py <index.html> apply <tr.json> [--dry]   -> embolica els trossos i afegeix les traduccions
import io, re, sys, json, html as htmlmod

F = sys.argv[1]; MODE = sys.argv[2]
src = io.open(F, encoding='utf-8', newline='').read()
CRLF = '\r\n' in src[:4000]
src = src.replace('\r\n', '\n')
i0 = src.index('<script>\n(function(){') + len('<script>\n')
js = src[i0:]
js_line0 = src[:i0].count('\n') + 1

def unesc(s):
    out = []; k = 0
    while k < len(s):
        c = s[k]
        if c == '\\' and k + 1 < len(s):
            d = s[k + 1]
            if d == 'n': out.append('\n'); k += 2
            elif d == 't': out.append('\t'); k += 2
            elif d == 'r': out.append('\r'); k += 2
            elif d == 'u' and re.fullmatch(r'[0-9a-fA-F]{4}', s[k + 2:k + 6] or ''):
                out.append(chr(int(s[k + 2:k + 6], 16))); k += 6
            elif d == 'x' and re.fullmatch(r'[0-9a-fA-F]{2}', s[k + 2:k + 4] or ''):
                out.append(chr(int(s[k + 2:k + 4], 16))); k += 4
            elif d == '\n': k += 2
            else: out.append(d); k += 2
        else: out.append(c); k += 1
    return ''.join(out)
def jsq(s):
    return '"' + s.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n') + '"'

# ── tokenise: strings, comments, regexes ──
strings = []       # (start, end, quote)
i, n = 0, len(js); last_sig = ''
REGEX_PREV = set('(,=:[!&|?{};+-*%<>~^')
while i < n:
    c = js[i]
    if c == '/' and js[i + 1:i + 2] == '/':
        j = js.find('\n', i); i = n if j < 0 else j; continue
    if c == '/' and js[i + 1:i + 2] == '*':
        j = js.find('*/', i + 2); i = n if j < 0 else j + 2; continue
    if c in '"\'`':
        j = i + 1
        while j < n and js[j] != c:
            if js[j] == '\\': j += 1
            j += 1
        strings.append((i, j + 1, c)); last_sig = '"'; i = j + 1; continue
    if c == '/':
        pw = re.search(r'([A-Za-z_$][\w$]*)\s*$', js[max(0, i - 20):i])
        if last_sig in REGEX_PREV or last_sig == '' or (pw and pw.group(1) in ('return', 'typeof', 'case', 'in', 'of', 'delete', 'void')):
            j = i + 1; incls = False
            while j < n:
                ch = js[j]
                if ch == '\\': j += 2; continue
                if ch == '[': incls = True
                elif ch == ']': incls = False
                elif ch == '/' and not incls: break
                elif ch == '\n': break
                j += 1
            i = j + 1; last_sig = ')'; continue
    if not c.isspace(): last_sig = c
    i += 1
def line_of(pos): return js_line0 + js.count('\n', 0, pos)
_m = list(js)
for (_a, _b, _q) in strings:
    for _k in range(_a + 1, _b - 1): _m[_k] = ' '
MASK = ''.join(_m)
def in_glued_bracket(a, b):
    # a branch of a ternary inside a bracket that is itself glued: "a "+(x?"b":"c")+" d"
    d = 0; k = a - 1; op = -1
    while k >= 0 and a - k < 1500:
        ch = MASK[k]
        if ch == ')': d += 1
        elif ch == '(':
            if d == 0: op = k; break
            d -= 1
        elif ch in ';{}' and d == 0: break
        k -= 1
    if op < 0: return False
    d = 0; k = b; cl = -1
    while k < n and k - b < 1500:
        ch = MASK[k]
        if ch == '(': d += 1
        elif ch == ')':
            if d == 0: cl = k; break
            d -= 1
        k += 1
    if cl < 0: return False
    return bool(re.search(r'\+\s*$', MASK[max(0, op - 6):op]) or re.match(r'\s*\+', MASK[cl + 1:cl + 7]))

tops = [(m.start(), m.group(2)) for m in re.finditer(r'^(?:async function|function|var)\s+([A-Za-z_$][\w$]*)()', js, re.M)]
tops = [(m.start(), m.group(1)) for m in re.finditer(r'^(?:async function|function|var)\s+([A-Za-z_$][\w$]*)', js, re.M)]
def top_of(pos):
    lo, hi = 0, len(tops) - 1; name = '(top)'
    while lo <= hi:
        mid = (lo + hi) // 2
        if tops[mid][0] <= pos: name = tops[mid][1]; lo = mid + 1
        else: hi = mid - 1
    return name

# ── the tables ──
ua = js.index('var UI={'); ub = js.index('}};   // UI[lang]', ua) + 2
na = js.index('var NV_T={'); nb = js.index('};\nfunction nvT', na) + 1
SKIP_RANGES = [(ua, ub), (na, nb)]
EN, ES = {}, {}
def pairs(a, b):
    seq = [s for s in strings if a <= s[0] < b]
    out = []
    for idx, s in enumerate(seq[:-1]):
        if js[s[1]:s[1] + 1] == ':' and seq[idx + 1][0] == s[1] + 1:
            out.append((unesc(js[s[0] + 1:s[1] - 1]), unesc(js[seq[idx + 1][0] + 1:seq[idx + 1][1] - 1]), s[0]))
    return out
def load_block(a, b, es_at, en_at):
    for k, v, pos in pairs(a, b):
        if pos >= en_at: EN.setdefault(k.strip(), v)
        elif pos >= es_at: ES.setdefault(k.strip(), v)
load_block(ua, ub, js.index('es:{', ua), js.index('\nen:{', ua))
load_block(na, nb, js.index('es:{', na), js.index('\nen:{', na))
for m in re.finditer(r'Object\.keys\(es\)\.forEach\(function\(k\)\{NV_T\.es\[k\]=es\[k\]\}\);', js):
    a = js.rfind('var es={', 0, m.start()); e = js.find('en={', a)
    load_block(a, m.start(), a, e); SKIP_RANGES.append((a, m.end() + 80))

CORE = re.compile(r'^([^0-9A-Za-zÀ-ɏ(«"\'\[{]*)([\s\S]*?)([\s…:.!?›→]*)$')
def core(s):
    m = CORE.match(s); return m.group(2)
ENC, ESC = {}, {}
for k, v in EN.items(): ENC.setdefault(core(k), core(v))
for k, v in ES.items(): ESC.setdefault(core(k), core(v))
def has(k, tab, tabc):
    k = k.strip()
    return k in tab or (core(k) != '' and core(k) in tabc)
EN_VALS = set(core(v) for v in EN.values()) | set(core(v) for v in ES.values())

SKIP_TOPS = set('''UI NV_T NV_IC NV_LOGO NV_ART RPT TSR TSL LANGS buildReportHTML buildPdfBlob buildDocxBlob buildDocxDocument buildTimesheetBlob
buildXlsxBlob exportXLSX buildHistoryHTML partsBlockReport partsReportHTML partsSummaryHTML reportMetaGroups pdfMetaGroups pdfH2 wordH2 repH2 ptReportRows
reportDayTitle reportDaySummary pdfFont PDF_HEAD EX_GEM_SYS GEM_SYS LBL_SYS GEM_DAYS ROOT_NAME OUT_NAME PICKER_KEY NAME_STOP LIC_PUB WINANSI_HI
txBatch labelsFetch daySummaryInput exBuildXlsx exGemRead APP_VERSION pdfLaunchLinks driveFind mhRender'''.split())

def looks_text(t):
    s = t.strip()
    if not re.search(r'[A-Za-zÀ-ſ]{2}', s): return False
    if re.fullmatch(r'[a-z0-9_$.#:\-\[\]=,>*()\s"\'|?^+]+', s) and ' ' not in s: return False
    if re.search(r'://|^data:|^[.#][\w-]+|[{};]$|^(var|function|return)\b', s): return False
    if re.fullmatch(r'[\w-]+(\.[\w-]+)+', s): return False
    if re.fullmatch(r'[a-z0-9]+[A-Z][\w-]*', s): return False
    if re.fullmatch(r'[A-Z0-9_]{2,}', s) and not has(s, EN, ENC): return False
    if re.search(r'(px|rem|%)(;|$)|rgba?\(|var\(--', s): return False
    if re.fullmatch(r'[\w.+-]+/[\w.+*-]+(;\s*(charset|codecs)=[\w.-]+)?', s): return False
    if re.search(r'^(Bearer|Content-|X-Upload|Range$|multipart/|use strict|AIza|bytes |idb |AbortController|%%EOF|Authorization$|SHA-256$|Amiri$)', s): return False
    if re.fullmatch(r'[a-z]{2}-[A-Z]{2}', s): return False
    if re.search(r'^[?&/;"=|]|="|=$|^\w+=\w*$|^\(pointer|/$|^\w+\[|^nextPageToken', s): return False
    if re.search(r'^[\w-]+:[\w#(-]', s) and ' ' not in s: return False
    if re.fullmatch(r'([a-z][\w]*-[\w-]*\s?)+|[a-z]+( [a-z0-9]+-[\w-]+)+', s): return False     # class lists
    if re.fullmatch(r'(Escape|Enter|ArrowRight|ArrowLeft|AbortError|NotAllowedError|center center|Btn|In|libs\?|!cols|dd/mm/yyyy)', s): return False
    return True

ENT = re.compile(r'&(?:[a-zA-Z]+|#\d+|#x[0-9a-fA-F]+);')
items = []     # one per text part found
for (a, b, q) in strings:
    if any(x <= a < y for x, y in SKIP_RANGES): continue
    top = top_of(a)
    if top in SKIP_TOPS: continue
    raw = js[a + 1:b - 1]
    if not re.search(r'[A-Za-zÀ-ſ\\]{2}', raw): continue
    before = js[max(0, a - 60):a]; after = js[b:b + 8]
    mcall = re.search(r'\b(uiT|nvT|nvPl|pl|alert|confirm|prompt|Error)\(\s*$', before)
    mcall2 = re.search(r'\b(pl|nvPl)\([^()]*,\s*(?:"[^"]*",\s*)?$', before)
    call = mcall.group(1) if mcall else (mcall2.group(1) if mcall2 else '')
    glue_l = bool(re.search(r'\+\s*$', before)); glue_r = bool(re.match(r'\s*\+', after))
    if not (glue_l or glue_r) and re.search(r'[?:]\s*$', before) and not re.search(r'(case\s[^:]*|[{,]\s*[\w$]+)\s*:\s*$', before) and in_glued_bracket(a, b):
        glue_l = glue_r = True
    # split the raw literal into tags and text
    parts = []; pos = 0; L = len(raw)
    first_lt = raw.find('<'); first_gt = raw.find('>')
    if first_gt >= 0 and (first_lt < 0 or first_gt < first_lt):
        parts.append(('tag', 0, first_gt + 1)); pos = first_gt + 1
    for m in re.finditer(r'<[^<>]*>', raw):
        if m.start() < pos: continue
        if m.start() > pos: parts.append(('text', pos, m.start()))
        parts.append(('tag', m.start(), m.end())); pos = m.end()
    tail_lt = raw.rfind('<')
    if tail_lt >= pos and '>' not in raw[tail_lt:]:
        if tail_lt > pos: parts.append(('text', pos, tail_lt))
        parts.append(('tag', tail_lt, L)); pos = L
    if pos < L: parts.append(('text', pos, L))
    has_tags = any(p[0] == 'tag' for p in parts)
    # attributes that sit whole inside the literal
    v = unesc(raw)
    for m in re.finditer(r'(?:title|placeholder|aria-label)="([^"<>]*)(")?', v):
        t = htmlmod.unescape(m.group(1)).strip()
        if looks_text(t):
            items.append(dict(pos=a, line=line_of(a), top=top, kind='attr' if m.group(2) else 'attr-open', key=t, call=call, wrap=None))
    for idx, (typ, s0, s1) in enumerate(parts):
        if typ != 'text': continue
        seg = raw[s0:s1]
        m = re.match(r'^((?:\s|\\n|&nbsp;)*)([\s\S]*?)((?:\s|\\n|&nbsp;)*)$', seg)
        lead, mid, trail = m.group(1), m.group(2), m.group(3)
        if not mid: continue
        key = htmlmod.unescape(unesc(mid))
        if not looks_text(key): continue
        left_ok = (idx > 0) or not glue_l
        right_ok = (idx < len(parts) - 1) or not glue_r
        complete = left_ok and right_ok
        if not has_tags and re.search(r'(class|style|id|href|src|data-[\w-]+|type|name|value|for)=\\?"?$', js[max(0, a - 200):a].replace(' ', '')[-40:]):
            continue
        items.append(dict(pos=a, end=b, line=line_of(a), top=top, kind='html' if has_tags else 'plain', key=key, call=call,
                          complete=complete, s0=s0 + len(lead), s1=s1 - len(trail), has_ent=bool(ENT.search(mid) or '\\' in mid)))

def status(k):
    if has(k, EN, ENC): return 'ok' if has(k, ES, ESC) else 'no-es'
    if core(k) in EN_VALS: return 'val'
    return 'MISSING'

if MODE == 'scan':
    out = []
    for it in items:
        st = status(it['key'])
        need_wrap = (it['kind'] in ('html', 'plain') and not it.get('complete', True) and it['call'] not in ('uiT', 'nvT', 'pl', 'nvPl')) \
                    or (it['kind'] == 'plain' and it['call'] in ('alert', 'confirm', 'prompt', 'Error')) or it['kind'] == 'attr-open'
        if st in ('ok', 'val') and not need_wrap: continue
        out.append(dict(line=it['line'], top=it['top'], kind=it['kind'], key=it['key'], st=st, wrap=need_wrap, call=it['call']))
    json.dump(out, io.open(sys.argv[3], 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    import collections
    print('items', len(items), 'to do', len(out), collections.Counter((o['st'], o['wrap']) for o in out))
    print('unique keys missing', len(set(o['key'] for o in out if o['st'] == 'MISSING')), 'no-es', len(set(o['key'] for o in out if o['st'] == 'no-es')),
          'EN', len(EN), 'ES', len(ES))

if MODE == 'noes':
    for k in EN:
        if not has(k, ES, ESC): print(k.replace('\n', '\n'), ' => ', EN[k].replace('\n', '\n'))

if MODE == 'apply':
    trfile = sys.argv[3]; dry = '--dry' in sys.argv
    need = {}
    for it in items:
        st = status(it['key'])
        if st in ('MISSING', 'no-es'): need.setdefault(core(it['key']), st)
    tr = []; problems = []; covered = set()
    for ln in io.open(trfile, encoding='utf-8').read().split('\n'):
        if not ln.strip(): continue
        parts = [p.strip() for p in ln.split('@@')]
        ca, en = parts[0], parts[1]; es = parts[2] if len(parts) > 2 else ''
        force = ca.startswith('+'); ca = ca[1:] if force else ca
        BN = chr(92) + 'n'
        ca = ca.replace(BN, '\n'); en = en.replace(BN, '\n'); es = es.replace(BN, '\n')
        if ca.endswith('~'):
            pre = ca[:-1]; c = [k for k in need if k.startswith(pre)]
            if len(c) != 1: problems.append(('prefix', pre, len(c))); continue
            key = c[0]
        else:
            key = ca if force else core(ca)
            if not force and key not in need: problems.append(('not needed', key))
        covered.add(key); tr.append((key, en, es))
    EXCL = re.compile(r"in parents|trashed=|A-Za-z0-9|^Drive$|^Prova$|^Full$|^Esquema elèctric$|^Week$|^Pos$")
    by_lit = {}; attr_open = []; skipped = []
    for it in items:
        if it['kind'] == 'attr-open': attr_open.append((it['line'], it['key'])); continue
        if it['kind'] not in ('html', 'plain'): continue
        nw = (not it['complete'] and it['call'] not in ('uiT', 'nvT', 'pl', 'nvPl')) or (it['kind'] == 'plain' and it['call'] in ('alert', 'confirm', 'prompt', 'Error'))
        if not nw: continue
        if EXCL.search(it['key']): continue
        if re.search(r'[<>&]', it['key']): skipped.append((it['line'], it['key'])); continue
        by_lit.setdefault((it['pos'], it['end']), []).append((it['s0'], it['s1'], it['key']))
    edits = []
    for (a, b), ws in by_lit.items():
        q = js[a]; raw = js[a + 1:b - 1]; ws.sort(); pieces = []; cur = 0
        for s0, s1, key in ws:
            if s0 > cur: pieces.append(q + raw[cur:s0] + q)
            pieces.append('uiT(' + jsq(key) + ')'); cur = s1
        if cur < len(raw): pieces.append(q + raw[cur:] + q)
        rep = '+'.join(pieces)
        if len(pieces) > 1 and js[b:b + 1] in '.[': rep = '(' + rep + ')'
        edits.append((a, b, rep))
    edits.sort(reverse=True)
    out = js
    for a, b, rep in edits: out = out[:a] + rep + out[b:]
    add_en = [(k, en) for k, en, es in tr if en and k not in EN]
    add_es = [(k, es) for k, en, es in tr if es and k not in ES]
    def block(pairs): return ''.join('  ' + jsq(k) + ':' + jsq(v) + ',\n' for k, v in pairs)
    p = out.index('var UI={'); pe = out.index('es:{\n', p) + 5
    out = out[:pe] + block(add_es) + out[pe:]
    pn = out.index('\nen:{\n', p) + 6
    out = out[:pn] + block(add_en) + out[pn:]
    print('wrap edits', len(edits), 'en added', len(add_en), 'es added', len(add_es))
    for pr in problems: print('PROBLEM', pr)
    left = [k for k in need if k not in covered]
    print('NOT COVERED', len(left))
    for k in left: print('   ', need[k], '|', k.replace('\n', '\n')[:150])
    print('ATTR-OPEN', len(attr_open))
    for l, k in attr_open: print('   ', l, k[:120])
    print('SKIPPED (markup chars)', skipped)
    if not dry:
        res = src[:i0] + out
        if CRLF: res = res.replace('\n', '\r\n')
        io.open(F, 'w', encoding='utf-8', newline='').write(res)
        print('written')

if MODE == 'low':
    import collections
    seen = collections.OrderedDict()
    for (a, b, q) in strings:
        if any(x <= a < y for x, y in SKIP_RANGES): continue
        top = top_of(a)
        if top in SKIP_TOPS: continue
        raw = js[a + 1:b - 1]; v = unesc(raw).strip()
        if not re.fullmatch(r"[a-zàèéíïòóúüç·'()«»]+( [a-zàèéíïòóúüç'()«»]+){0,4}", v) or len(v) < 2: continue
        before = js[max(0, a - 60):a]; after = js[b:b + 8]
        if re.search(r'\b(uiT|nvT|nvPl|pl)\(\s*$', before) or re.search(r'\b(pl|nvPl)\([^()]*,\s*("[^"]*",\s*)?$', before): continue
        gl = bool(re.search(r'\+\s*$', before)); gr = bool(re.match(r'\s*\+', after))
        if not (gl or gr): continue
        if raw == v and not (raw.startswith(' ') or raw.endswith(' ')) and ' ' not in v: 
            # a bare word with no space around it: an id, a class, a key
            continue
        seen.setdefault(v, []).append(line_of(a))
    for k, ls in seen.items(): print(k, '|', ls[:6], '' if has(k, EN, ENC) else 'MISSING')
