"""Phase 5.8 (v9) - compose deck/slides.js from build/content.json.

v9 (Dandy: "jangan bintik-bintik semua, masukin grafik dll, tulisan jangan sama semua"):
every slide gets (a) its own text composition and (b) a visual that explains it, built from the
paper's real numbers (charts), schematic diagrams, the real PDB 2OH4 structure, or the contour brain.
All visible strings come from content.json (verified verbatim by ingest.py); chart geometry is
computed here from those same numbers.
"""
import json, html, math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
C = json.loads((ROOT / "build/content.json").read_text(encoding="utf-8"))
S = {s["n"]: s for s in C["slides"]}
e = html.escape
T = {0: 0.00, 1: 0.05, 2: 0.17, 3: 0.32, 4: 0.46, 5: 0.53, 6: 0.60, 7: 0.66, 8: 0.86, 9: 0.93, 10: 1.00, 11: 1.00, 12: 1.00, 13: 1.00}
SIDE = {n: ("r" if n in (2, 4, 6, 8, 10, 11, 12, 13) else "l") for n in range(1, 14)}
FX = {1: "words", 2: "wipe", 3: "slide", 4: "flip", 5: "scale", 6: "count", 7: "strike", 8: "split", 9: "panel", 10: "letters",
      11: "fade", 12: "fade", 13: "fade"}

def b(n, k): return e(S[n]["body"][k])
def a(i, inner, cls="", tag="div"): return f'<{tag} class="a {cls}" style="--i:{i}">{inner}</{tag}>'
def eyebrow(n, i=0): return a(i, b(n, "kicker"), "eyebrow")
def words(text, k0=0):
    return " ".join(f'<span class="w"><span style="--k:{k0+i}">{x}</span></span>' for i, x in enumerate(text.split()))
def title(n, cls, accent=None, acc_cls="acc", mode="words"):
    t = e(S[n]["title"])
    if accent:
        h = e(accent); assert h in t, (n, h)
        pre, post = t.split(h, 1)
        k = len(pre.split())
        return (f'<h1 class="t {cls}">' + (words(pre) + " " if pre.strip() else "") +
                f'<span class="{acc_cls}">{words(h, k)}</span>' + (" " + words(post.strip(), k + len(h.split())) if post.strip() else "") + '</h1>')
    return f'<h1 class="t {cls}">{words(t)}</h1>'
def num(v, cls="", frm=None):
    f = f' data-from="{frm}"' if frm is not None else ""
    return f'<span class="num {cls}" data-count="{e(v)}"{f}>{e(v)}</span>'
def svg(inner, label, cls=""):
    return f'<svg class="viz-svg {cls}" viewBox="0 0 808 860" role="img" aria-label="{e(label)}">{inner}</svg>'
def txt(x, y, s, cls="", anchor="start"):
    return f'<text x="{x:.1f}" y="{y:.1f}" class="{cls}" text-anchor="{anchor}">{s}</text>'

# ---------------------------------------------------------------- visuals
def viz_canvas(kind, caption=""):
    cap = f'<p class="viz-cap">{caption}</p>' if caption else ""
    return f'<canvas class="viz-canvas" data-viz="{kind}" width="808" height="760"></canvas>{cap}'

def viz_waffle():          # 91 patients, median split 46 HIGH / 45 LOW (paper)
    out, k = [], 0
    for r in range(7):
        for c in range(13):
            hi = k < 46
            out.append(f'<circle class="dot pop {"hi" if hi else "lo"}" cx="{86 + c*53}" cy="{250 + r*53}" r="18" style="--d:{k}"/>'); k += 1
    legend = (txt(86, 170, b(2, "vz_split"), "lab caps") +
              f'<circle class="dot hi" cx="104" cy="694" r="14"/>' + txt(130, 704, b(2, "vz_high"), "lab big") +
              f'<circle class="dot lo" cx="404" cy="694" r="14"/>' + txt(430, 704, b(2, "vz_low"), "lab big"))
    return svg("".join(out) + legend, "91 patients split at the median of KDR expression: 46 high, 45 low", "waffle")

def viz_angio():           # schematic, not data
    vessels = ["M808,250 C700,250 640,300 560,330 S430,380 380,420", "M808,520 C720,520 660,500 590,480 S450,470 390,470",
               "M808,700 C700,700 650,650 590,600 S470,560 400,520", "M680,250 C640,200 600,190 560,200", "M650,700 C620,760 580,780 540,770"]
    v = "".join(f'<path class="vessel draw" d="{d}" pathLength="1" style="--d:{i}"/>' for i, d in enumerate(vessels))
    sig = "".join(f'<circle class="sig" cx="0" cy="0" r="7" style="--d:{i}; --y:{350 + (i % 5) * 45}px"/>' for i in range(14))
    rec = "".join(f'<g class="rec pop" style="--d:{i}" transform="translate(600,{290 + i*90})"><path d="M0,0 L-26,-18 M0,0 L-26,18 M0,0 L22,0"/><circle cx="-28" cy="-19" r="5"/><circle cx="-28" cy="19" r="5"/></g>'
                  for i in range(5))
    drug = "".join(f'<g class="drug pop" style="--d:{6+i}" transform="translate({470 + i*8},{360 + i*95})"><path d="M0,0 L-14,-14 M0,0 L-14,14 M0,0 L16,0"/></g>' for i in range(3))
    inner = (f'<defs><radialGradient id="tum" cx="40%" cy="40%"><stop offset="0" stop-color="#FFC24B"/><stop offset=".55" stop-color="#FF6FA8"/><stop offset="1" stop-color="#B0206A"/></radialGradient></defs>'
             f'<circle class="tumour pop" cx="230" cy="470" r="128" fill="url(#tum)"/>' + v +
             '<line class="wall draw" x1="610" y1="230" x2="610" y2="720" pathLength="1"/>' + rec + sig + drug +
             txt(230, 650, b(3, "vz_tumour"), "lab big", "middle") + txt(430, 300, b(3, "vz_signal"), "lab", "middle") +
             txt(800, 140, b(3, "vz_receiver"), "lab", "end") + txt(800, 850, b(3, "vz_vessel"), "lab", "end") +
             txt(40, 790, b(3, "vz_drug"), "lab lime", "start"))
    return svg(inner, "Schematic: a tumour sends a signal; receivers (VEGFR-2) on the vessel wall; new blood vessels grow towards the tumour; bevacizumab blocks the signal", "angio")

def viz_pipeline():
    nodes = [("cyan", b(4, "m1h"), b(4, "vz_mri"), "mri"), ("cyan", "", b(4, "vz_desc"), "bars"),
             ("magenta", b(4, "m2h"), b(4, "m2t"), "scatter"), ("magenta", "", b(4, "vz_rf"), "tree"),
             ("amber", b(4, "m3h"), b(4, "m3t"), "helix")]
    icons = {
        "mri": "".join(f'<rect x="{-20 + c*14}" y="{-20 + r*14}" width="11" height="11" rx="2"/>' for r in range(3) for c in range(3)),
        "bars": "".join(f'<rect x="{-20 + i*11}" y="{18 - h}" width="8" height="{h}" rx="1.5"/>' for i, h in enumerate([14, 30, 22, 36])),
        "scatter": "".join(f'<circle cx="{x}" cy="{y}" r="3.2"/>' for x, y in [(-18, 12), (-9, 6), (-2, 8), (6, -3), (14, -8), (19, -16)]) + '<line x1="-22" y1="16" x2="22" y2="-18"/>',
        "tree": '<line x1="0" y1="-18" x2="-14" y2="2"/><line x1="0" y1="-18" x2="14" y2="2"/><line x1="-14" y1="2" x2="-20" y2="18"/><line x1="-14" y1="2" x2="-6" y2="18"/><line x1="14" y1="2" x2="20" y2="18"/><circle cx="0" cy="-18" r="4"/>',
        "helix": '<path d="M-18,-18 C0,-18 0,0 -18,0 S0,18 -18,18 M18,-18 C0,-18 0,0 18,0 S0,18 18,18"/>',
    }
    out = ['<line class="spine draw" x1="120" y1="150" x2="120" y2="720" pathLength="1"/>']
    for i, (col, head, sub, ic) in enumerate(nodes):
        y = 150 + i * 142
        out.append(f'<g class="node pop {col}" style="--d:{i}" transform="translate(120,{y})"><circle r="40"/><g class="ico">{icons[ic]}</g></g>')
        if head: out.append(txt(190, y - 8, head, f"lab big {col}"))
        out.append(txt(190, y + (24 if head else 8), sub, "lab"))
    return svg("".join(out), "Pipeline: MRI, descriptors, correlation with KDR under FDR control, Random Forest with nested validation, PDB 2OH4 structure", "pipeline")

def viz_checks():
    grid = "".join(f'<rect class="cell" x="{90 + c*19}" y="{150 + r*13}" width="15" height="9" rx="1.5" style="--d:{(r*32+c)%60}"/>' for r in range(22) for c in range(32))
    rows = []
    for j, (lab, cover) in enumerate([(b(5, "vz_all"), 1.0), (b(5, "vz_only"), 0.8)]):
        y = 560 + j * 150
        sq = "".join(f'<rect class="pt {"te" if i >= 24 else "tr"}" x="{90 + i*21}" y="{y}" width="17" height="30" rx="3"/>' for i in range(30))
        br = f'<path class="brace {"bad" if j == 0 else "good"} draw" pathLength="1" d="M90,{y-14} L90,{y-24} L{90 + 630*cover - 4},{y-24} L{90 + 630*cover - 4},{y-14}"/>'
        rows.append(sq + br + txt(90, y - 38, lab, "lab " + ("magenta" if j == 0 else "cyan")))
    inner = (txt(90, 112, b(5, "vz_mult") + " · " + b(5, "vz_tests"), "lab caps") + grid +
             txt(90, 476, b(5, "vz_leak"), "lab caps") + "".join(rows) +
             f'<rect class="pt tr" x="90" y="815" width="17" height="17" rx="3"/>' + txt(116, 829, b(5, "vz_train"), "lab small") +
             f'<rect class="pt te" x="330" y="815" width="17" height="17" rx="3"/>' + txt(356, 829, b(5, "vz_test"), "lab small"))
    return svg(inner, "Two checks: 704 tests at once; feature selection on all the data versus only the training data", "checks")

def viz_bars():            # 704 tested -> 61 nominal -> 35 expected -> 0 survive FDR (paper)
    vals = [("704", 704, b(6, "vz_tested"), "slate"), ("61", 61, b(6, "vz_nominal"), "cyan"), ("35", 35, b(6, "vz_chance"), "amber"), ("0", 0, b(6, "vz_fdr"), "magenta")]
    base, top, out = 690, 180, []
    k = (base - top) / 704
    for i, (s, v, lab, col) in enumerate(vals):
        x = 70 + i * 180; h = v * k
        out.append(f'<rect class="bar grow {col}" x="{x}" y="{base - h:.1f}" width="120" height="{max(h, 0):.1f}" style="--d:{i}"/>')
        if v == 0: out.append(f'<line class="zero {col}" x1="{x}" y1="{base}" x2="{x+120}" y2="{base}"/>')
        out.append(f'<text class="val {col}" x="{x+60}" y="{base - h - 18:.1f}" text-anchor="middle"><tspan class="num" data-count="{s}">{s}</tspan></text>')
        parts = lab.split(" ", 1) if len(lab) > 12 else [lab]
        for j, p in enumerate(parts): out.append(txt(x + 60, base + 46 + j * 28, p, "lab", "middle"))
    out.append(f'<line class="axis" x1="50" y1="{base}" x2="790" y2="{base}"/>')
    return svg("".join(out), "Bar chart: 704 descriptors tested, 61 nominally significant, 35 expected by chance, 0 survived FDR correction", "bars")

def auc_x(v): return 90 + (v - 0.3) / 0.5 * 640
def viz_auc():             # AUC 0.687 ± 0.081 (non-nested) vs 0.497, 95% CI 0.346–0.648 (nested) — paper
    o = []
    for t in (0.3, 0.4, 0.5, 0.6, 0.7, 0.8):
        o.append(f'<line class="grid" x1="{auc_x(t):.1f}" y1="220" x2="{auc_x(t):.1f}" y2="660"/>' + txt(auc_x(t), 700, f"{t:.1f}", "tick", "middle"))
    o.append(txt(auc_x(0.55), 748, b(7, "vz_auc"), "lab caps", "middle"))
    o.append(f'<line class="chance draw" x1="{auc_x(.5):.1f}" y1="200" x2="{auc_x(.5):.1f}" y2="670" pathLength="1"/>' + txt(auc_x(.5) - 10, 186, b(7, "vz_chance"), "lab amber", "end"))
    rows = [(320, b(7, "vz_nn"), 0.687, 0.687 - 0.081, 0.687 + 0.081, b(7, "vz_nnv"), "slate"), (580, b(7, "vz_n"), 0.497, 0.346, 0.648, b(7, "vz_nv"), "magenta")]
    for i, (y, lab, v, lo, hi, vl, col) in enumerate(rows):
        o.append(txt(90, y - 46, lab, "lab big"))
        o.append(f'<line class="ci draw {col}" x1="{auc_x(lo):.1f}" y1="{y}" x2="{auc_x(hi):.1f}" y2="{y}" pathLength="1" style="--d:{i}"/>')
        o.append(f'<line class="cap {col}" x1="{auc_x(lo):.1f}" y1="{y-12}" x2="{auc_x(lo):.1f}" y2="{y+12}"/><line class="cap {col}" x1="{auc_x(hi):.1f}" y1="{y-12}" x2="{auc_x(hi):.1f}" y2="{y+12}"/>')
        mv = f' style="--from:{auc_x(0.687) - auc_x(v):.1f}px"' if i == 1 else ""
        o.append(f'<circle class="pt-auc {col} {"mover" if i == 1 else "pop"}" cx="{auc_x(v):.1f}" cy="{y}" r="15"{mv}/>')
        o.append(txt(790, y - 46, vl, "lab " + col, "end"))
    o.append(f'<path class="gap draw" pathLength="1" d="M{auc_x(.497):.1f},420 L{auc_x(.497):.1f},432 L{auc_x(.687):.1f},432 L{auc_x(.687):.1f},420"/>' +
             txt((auc_x(.497) + auc_x(.687)) / 2, 466, b(7, "vz_opt"), "lab lime big", "middle"))
    return svg("".join(o), "AUC: non-nested 0.687 ± 0.081 versus nested 0.497 (95% CI 0.346–0.648); 0.5 means guessing", "auc")

def viz_pairs():           # Table 1, both descriptor sets (paper)
    rows = [(b(8, "vz_tested"), 704, 1098), (b(8, "vz_nominal"), 61, 682), (b(8, "vz_fdr"), 0, 479)]
    x0, k, o = 250, 420 / 1098, []
    o.append(f'<rect class="bar slate" x="60" y="128" width="22" height="22" rx="4"/>' + txt(94, 146, b(8, "vz_a") + " · 91", "lab"))
    o.append(f'<rect class="bar amber" x="60" y="166" width="22" height="22" rx="4"/>' + txt(94, 184, b(8, "vz_b") + " · 86", "lab"))
    for i, (lab, va, vb) in enumerate(rows):
        y = 290 + i * 170
        o.append(txt(60, y + 26, lab, "lab big"))
        for j, (v, col) in enumerate([(va, "slate"), (vb, "amber")]):
            yy = y - 30 + j * 56; w = v * k
            o.append(f'<rect class="bar growx {col}" x="{x0}" y="{yy}" width="{max(w, 0):.1f}" height="38" rx="4" style="--d:{i*2+j}"/>')
            if v == 0: o.append(f'<line class="zero {col}" x1="{x0}" y1="{yy}" x2="{x0}" y2="{yy+38}"/>')
            o.append(f'<text class="val {col}" x="{x0 + w + 14:.1f}" y="{yy + 29}"><tspan class="num" data-count="{v}">{v}</tspan></text>')
    o.append(f'<line class="axis" x1="{x0}" y1="230" x2="{x0}" y2="740"/>')
    return svg("".join(o), "Paired bars from Table 1: tested 704 vs 1098, nominal 61 vs 682, FDR q<0.05 0 vs 479", "pairs")

def viz_protein(labels=True):
    legend = (f'<p class="viz-cap"><span class="sw lime"></span>{b(9, "vz_inh")} <span class="sw white"></span>{b(9, "vz_v")} · {b(9, "vz_d")} · {b(9, "vz_f")}'
              f' <span class="muted">— VEGFR-2 kinase domain, {b(9, "vz_pdb")}</span></p>')
    return f'<canvas class="viz-canvas" data-viz="protein{"" if labels else "-plain"}" width="808" height="760"></canvas>' + legend

VIZ = {1: viz_canvas("brain"), 2: viz_waffle(), 3: viz_angio(), 4: viz_pipeline(), 5: viz_checks(), 6: viz_bars(), 7: viz_auc(),
       8: viz_pairs(), 9: viz_protein(), 10: viz_canvas("brain-warm"), 11: viz_auc(), 12: viz_pairs(), 13: viz_protein()}

# ---------------------------------------------------------------- text compositions (each slide different)
L = {}
L[1] = (eyebrow(1) + title(1, "hero", "KDR/VEGFR-2", "acc cyan") +
        a(3, f'<p class="byline"><strong>{b(1,"authors")}</strong> &nbsp;·&nbsp; {b(1,"affil")}</p>') +
        a(4, f'<div class="stat-hero">{num("15")}<span class="unit">months</span><span class="lbl">{b(1,"stat_label")}</span></div>') +
        a(5, f'<p class="credit">{b(1,"credit")}</p>', "foot"))
L[2] = (eyebrow(2) + title(2, "h-l", "not from tissue.", "acc underline") +
        '<dl class="defs">' + a(3, f'<dt>{b(2,"c1h")}</dt><dd>{b(2,"c1")}</dd>', "def") + a(4, f'<dt>{b(2,"c2h")}</dt><dd>{b(2,"c2")}</dd>', "def") + '</dl>' +
        a(5, f'<p class="inline-stat">{num(b(2,"n"))}<span>{b(2,"nl")}</span></p>') + a(6, f'<p class="quote">{b(2,"noscan")}</p>'))
L[3] = (eyebrow(3) + title(3, "h-m", "unless something receives it.", "acc magenta") +
        '<ol class="stepper">' + "".join(a(3 + i, f'<span class="big-idx">0{i+1}</span><p>{b(3,k)}</p>', "", "li") for i, k in enumerate(["s1", "s2", "s3"])) + '</ol>' +
        a(7, f'<p class="quote">{b(3,"why")}</p>'))
L[4] = (eyebrow(4) + f'<h1 class="t giant tri"><span class="w"><span style="--k:0" class="cyan">Image,</span></span> <span class="w"><span style="--k:1" class="magenta">gene,</span></span> <span class="w"><span style="--k:2" class="amber">structure.</span></span></h1>' +
        a(3, f'<p class="lead">{b(4,"m1")} {b(4,"m2")}</p>') +
        a(4, f'<blockquote class="bar-quote"><strong>{b(4,"why")}</strong> {b(4,"why2")}</blockquote>'))
L[5] = (eyebrow(5) + title(5, "giant", "Neither was in my first draft.", "acc dim") +
        '<div class="tags">' + a(3, f'<span class="tag-n">01</span> {b(5,"k1h")}', "tag") + a(4, f'<span class="tag-n">02</span> {b(5,"k2h")}', "tag") + '</div>' +
        a(5, f'<p class="quote">{b(5,"std")} {b(5,"reason")}</p>'))
L[6] = (eyebrow(6) + title(6, "mega", "Zero", "acc magenta") +
        '<div class="stat-row">' + "".join(a(2 + i, f'{num(b(6,v))}<span>{b(6,l)}</span>', "srow") for i, (v, l) in enumerate([("a", "al"), ("b", "bl"), ("c", "cl"), ("d", "dl")])) + '</div>' +
        a(6, f'<p class="quote">{b(6,"chance")}</p>') + a(7, f'<p class="aside">{b(6,"notone")} {b(6,"q")}</p>'))
L[7] = (eyebrow(7) + title(7, "h-l", "all the data.", "acc lime-text") +
        a(3, f'<p class="quote big">{b(7,"quote")}</p>') +
        a(4, f'<p class="human">{b(7,"human")}</p>') +
        a(5, f'<p class="aside"><strong class="lime">{b(7,"gap")}</strong> — {b(7,"gapl")}</p>'))
L[8] = (eyebrow(8) + title(8, "h-l", "Opposite answers.", "acc amber") +
        a(3, f'<p class="lead">{b(8,"caveat")}</p>') + a(4, f'<p class="aside">{b(8,"indep")}</p>') +
        a(5, f'<p class="callout">{b(8,"kdr")}</p>'))
L[9] = (eyebrow(9) + title(9, "h-l", "The record keeping did.", "acc underline") +
        a(3, f'<p class="quote">{b(9,"two")}</p>') +
        a(4, f'<p class="ask">{b(9,"ask")}</p><p class="ask-sub">{b(9,"askl")}</p>', "ask-wrap") +
        a(5, f'<p class="aside">{b(9,"open")} {b(9,"wrong")}<br><span class="link">{b(9,"link")}</span></p>'))
def letters(t):                       # letters grouped per word so a word never breaks
    out, k = [], 0
    for wd in t.split():
        out.append('<span class="wd">' + "".join(f'<span class="ch" style="--k:{k+i}">{c}</span>' for i, c in enumerate(wd)) + '</span>'); k += len(wd)
    return " ".join(out)
L[10] = (f'<h1 class="t thanks">{letters(e(S[10]["title"]))}</h1>' +
         a(2, f'<p class="thai" lang="th">{b(10,"thai")}</p>') +
         a(3, f'<p class="byline"><strong>{b(1,"authors")}</strong><br>{b(1,"affil")}</p>') +
         a(4, f'<p class="contact">{b(10,"email")}<br>{b(10,"link")}</p>') +
         a(5, f'<p class="aside">{b(10,"extra")}</p>', "foot"))
L[11] = (eyebrow(11) + title(11, "h-m") +
         a(2, f'<div class="compare"><div><h3>{b(11,"r1h")}</h3><p>{b(11,"r1")}</p><p class="val-l">{b(11,"r1v")}</p></div>'
              f'<div><h3 class="magenta">{b(11,"r2h")}</h3><p>{b(11,"r2")}</p><p class="val-l magenta">{b(11,"r2v")}</p></div></div>') +
         a(3, f'<p class="aside">{b(11,"split")}</p>'))
rows = S[12]["body"]["table"]
th = "".join(f"<th>{e(c)}</th>" for c in rows[0]); tb = "".join("<tr>" + "".join(f"<td>{e(c)}</td>" for c in row) + "</tr>" for row in rows[1:])
L[12] = (eyebrow(12) + title(12, "h-m") +
         a(2, f'<p class="caption">{b(12,"caption")}</p><table class="t1"><thead><tr>{th}</tr></thead><tbody>{tb}</tbody></table>') +
         a(3, f'<p class="aside">{b(12,"note2")}</p>') + a(4, f'<p class="aside strong">{b(12,"note")}</p>'))
L[13] = (eyebrow(13) + title(13, "h-m") +
         '<ol class="stepper tight">' + "".join(a(2 + i, f'<span class="big-idx">0{i+1}</span><p>{b(13,k)}</p>', "", "li") for i, k in enumerate(["a", "b", "c", "d"])) + '</ol>' +
         a(6, f'<p class="aside">{b(13,"e")}</p>'))

def compose(n):
    return f'<div class="col">{L[n]}</div><div class="viz" aria-hidden="false">{VIZ[n]}</div>'

slides = [{"n": 0, "t": T[0], "kind": "intro", "title": "Intro: IPB University · Tri-U 32", "label": "Intro", "html": "",
           "notes": "Logo IPB masuk, lalu bergeser ke kiri dan logo Tri-U masuk. Tekan Enter untuk masuk ke slide 1.",
           "notes_id": "", "bridge": "", "direction": "", "budget": 0, "time": "", "fx": "fade", "side": "l"}]
for n in range(1, 14):
    s = S[n]
    slides.append({"n": n, "t": T[n], "kind": "backup" if n > 10 else ("close" if n == 10 else "slide"),
                   "title": s["title"], "label": s["label"], "html": compose(n), "notes": s["notes"], "notes_id": s["notes_id"],
                   "bridge": s["bridge"], "direction": s["instructions"], "budget": s["budget_s"], "time": s["time"],
                   "fx": FX[n], "side": SIDE[n]})
deck = {"event": C["talk"]["event"], "venue": C["talk"]["venue"], "slot_s": C["talk"]["slot_s"], "main_count": 10, "slides": slides}
(ROOT / "deck/slides.js").write_text("/* generated by tools/build_slides.py from build/content.json - do not edit by hand */\nwindow.DECK = "
                                      + json.dumps(deck, ensure_ascii=False, indent=1) + ";\n", encoding="utf-8")
print("slides.js:", len(slides), "entries")
