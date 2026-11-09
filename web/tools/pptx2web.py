"""Convert the approved PowerPoint deck (Morph names, click builds, notes) into web/data/deck.js.

Layout is kept exactly: 13.333 x 7.5 in -> 1920 x 1080 px (144 px per inch, 1 pt = 2 px).
Every shape keeps its PowerPoint name ('!!...'), so the web Morph engine can pair shapes across slides
the same way PowerPoint does. Pictures are extracted unchanged to web/img/pptx/.

usage: python web/tools/pptx2web.py [deck.pptx] [web]
"""
import hashlib, json, os, sys
from lxml import etree
from pptx import Presentation

SRC = sys.argv[1] if len(sys.argv) > 1 else 'Tri-U_2026_Nugraha.pptx'
WEB = sys.argv[2] if len(sys.argv) > 2 else 'web'
IMG = os.path.join(WEB, 'img', 'pptx')
os.makedirs(IMG, exist_ok=True)
NS = {'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
      'p': 'http://schemas.openxmlformats.org/presentationml/2006/main',
      'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
      'p14': 'http://schemas.microsoft.com/office/powerpoint/2010/main'}
PX = 1 / 6350.0          # EMU -> px (914400 EMU per inch, 144 px per inch)


def q(tag):
    pre, t = tag.split(':')
    return '{%s}%s' % (NS[pre], t)


def X(el, path):
    return etree._Element.xpath(el, path, namespaces=NS)


def first(el, path):
    r = X(el, path)
    return r[0] if r else None


def color(el):
    """solidFill -> '#RRGGBB' (+ alpha)"""
    if el is None:
        return None, 1
    c = first(el, './a:srgbClr')
    if c is None:
        return None, 1
    a = first(c, './a:alpha')
    return '#' + c.get('val').upper(), (int(a.get('val')) / 100000 if a is not None else 1)


def xfrm(el, tag='a:xfrm'):
    x = first(el, './/' + tag) if tag else None
    if x is None:
        return None
    off, ext = first(x, './a:off'), first(x, './a:ext')
    d = {'x': int(off.get('x')) * PX, 'y': int(off.get('y')) * PX, 'w': int(ext.get('cx')) * PX, 'h': int(ext.get('cy')) * PX,
         'rot': int(x.get('rot', 0)) / 60000, 'flipH': x.get('flipH') == '1', 'flipV': x.get('flipV') == '1'}
    co, ce = first(x, './a:chOff'), first(x, './a:chExt')
    if co is not None:
        d['ch'] = {'x': int(co.get('x')) * PX, 'y': int(co.get('y')) * PX, 'w': int(ce.get('cx')) * PX, 'h': int(ce.get('cy')) * PX}
    return d


def line_props(sppr):
    ln = first(sppr, './a:ln')
    if ln is None or first(ln, './a:noFill') is not None:
        return None
    c, al = color(first(ln, './a:solidFill'))
    if c is None:
        return None
    d = {'c': c, 'w': int(ln.get('w', 12700)) / 12700 * 2, 'a': al}
    dash = first(ln, './a:prstDash')
    if dash is not None and dash.get('val') != 'solid':
        d['dash'] = dash.get('val')
    for end in ('headEnd', 'tailEnd'):
        e = first(ln, './a:' + end)
        if e is not None and e.get('type', 'none') != 'none':
            d[end] = e.get('type')
    return d


def geometry(sppr):
    pg = first(sppr, './a:prstGeom')
    if pg is not None:
        adj = {gd.get('name'): int(gd.get('fmla').split()[1]) for gd in X(pg, './a:avLst/a:gd')}
        return {'prst': pg.get('prst'), 'adj': adj}
    cg = first(sppr, './a:custGeom')
    if cg is not None:
        paths = []
        for p in X(cg, './a:pathLst/a:path'):
            cmds = []
            for c in p:
                t = etree.QName(c).localname
                pts = [[int(pt.get('x')) * PX, int(pt.get('y')) * PX] for pt in X(c, './a:pt')]
                if t == 'close':
                    cmds.append(['Z'])
                elif t in ('moveTo', 'lnTo', 'cubicBezTo', 'quadBezTo'):
                    cmds.append([{'moveTo': 'M', 'lnTo': 'L', 'cubicBezTo': 'C', 'quadBezTo': 'Q'}[t]] + pts)
            paths.append({'w': int(p.get('w', 0)) * PX, 'h': int(p.get('h', 0)) * PX, 'd': cmds,
                          'fill': p.get('fill') != 'none', 'stroke': p.get('stroke') != '0'})
        return {'cust': paths}
    return None


def text_body(el):
    tb = first(el, './p:txBody')
    if tb is None:
        return None
    bp = first(tb, './a:bodyPr')
    paras = []
    for p in X(tb, './a:p'):
        ppr = first(p, './a:pPr')
        para = {'align': (ppr.get('algn') if ppr is not None else None) or 'l', 'runs': []}
        sa = first(p, './a:pPr/a:spcAft/a:spcPts')
        if sa is not None:
            para['spaceAfter'] = int(sa.get('val')) / 100 * 2
        ls = first(p, './a:pPr/a:lnSpc/a:spcPct')
        if ls is not None:
            para['lineSpacing'] = int(ls.get('val')) / 100000
        for r in X(p, './a:r|./a:br'):
            if etree.QName(r).localname == 'br':
                para['runs'].append({'br': True}); continue
            rp = first(r, './a:rPr')
            c, _ = color(first(rp, './a:solidFill')) if rp is not None else (None, 1)
            lat = first(rp, './a:latin') if rp is not None else None
            para['runs'].append({'t': first(r, './a:t').text or '', 'sz': int(rp.get('sz', 1800)) / 100 * 2 if rp is not None else 36,
                                 'b': rp is not None and rp.get('b') == '1', 'i': rp is not None and rp.get('i') == '1',
                                 'c': c or '#111827', 'font': lat.get('typeface') if lat is not None else 'Arial'})
        if not para['runs']:
            epr = first(p, './a:endParaRPr')
            para['empty'] = int(epr.get('sz', 1800)) / 100 * 2 if epr is not None else 36
        paras.append(para)
    ins = {k: int(bp.get(k, d)) * PX for k, d in (('lIns', 91440), ('tIns', 45720), ('rIns', 91440), ('bIns', 45720))}
    return {'anchor': bp.get('anchor', 't'), 'ins': ins, 'wrap': bp.get('wrap', 'square') != 'none', 'paras': paras}


def picture(el, part):
    blip = first(el, './/a:blip')
    rid = blip.get(q('r:embed'))
    img = part.related_part(rid)
    blob = img.blob
    ext = os.path.splitext(img.partname)[1]
    h = hashlib.sha1(blob).hexdigest()[:12]
    fn = f'{h}{ext}'
    fp = os.path.join(IMG, fn)
    if not os.path.exists(fp):
        open(fp, 'wb').write(blob)
    d = {'src': f'img/pptx/{fn}'}
    am = first(blip, './a:alphaModFix')
    if am is not None:
        d['alpha'] = int(am.get('amt')) / 100000
    sr = first(el, './/a:srcRect')
    if sr is not None:
        d['crop'] = {k: int(sr.get(k, 0)) / 100000 for k in ('l', 't', 'r', 'b')}
    return d


def shape(el, part):
    tag = etree.QName(el).localname
    nv = first(el, './*[1]/p:cNvPr')
    s = {'id': int(nv.get('id')), 'name': nv.get('name')}
    if tag == 'grpSp':
        s['kind'] = 'grp'
        s.update(xfrm(first(el, './p:grpSpPr')))
        s['kids'] = [shape(c, part) for c in el if etree.QName(c).localname in ('sp', 'pic', 'grpSp', 'cxnSp')]
        return s
    sppr = first(el, './p:spPr')
    s.update(xfrm(sppr) or {'x': 0, 'y': 0, 'w': 0, 'h': 0, 'rot': 0})
    if tag == 'pic':
        s['kind'] = 'pic'
        s.update(picture(el, part))
        return s
    s['kind'] = 'sp'
    s['geom'] = geometry(sppr)
    if first(sppr, './a:noFill') is None:
        f, fa = color(first(sppr, './a:solidFill'))
        if f:
            s['fill'] = f
            if fa < 1:
                s['fillA'] = fa
    s['line'] = line_props(sppr)
    tb = text_body(el)
    if tb and any(p['runs'] for p in tb['paras']):
        s['text'] = tb
    return s


def builds(sld):
    steps = []
    for outer in X(sld, './/p:timing//p:par/p:cTn[p:stCondLst/p:cond[@delay="indefinite"]]'):
        step = []
        for eff in X(outer, './/p:cTn[@presetClass]'):
            tgt = first(eff, './/p:spTgt')
            ae = first(eff, './/p:animEffect')
            dur = first(ae, './p:cBhvr/p:cTn') if ae is not None else None
            step.append({'id': int(tgt.get('spid')), 'fx': ae.get('filter') if ae is not None else 'fade',
                         'dur': int(dur.get('dur')) if dur is not None else 350})
        steps.append(step)
    return steps


def transition(sld):
    t = first(sld, './/p:transition')
    if t is None:
        return {}
    d = {'morph': first(t, './*[local-name()="morph"]') is not None}
    dur = t.get(q('p14:dur'))
    if dur:
        d['dur'] = int(dur)
    if t.get('advTm') is not None:
        d['adv'] = int(t.get('advTm'))
    return d


prs = Presentation(SRC)
out = []
for i, slide in enumerate(prs.slides):
    sld = slide._element
    tree = first(sld, './p:cSld/p:spTree')
    shapes = [shape(c, slide.part) for c in tree if etree.QName(c).localname in ('sp', 'pic', 'grpSp', 'cxnSp')]
    notes = slide.notes_slide.notes_text_frame.text if slide.has_notes_slide else ''
    out.append({'i': i, 'shapes': shapes, 'steps': builds(sld), 'tr': transition(sld), 'notes': notes})

with open(os.path.join(WEB, 'data', 'deck.js'), 'w', encoding='utf-8') as f:
    f.write('/* generated by web/tools/pptx2web.py from %s; do not edit by hand */\nwindow.PPTX = ' % os.path.basename(SRC))
    json.dump({'w': prs.slide_width * PX, 'h': prs.slide_height * PX, 'slides': out}, f, ensure_ascii=False, separators=(',', ':'))
    f.write(';\n')
print('slides', len(out), 'images', len(os.listdir(IMG)))
for s in out:
    print(s['i'], len(s['shapes']), [len(st) for st in s['steps']], s['tr'])
