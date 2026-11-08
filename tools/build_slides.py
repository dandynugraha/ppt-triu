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
SIDE = {n: ("r" if n in (2, 4, 6, 8, 10, 11, 12, 13) else "c" if n in (3, 9) else "l") for n in range(1, 14)}
SIDE[1] = "t"; SIDE["1b"] = "l"
FX = {"1b": "count", 1: "words", 2: "wipe", 3: "slide", 4: "flip", 5: "scale", 6: "count", 7: "strike", 8: "split", 9: "panel", 10: "letters",
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
    inner = (f'<defs><radialGradient id="tum" cx="40%" cy="40%"><stop offset="0" stop-color="#F6C9A6"/><stop offset=".55" stop-color="#E58A5E"/><stop offset="1" stop-color="#B4451A"/></radialGradient></defs>'
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

def coin_flips():
    """704 seeded coin flips (32 x 22), chosen so that exactly one row holds a run of six heads in a row
    (the script's analogy for multiplicity). Illustration of chance, not data."""
    import random
    for seed in range(1, 5000):
        r = random.Random(seed); f = [[r.random() < .5 for _ in range(32)] for _ in range(22)]
        runs = []
        for y, row in enumerate(f):
            x = 0
            while x < 32:
                if row[x]:
                    e2 = x
                    while e2 < 32 and row[e2]: e2 += 1
                    if e2 - x >= 6: runs.append((y, x, e2 - x))
                    x = e2
                else: x += 1
        if len(runs) == 1 and runs[0][2] == 6 and 3 <= runs[0][0] <= 18: return f, runs[0]
    raise SystemExit("no seed")

def viz_checks():
    flips, (ry, rx, rn) = coin_flips()
    X0, Y0, DX, DY = 70, 168, 21, 17
    coins = []
    for y in range(22):
        for x in range(32):
            h = flips[y][x]; run = (y == ry and rx <= x < rx + rn)
            coins.append(f'<circle class="coin pop {"h" if h else "t"}{" run" if run else ""}" cx="{X0 + x*DX}" cy="{Y0 + y*DY}" r="{7.2 if h else 6}" style="--d:{(y*32+x)//6}"/>')
    hx0, hx1, hy = X0 + rx*DX - 13, X0 + (rx + rn - 1)*DX + 13, Y0 + ry*DY
    hl = (f'<rect class="runbox draw" pathLength="1" x="{hx0}" y="{hy-13}" width="{hx1-hx0}" height="26" rx="13"/>'
          f'<line class="runlead draw" pathLength="1" x1="{(hx0+hx1)/2:.0f}" y1="{hy+13}" x2="{(hx0+hx1)/2:.0f}" y2="{Y0 + 22*DY + 4}"/>' +
          txt((hx0 + hx1) / 2, Y0 + 22*DY + 34, b(5, "vz_six"), "lab lime big runlab", "middle"))
    rows = []
    for j, (lab, cover) in enumerate([(b(5, "vz_all"), 1.0), (b(5, "vz_only"), 0.8)]):
        y = 690 + j * 96
        sq = "".join(f'<rect class="pt {"te" if i >= 24 else "tr"}" x="{70 + i*21}" y="{y}" width="17" height="26" rx="3"/>' for i in range(30))
        br = f'<path class="brace {"bad" if j == 0 else "good"} draw" pathLength="1" d="M70,{y-12} L70,{y-22} L{70 + 630*cover - 4},{y-22} L{70 + 630*cover - 4},{y-12}"/>'
        rows.append(sq + br + txt(70, y - 34, lab, "lab " + ("magenta" if j == 0 else "cyan")))
    inner = (txt(70, 112, b(5, "vz_mult") + " · " + b(5, "vz_tests"), "lab caps") +
             txt(70, 140, b(5, "vz_coin"), "lab small") + "".join(coins) + hl +
             txt(70, 626, b(5, "vz_leak"), "lab caps") + "".join(rows) +
             f'<rect class="pt tr" x="70" y="842" width="15" height="15" rx="3"/>' + txt(94, 855, b(5, "vz_train"), "lab small") +
             f'<rect class="pt te" x="290" y="842" width="15" height="15" rx="3"/>' + txt(314, 855, b(5, "vz_test"), "lab small") +
             f'<circle class="coin h" cx="520" cy="849" r="7.2"/>' + txt(536, 855, b(5, "vz_heads"), "lab small"))
    return svg(inner, "Multiplicity: 704 coin flips with one run of six heads in a row, by chance alone; leakage: selection on all the data versus only the training data", "checks")

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


def viz_campus():
    """Chiang Mai University (v13): layered flat silhouettes — far haze, Doi Suthep with the golden chedi on the summit,
    foothills, a tree line, and Ang Kaew reservoir with a soft reflection. Smooth curves, navy tints only.
    A real photo at deck/assets/img/cmu-campus.png (background removed) replaces it automatically.
    The CMU logo is the official file deck/assets/logo/cmu.png - never drawn."""
    import random
    W, H, SHORE = 1920, 580, 470
    def smooth(pts):                                   # Catmull-Rom -> cubic Bezier through the points
        d = f"M{pts[0][0]},{pts[0][1]}"
        for k in range(len(pts) - 1):
            p0, p1, p2 = pts[max(k - 1, 0)], pts[k], pts[k + 1]; p3 = pts[min(k + 2, len(pts) - 1)]
            c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6); c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
            d += f" C{c1[0]:.1f},{c1[1]:.1f} {c2[0]:.1f},{c2[1]:.1f} {p2[0]},{p2[1]}"
        return d
    def layer(pts, cls, d, base=SHORE):
        return f'<path class="ly {cls}" style="--d:{d}" d="{smooth(pts)} L{W},{base} L0,{base} Z"/>'
    far = [(0,262),(300,236),(560,250),(820,218),(1080,230),(1320,200),(1600,218),(1920,196)]
    back = [(0,334),(260,304),(520,288),(760,252),(980,216),(1160,178),(1320,140),(1420,114),(1460,106),(1500,112),(1600,142),(1740,192),(1920,228)]
    mid = [(0,384),(220,356),(460,366),(700,334),(940,350),(1180,322),(1400,340),(1640,316),(1920,340)]
    front = [(0,432),(320,416),(640,426),(960,410),(1280,422),(1600,406),(1920,420)]
    def yfront(x):
        for (x0, y0), (x1, y1) in zip(front, front[1:]):
            if x0 <= x <= x1: t = (x - x0) / (x1 - x0); t = t * t * (3 - 2 * t); return y0 + (y1 - y0) * t
        return front[-1][1]
    r = random.Random(32); canopy = []
    x = -10
    while x < W + 20:
        rad = r.uniform(11, 20); canopy.append((x, yfront(x) - rad * .35, rad)); x += rad * r.uniform(1.15, 1.6)
    trees = "".join(f'<circle cx="{cx:.0f}" cy="{cy:.0f}" r="{rr:.0f}"/>' for cx, cy, rr in canopy)
    fr = layer(front, "f4", 4) + f'<g class="ly f4 canopy" style="--d:4">{trees}</g>'
    reflect = (f'<g class="reflect" transform="translate(0,{2*SHORE}) scale(1,-1)">' + layer(front, "f4", 4) + f'<g class="canopy">{trees}</g></g>')
    chedi = ('<g class="chedi pop" style="--d:6" transform="translate(1460,106) scale(1.3)">'
             '<path d="M0,-44 L4,-22 L8,-10 L13,0 L-13,0 L-8,-10 L-4,-22 Z"/><rect x="-17" y="0" width="34" height="5"/></g>')
    ripples = "".join(f'<line class="ripple" x1="{x0}" y1="{y}" x2="{x0 + ln}" y2="{y}" style="--d:{k}"/>'
                      for k, (x0, y, ln) in enumerate([(140,500,240),(560,512,180),(1000,498,300),(1460,516,220),(320,540,200),(860,548,260),(1300,556,240),(1700,532,160)]))
    inner = (layer(far, "f1", 0) + layer(back, "f2", 1) + chedi + layer(mid, "f3", 2) + fr +
             f'<rect class="lake" x="0" y="{SHORE}" width="{W}" height="{H - SHORE}"/>' +
             f'<clipPath id="lakeclip"><rect x="0" y="{SHORE}" width="{W}" height="{H - SHORE}"/></clipPath><g clip-path="url(#lakeclip)">{reflect}</g>' + ripples)
    return (f'<img class="campus-photo" src="assets/img/cmu-campus.png" alt="Chiang Mai University campus">'
            f'<svg class="viz-svg campus" viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMax slice" role="img" '
            f'aria-label="Illustration: Doi Suthep with its golden chedi above Chiang Mai University and Ang Kaew reservoir">{inner}</svg>'
            '<div class="cmu-badge"><span class="logo-slot cmu"><img src="assets/logo/cmu.png" alt="Chiang Mai University" '
            f'data-fallback="{b(1, "campus")}"></span></div>')

VIZ = {1: viz_campus(), "1b": viz_canvas("brain"), 2: viz_waffle(), 3: viz_angio(), 4: viz_pipeline(), 5: viz_checks(), 6: viz_bars(), 7: viz_auc(),
       8: viz_pairs(), 9: viz_protein(), 10: viz_canvas("brain-warm"), 11: viz_auc(), 12: viz_pairs(), 13: viz_protein()}

# ---------------------------------------------------------------- text compositions (each slide different)
L = {}
L[1] = (eyebrow(1) + title(1, "hero centre", "KDR/VEGFR-2", "acc cyan") +
        a(3, f'<p class="byline"><strong>{b(1,"authors")}</strong><br>{b(1,"affil")}</p>'))
L["1b"] = (a(0, b(1, "g_kicker"), "eyebrow") +
           a(1, f'<div class="stat-hero top">{num("15")}<span class="unit">months</span><span class="lbl">{b(1,"stat_label")}</span></div>') +
           a(3, f'<p class="lead">{b(1,"g_l1")} {b(1,"g_l2")}</p>') +
           a(4, f'<p class="quote">{b(1,"g_l3")}</p>') +
           a(5, f'<p class="callout">{b(1,"g_l4")}</p>') +
           a(6, f'<p class="credit">{b(1,"credit")}</p>', "foot"))
L[2] = (eyebrow(2) + title(2, "h-l", "not from tissue.", "acc underline") +
        '<dl class="defs">' + a(3, f'<dt>{b(2,"c1h")}</dt><dd>{b(2,"c1")}</dd>', "def") + a(4, f'<dt>{b(2,"c2h")}</dt><dd>{b(2,"c2")}</dd>', "def") + '</dl>' +
        a(5, f'<p class="inline-stat">{num(b(2,"n"))}<span>{b(2,"nl")}</span></p>') + a(6, f'<p class="quote">{b(2,"noscan")}</p>'))
L[3] = (eyebrow(3) + title(3, "h-c", "unless something receives it.", "acc magenta") + a(4, f'<p class="quote">{b(3,"why")}</p>'))
R3 = ('<ol class="stepper narrow">' + "".join(a(3 + i, f'<span class="big-idx">0{i+1}</span><p>{b(3,k)}</p>', "", "li") for i, k in enumerate(["s1", "s2", "s3"])) + '</ol>')
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
L[9] = (eyebrow(9) + title(9, "h-c", "The record keeping did.", "acc underline") + a(3, f'<p class="quote">{b(9,"two")}</p>'))
R9 = (a(4, f'<p class="ask">{b(9,"ask")}</p><p class="ask-sub">{b(9,"askl")}</p>', "ask-wrap") +
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

RIGHT = {3: R3, 9: R9}
def compose(n):
    if SIDE[n] == "t":   # title centred on top, illustration across the bottom
        return f'<div class="col col-top">{L[n]}</div><div class="viz viz-bottom">{VIZ[n]}</div>'
    if n in RIGHT:   # visual in the middle, text on both sides
        return f'<div class="col col-l">{L[n]}</div><div class="viz">{VIZ[n]}</div><div class="col col-r">{RIGHT[n]}</div>'
    return f'<div class="col">{L[n]}</div><div class="viz">{VIZ[n]}</div>'

slides = [{"n": 0, "t": 0, "kind": "intro", "title": "Intro: IPB University \u00b7 Tri-U 32", "label": "Intro", "html": "",
           "notes": "Logo IPB masuk, lalu bergeser ke kiri dan logo Tri-U masuk. Tekan Enter untuk masuk ke slide 1.",
           "notes_id": "", "bridge": "", "direction": "", "budget": 0, "time": "", "fx": "fade", "side": "l"}]
s1 = S[1]
cut_en, cut_id = s1["notes"].index("Fifteen months."), s1["notes_id"].index("Lima belas bulan.")
dir1 = s1["instructions"]; cut_dir = dir1.index("Kalimat soal operasi")
SPLIT = {1: dict(title=s1["title"], label="Opening", notes=s1["notes"][:cut_en].strip(), notes_id=s1["notes_id"][:cut_id].strip(),
                 bridge="", direction=dir1[:cut_dir].strip(), budget=8, time="0:00\u20130:08"),
         "1b": dict(title=s1["body"]["g_title"], label="Opening \u00b7 glioblastoma", notes=s1["notes"][cut_en:].strip(),
                    notes_id=s1["notes_id"][cut_id:].strip(), bridge=s1["bridge"], direction=dir1[cut_dir:].strip(),
                    budget=s1["budget_s"] - 8, time="0:08\u20130:55")}
ORDER = [1, "1b"] + list(range(2, 14))
for pos, key in enumerate(ORDER, start=1):
    src = SPLIT.get(key) or dict(title=S[key]["title"], label=S[key]["label"], notes=S[key]["notes"], notes_id=S[key]["notes_id"],
                                bridge=S[key]["bridge"], direction=S[key]["instructions"], budget=S[key]["budget_s"], time=S[key]["time"])
    kind = "backup" if key in (11, 12, 13) else ("close" if key == 10 else "slide")
    slides.append({"n": pos, "key": str(key), "kind": kind, "html": compose(key), "fx": FX[key], "side": SIDE[key], **src})
deck = {"event": C["talk"]["event"], "venue": C["talk"]["venue"], "slot_s": C["talk"]["slot_s"], "main_count": 11, "slides": slides}
(ROOT / "deck/slides.js").write_text("/* generated by tools/build_slides.py from build/content.json - do not edit by hand */\nwindow.DECK = "
                                      + json.dumps(deck, ensure_ascii=False, indent=1) + ";\n", encoding="utf-8")
print("slides.js:", len(slides), "entries")
