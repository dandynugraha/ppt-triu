"""Phase 5.8 - compose deck/slides.js from build/content.json + STORYBOARD.md (t map).
All visible strings come from content.json (verified verbatim by ingest.py). This file
only decides layout, the lime highlight phrase and the timeline position.
(v3: restored to the v1 layout at Dandy's request; v2 morphing layouts were rejected.)"""
import json, html
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
C = json.loads((ROOT / "build/content.json").read_text(encoding="utf-8"))
S = {s["n"]: s for s in C["slides"]}

# STORYBOARD.md slide -> timeline map
T = {0: 0.00, 1: 0.05, 2: 0.17, 3: 0.32, 4: 0.46, 5: 0.53, 6: 0.60, 7: 0.66, 8: 0.86, 9: 0.93, 10: 1.00, 11: 1.00, 12: 1.00, 13: 1.00}
# one lime highlight per slide (DESIGN.md: the single claim to remember); must be a substring of the title
HL = {1: "KDR/VEGFR-2", 2: "not from tissue.", 3: "unless something receives it.", 5: "Neither was in my first draft.",
      6: "Zero", 7: "all the data.", 8: "Opposite answers.", 9: "The record keeping did."}

e = html.escape
def b(n, k): return e(S[n]["body"][k])
def r(i, inner, cls="", tag="div"):  # reveal-staggered element
    return f'<{tag} class="r {cls}" style="--i:{i}">{inner}</{tag}>'
def split(t, mode, k0=0):
    """v4: wrap words (masked rise) or letters for per-slide entrance variants; text unchanged."""
    if mode == "words":
        return " ".join(f'<span class="w"><span style="--k:{k0+i}">{x}</span></span>' for i, x in enumerate(t.split()))
    if mode == "letters":
        return "".join(f'<span class="ch" style="--k:{i}">{c}</span>' if c != " " else " " for i, c in enumerate(t))
    return t
def title(n, cls="h1", mode=None):
    t = e(S[n]["title"])
    if n in HL:
        h = e(HL[n]); assert h in t, (n, h)
        a_, c_ = t.split(h, 1)
        na = len(a_.split())
        t = (split(a_, mode) + (" " if a_.strip() and mode else "") + f'<mark class="wipe-hl">{split(h, mode, na)}</mark>'
             + ((" " if mode else "") + split(c_.strip() if mode else c_, mode, na + len(h.split())) if c_.strip() else c_))
    else:
        t = split(t, mode)
    return f'<h1 class="{cls}">{t}</h1>'
def chip(n): return f'<span class="chip">{b(n, "kicker")}</span>'
def card(head, body, cls=""): return f'<div class="card {cls}"><h3>{head}</h3><p>{body}</p></div>'

L = {}
L[1] = (r(0, chip(1)) + r(1, title(1, "title-long", "words")) +
        r(2, f'<p class="byline"><strong>{b(1,"authors")}</strong><br><span>{b(1,"affil")}</span></p>') +
        r(3, f'<div class="stat card"><span class="num">{b(1,"stat_value")}</span><span class="lbl">{b(1,"stat_label")}</span></div>') +
        r(4, f'<p class="credit">{b(1,"credit")}</p>', "foot"))
L[2] = (r(0, chip(2)) + r(1, title(2)) +
        r(2, '<div class="row2">' + card(b(2,"c1h"), b(2,"c1")) + card(b(2,"c2h"), b(2,"c2")) + '</div>') +
        r(3, f'<div class="big-n"><span class="num" data-count="{b(2,"n")}">{b(2,"n")}</span><span class="lbl">{b(2,"nl")}</span></div>'))
L[3] = (r(0, chip(3)) + r(1, title(3)) +
        '<ol class="steps">' + "".join(r(2+i, f'<span class="idx">0{i+1}</span><p>{b(3,k)}</p>', tag="li")
                                     for i, k in enumerate(["s1", "s2", "s3"])) + '</ol>')
L[4] = (r(0, chip(4)) + r(1, title(4)) +
        '<div class="stack">' + "".join(r(2+i, f'<span class="idx">0{i+1}</span><div><h3>{b(4,h)}</h3><p>{b(4,k)}</p></div>', "card line")
                                       for i, (h, k) in enumerate([("m1h","m1"),("m2h","m2"),("m3h","m3")])) + '</div>' +
        r(5, f'<p class="aside">{b(4,"why")}</p>'))
L[5] = (r(0, chip(5)) + r(1, title(5)) +
        r(2, '<div class="row2 tall">' +
             f'<div class="card"><span class="idx">01</span><h3>{b(5,"k1h")}</h3><p>{b(5,"k1")}</p></div>' +
             f'<div class="card"><span class="idx">02</span><h3>{b(5,"k2h")}</h3><p>{b(5,"k2")}</p></div></div>'))
cells = [("a","al",""),("b","bl",""),("c","cl",""),("d","dl","panel")]
L[6] = (r(0, chip(6)) + r(1, title(6, "display")) +
        '<div class="grid4">' + "".join(r(2+i, f'<span class="num" data-count="{b(6,v)}">{b(6,v)}</span><span class="lbl">{b(6,l)}</span>', f"cell {c}")
                                       for i, (v, l, c) in enumerate(cells)) + '</div>' +
        r(6, f'<p class="aside">{b(6,"q")}</p>'))
L[7] = (r(0, chip(7)) + r(1, title(7, "h1", "words")) +
        '<div class="versus">' +
        r(2, f'<span class="num">{b(7,"v1")}</span><span class="lbl">{b(7,"v1l")}</span>', "cell was") +
        r(3, '<span class="arrow" aria-hidden="true"></span>', "arrow-wrap") +
        r(4, f'<span class="num" data-count="{b(7,"v2")}" data-from="{b(7,"v1")}">{b(7,"v2")}</span><span class="lbl">{b(7,"v2l")}</span>', "cell panel") + '</div>' +
        r(5, f'<p class="gap"><span class="num-s">{b(7,"gap")}</span> {b(7,"gapl")}</p>') +
        r(6, f'<p class="human">{b(7,"human")}</p>'))
L[8] = (r(0, chip(8)) + r(1, title(8)) +
        r(2, '<div class="row2">' +
             f'<div class="card res"><h3>{b(8,"p1h")}</h3><span class="num muted">{b(8,"p1n")}</span><span class="lbl">{b(8,"p1l")}</span></div>' +
             f'<div class="card res"><h3>{b(8,"p2h")}</h3><span class="num" data-count="{b(8,"p2n")}">{b(8,"p2n")}</span><span class="lbl">{b(8,"p2l")}</span></div></div>') +
        r(3, f'<p class="aside">{b(8,"caveat")}</p>') +
        r(4, f'<p class="aside strong">{b(8,"kdr")}</p>'))
L[9] = (r(0, chip(9)) + r(1, title(9)) +
        r(2, f'<div class="ask panel"><p class="ask-main">{b(9,"ask")}</p><p class="ask-sub">{b(9,"askl")}</p></div>') +
        r(3, f'<p class="aside">{b(9,"open")}<br><span class="link">{b(9,"link")}</span></p>'))
L[10] = (r(0, f'<h1 class="display xl">{split(e(S[10]["title"]), "letters")}</h1>') +
         r(1, f'<p class="thai" lang="th">{b(10,"thai")}</p>') +
         r(2, f'<p class="byline"><strong>{b(1,"authors")}</strong><br><span>{b(1,"affil")}</span></p>') +
         r(3, f'<p class="contact"><span>{b(10,"email")}</span><span>{b(10,"link")}</span></p>') +
         r(4, f'<p class="aside">{b(10,"extra")}</p>', "foot"))
L[11] = (r(0, chip(11)) + r(1, title(11)) +
         '<div class="stack">' +
         r(2, f'<div><h3>{b(11,"r1h")}</h3><p>{b(11,"r1")}</p></div><span class="val">{b(11,"r1v")}</span>', "card line two") +
         r(3, f'<div><h3>{b(11,"r2h")}</h3><p>{b(11,"r2")}</p></div><span class="val strong">{b(11,"r2v")}</span>', "card line two") +
         '</div>' + r(4, f'<p class="aside">{b(11,"split")}</p>'))
rows = S[12]["body"]["table"]
th = "".join(f"<th>{e(c)}</th>" for c in rows[0])
tb = "".join("<tr>" + "".join(f"<td>{e(c)}</td>" for c in row) + "</tr>" for row in rows[1:])
L[12] = (r(0, chip(12)) + r(1, title(12)) +
         r(2, f'<p class="caption">{b(12,"caption")}</p><table class="t1"><thead><tr>{th}</tr></thead><tbody>{tb}</tbody></table>') +
         r(3, f'<p class="aside">{b(12,"note2")}</p>') + r(4, f'<p class="aside strong">{b(12,"note")}</p>'))
L[13] = (r(0, chip(13)) + r(1, title(13)) +
         '<ol class="steps tight">' + "".join(r(3+i, f'<span class="idx">0{i+1}</span><p>{b(13,k)}</p>', tag="li")
                                            for i, k in enumerate(["a", "b", "c", "d"])) + '</ol>' +
         r(7, f'<p class="aside">{b(13,"e")}</p>'))

slides = [{"n": 0, "t": T[0], "kind": "intro", "title": "Intro: IPB University · Tri-U 32", "label": "Intro",
           "html": "", "notes": "Logo IPB masuk, lalu bergeser ke kiri dan logo Tri-U masuk. Tekan Enter untuk masuk ke slide 1.",
           "notes_id": "", "bridge": "", "direction": "", "budget": 0, "time": "", "fx": "fade", "side": "l"}]
# v6: text alternates sides (art.js STOPS side: 1 = text right); backups share stop 10
SIDE = {n: ("r" if n in (2, 4, 6, 8, 10, 11, 12, 13) else "l") for n in range(1, 14)}
# v4: one entrance variant per slide (final positions identical to v1)
FX = {1: "words", 2: "wipe", 3: "slide", 4: "flip", 5: "scale", 6: "count", 7: "strike", 8: "split", 9: "panel", 10: "letters",
      11: "fade", 12: "fade", 13: "fade"}
for n in range(1, 14):
    s = S[n]
    slides.append({"n": n, "t": T[n], "kind": "backup" if n > 10 else ("close" if n == 10 else "slide"),
                   "title": s["title"], "label": s["label"], "html": L[n], "notes": s["notes"], "notes_id": s["notes_id"],
                   "bridge": s["bridge"], "direction": s["instructions"], "budget": s["budget_s"], "time": s["time"], "fx": FX[n], "side": SIDE[n]})
deck = {"event": C["talk"]["event"], "venue": C["talk"]["venue"], "slot_s": C["talk"]["slot_s"], "main_count": 10, "slides": slides}
(ROOT / "deck/slides.js").write_text("/* generated by tools/build_slides.py from build/content.json - do not edit by hand */\nwindow.DECK = "
                                      + json.dumps(deck, ensure_ascii=False, indent=1) + ";\n", encoding="utf-8")
print("slides.js:", len(slides), "entries")
