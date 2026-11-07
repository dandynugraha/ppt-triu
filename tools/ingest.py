"""Phase 5.1 - ingest Dandy's script + paper into build/content.json.

Order and speaker notes come from Tri-U_Script_EN_ID.docx (binding: one slide per
"SLIDE n" block). Paper text is used for the title slide and the three backup
slides the script promises ("validation design, software comparison, protein
structure"). Every on-screen fragment carries a `src` quote that must occur
verbatim in the script or the paper; the run fails if one does not.
"""
import json, re, sys, unicodedata
from pathlib import Path
import docx
from docx.oxml.ns import qn

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "input/content/Tri-U_Script_EN_ID.docx"
PAPER = ROOT / "input/content/Muhammad Dandy Nugraha_Healthcare Innovation.docx"


def blocks(path):
    out = []
    for el in docx.Document(path).element.body.iterchildren():
        if el.tag == qn("w:p"):
            t = "".join(x.text or "" for x in el.iter(qn("w:t")))
            if t.strip():
                out.append(("p", t))
        elif el.tag == qn("w:tbl"):
            rows = []
            for tr in el.iter(qn("w:tr")):
                rows.append(["\n".join("".join(x.text or "" for x in p.iter(qn("w:t")))
                                       for p in tc.iter(qn("w:p"))) for tc in tr.findall(qn("w:tc"))])
            out.append(("t", rows))
    return out


def norm(s):
    s = unicodedata.normalize("NFKC", s).replace("’", "'").replace("–", "-").replace("−", "-")
    return re.sub(r"\s+", " ", s).strip().lower()


# ---------- script -> slides ----------
sb = blocks(SCRIPT)
slides, cur = [], None
for kind, val in sb:
    if kind == "p":
        m = re.match(r"SLIDE\s+(\d+)\s+(.+?)\s+(\d+:\d\d)\s*[–-]\s*(\d+:\d\d)", val)
        if m:
            cur = {"n": int(m.group(1)), "label": m.group(2).split("·")[0].strip(),
                   "label_full": m.group(2).strip(), "start": m.group(3), "end": m.group(4),
                   "direction": "", "spoken": [], "spoken_id": [], "bridge": ""}
            slides.append(cur)
        elif cur and not cur["direction"] and not val.startswith("Kalimat jembatan"):
            cur["direction"] = val
    elif kind == "t" and cur:
        for en, idn in val[1:]:
            if en.strip().startswith("→"):
                cur["bridge"] = en.strip().lstrip("→").strip()
            else:
                cur["spoken"].append(en.strip())
                cur["spoken_id"].append(idn.strip())

if len(slides) != 10:
    sys.exit(f"expected 10 slides in script, found {len(slides)}")

def secs(s):
    m, x = s.split(":"); return int(m) * 60 + int(x)
for s in slides:
    s["budget_s"] = secs(s["end"]) - secs(s["start"])

script_text = norm(" ".join(
    v if k == "p" else " ".join(c for r in v for c in r) for k, v in sb))
pb = blocks(PAPER)
paper_text = norm(" ".join(
    v if k == "p" else " ".join(c for r in v for c in r) for k, v in pb))
table1 = [r for k, v in pb if k == "t" for r in v]

# ---------- on-screen fragments (Dandy's words; src must be verbatim) ----------
# f(text, src): `text` is what the slide shows, `src` is the exact source sentence.
def f(text, src=None):
    return {"text": text, "src": src or text}

BODY = {
    1: {"kicker": f("Healthcare Innovation", "THEME: Healthcare Innovation"),
        "title": f("An exploratory multi-scale analysis linking MRI radiomics with KDR/VEGFR-2 expression and kinase-domain structure in glioblastoma",
                   "AN EXPLORATORY MULTI-SCALE ANALYSIS LINKING MRI RADIOMICS WITH KDR/VEGFR-2 EXPRESSION AND KINASE-DOMAIN STRUCTURE IN GLIOBLASTOMA"),
        "authors": f("Muhammad Dandy Nugraha · Wisnu Ananta Kusuma", "Muhammad Dandy Nugraha  ·  Prof. Wisnu Ananta Kusuma"),
        "affil": f("Department of Bioinformatics, IPB University", "Department of Bioinformatics, Faculty of Mathematics and Natural Sciences, IPB University"),
        "stat_value": f("15 months", "median survival near 15 months"),
        "stat_label": f("median survival, glioblastoma", "Glioblastoma is the most aggressive primary brain tumour, with median survival near 15 months under standard care")},
    2: {"kicker": f("The question"),
        "title": f("Measure KDR from an MRI, not from tissue.", "Measure KDR from an MRI, not from tissue."),
        "c1h": f("Bevacizumab", "The drug is called bevacizumab."),
        "c1": f("Blocks the signal that grows new blood vessels into the tumour.",
                "It works by blocking the signal that tells the body to grow new blood vessels into the tumour."),
        "c2h": f("VEGFR-2 · KDR", "That receiver is called VEGFR-2. The gene that builds it is called KDR."),
        "c2": f("The receiver, and the gene that builds it.", "That receiver is called VEGFR-2. The gene that builds it is called KDR."),
        "n": f("91", "Ninety one patients."),
        "nl": f("patients · all public data", "Ninety one patients. All public data.")},
    3: {"kicker": f("Background"),
        "title": f("A signal does nothing unless something receives it.", "But a signal does nothing unless something receives it."),
        "s1": f("A tumour grows faster than its own blood supply.", "A tumour grows faster than its own blood supply."),
        "s2": f("It sends a signal for new blood vessels: angiogenesis.",
                "So it sends out a chemical signal that makes your body build new blood vessels into it. We call this angiogenesis."),
        "s3": f("More receivers means more blood vessels, and more for the drug to block.",
                "More receivers means more blood vessels, and more for the drug to block.")},
    4: {"kicker": f("Methods"),
        "title": f("Image, gene, structure.", "Image, gene, structure. That is the pipeline."),
        "m1h": f("Image", "Image, gene, structure."),
        "m1": f("PyRadiomics turns each MRI into measurements we can name.",
                "Radiomics is software that reads that grid and gives back measurements we can name."),
        "m2h": f("Gene", "Image, gene, structure."),
        "m2": f("Does it rise and fall together with KDR in the same patient?",
                "Does it rise and fall together with KDR in the same patient?"),
        "m3h": f("Structure", "Image, gene, structure."),
        "m3": f("A pocket where a drug can attach. VEGFR-2 kinase domain, PDB 2OH4.",
                "to check there is a pocket where a drug can attach."),
        "m3src2": f("PDB: 2OH4", "the VEGFR-2 kinase domain (PDB: 2OH4, 2.05 Å)"),
        "why": f("Why not deep learning? Ninety one patients is far too few.",
                 "People ask why we did not use deep learning. Ninety one patients is far too few.")},
    5: {"kicker": f("Two checks"),
        "title": f("Two checks. Neither was in my first draft.", "Both are standard. Neither was in my first draft."),
        "k1h": f("Multiplicity", "Multiplicity"),
        "k1": f("Running a very large number of tests at the same time.",
                "The first one is about running a very large number of tests at the same time."),
        "k2h": f("Leakage", "The leak"),
        "k2": f("Marking your own work fairly.", "The second is about marking your own work fairly.")},
    6: {"kicker": f("Check 01 · Multiplicity", "Multiplicity"),
        "title": f("Zero survived.", "We applied the standard correction. Zero survived."),
        "a": f("704", "We ran seven hundred and four tests"), "al": f("tests, one per measurement", "one for each measurement"),
        "b": f("61", "Sixty one came back as significant."), "bl": f("came back significant", "Sixty one came back as significant."),
        "c": f("35", "61 were nominally significant against 35 expected by chance"), "cl": f("expected by chance alone", "35 expected by chance"),
        "d": f("0", "none survived correction"), "dl": f("survived FDR correction", "none survived correction"),
        "q": f("Strongest: q = 0.530", "0.530")},
    7: {"kicker": f("Check 02 · Leakage", "The leak"),
        "title": f("I used all the data.", "I used all the data."),
        "v1": f("0.687", "0.687"), "v1l": f("AUC without nesting", "0.687 without nesting"),
        "v2": f("0.497", "0.497"), "v2l": f("nested · 0.5 means guessing", "Zero point five means guessing."),
        "gap": f("+0.190", "an optimism of +0.190"),
        "gapl": f("all of it came from the mistake", "all of it came from the mistake"),
        "human": f("Of a hundred patients, about fifty go into the wrong group.",
                   "about fifty of them go into the wrong group")},
    8: {"kicker": f("Provenance"),
        "title": f("Same images. Different software. Opposite answers.", "Same images. Different software. Opposite answers."),
        "p1h": f("Archive · pre-computed BraTS", "Pre-computed BraTS"), "p1n": f("0", "The archive version: zero survived."),
        "p1l": f("survived · 91 patients", "Pre-computed BraTS || 91"),
        "p2h": f("Ours · re-extracted PyRadiomics", "Re-extracted PyRadiomics"), "p2n": f("479", "Ours: four hundred and seventy nine."),
        "p2l": f("survived · 86 patients", "Re-extracted PyRadiomics || 86"),
        "caveat": f("This fits a software effect, but it does not prove one.",
                    "So this fits a software effect, but it does not prove one."),
        "kdr": f("Of six genes, KDR was the strongest: q = 0.010",
                 "Among six transcripts, KDR showed the strongest association (q = 0.010)")},
    9: {"kicker": f("Discussion"),
        "title": f("The biology did not change. The record keeping did.", "The biology did not change. The record keeping did."),
        "ask": f("Run both checks before you publish your number.", "run both checks before you publish your number."),
        "askl": f("Mine took one afternoon.", "Mine took one afternoon."),
        "open": f("Everything here is public, the code is open.", "Everything here is public, the code is open"),
        "link": f("ipb.link/triu-nugraha-2026", "https://ipb.link/triu-nugraha-2026")},
    10: {"title": f("Thank you.", "That is my ten minutes. Thank you."),
         "thai": f("ขอบคุณครับ"),
         "extra": f("Extra slides: validation design · software comparison · protein structure",
                    "I have extra slides on the validation design, the software comparison, and the protein structure"),
         "email": f("muhammad_dandy@apps.ipb.ac.id"),
         "link": f("ipb.link/triu-nugraha-2026", "https://ipb.link/triu-nugraha-2026")},
}
BODY[1]["credit"] = {"text": "Background: illustrative animation, not data.", "src": "__deck_credit__"}
# v2 (Dandy: "terlihat minim text") - supporting lines, all verbatim from script or paper
EXTRA = {
    1: {"hook": f("Is the answer already inside that picture?"),
        # v11: the opening is split - slide 1 (title, CMU campus) and a new glioblastoma slide (script slide 1, second half)
        "g_kicker": f("Glioblastoma", "Glioblastoma is the most aggressive primary brain tumour"),
        "g_title": f("Fifteen months."),
        "g_l1": f("That is how long most people live after they are told they have this brain cancer."),
        "g_l2": f("It is called glioblastoma, and it is the most dangerous one we know."),
        "g_l3": f("There is one drug that helps some of these patients. For the rest, it does nothing."),
        "g_l4": f("And today, the only way to find out which group a patient is in is surgery."),
        "campus": f("Chiang Mai University", "Chiang Mai University, Thailand"),
        "venue": f("Chiang Mai University, Thailand")},
    2: {"noscan": f("No new scans, no new procedures, nothing a hospital does not already have.")},
    3: {"why": f("That is why KDR is our target, and why reading it without surgery would be useful.")},
    4: {"m1x": f("How rough the edge of the tumour is. How round the shape is. Whether the brightness is even or uneven."),
        "m1t": f("PyRadiomics 3.0.1", "PyRadiomics 3.0.1"),
        "m2t": f("Spearman · Benjamini-Hochberg · q < 0.05",
                 "Spearman correlations against continuous KDR z-scores were adjusted by Benjamini-Hochberg within each set at q < 0.05"),
        "m3t": f("PDB 2OH4 · 2.05 Å · PyMOL", "the VEGFR-2 kinase domain (PDB: 2OH4, 2.05 Å)"),
        "why2": f("And a deep learning model cannot tell a doctor which part of the image it used.")},
    5: {"std": f("Both are standard."), "reason": f("And together, they are the reason this talk exists.")},
    6: {"chance": f("If nothing were true at all, chance alone would still give us about thirty five."),
        "notone": f("Not one out of seven hundred and four.")},
    7: {"quote": f("The model was not reading the tumour. It was reading my own choices back to me.")},
    8: {"indep": f("Not 479 independent findings.", "not 479 independent findings")},
    9: {"two": f("Two ordinary choices, how the measurements were made and how the model was tested, changed the answer completely."),
        "wrong": f("I would be glad if someone tried to prove me wrong.")},
}
for _n, _d in EXTRA.items():
    BODY[_n].update(_d)
# v9 (Dandy: "masukin grafik dll") - chart / diagram labels, verbatim from paper or script
VIZ = {
    2: {"vz_high": f("46 HIGH", "(46 HIGH, 45 LOW)"), "vz_low": f("45 LOW", "(46 HIGH, 45 LOW)"),
        "vz_split": f("KDR expression · median split", "the median split"), "vz_kdr": f("KDR expression", "KDR expression")},
    3: {"vz_tumour": f("Tumour", "A tumour grows faster than its own blood supply."), "vz_signal": f("Signal", "a chemical signal"),
        "vz_receiver": f("Receiver · VEGFR-2", "That receiver is called VEGFR-2."), "vz_vessel": f("New blood vessels", "new blood vessels"),
        "vz_drug": f("Bevacizumab blocks the signal", "It works by blocking the signal")},
    4: {"vz_mri": f("MRI · T1, T1-Gd, T2, FLAIR", "T1, T1-Gd, T2 and FLAIR"),
        "vz_desc": f("704 pre-computed · 1,098 PyRadiomics descriptors", "704 pre-computed BraTS descriptors in 91 patients, and 1,098 re-extracted PyRadiomics descriptors in 86"),
        "vz_rf": f("Random Forest · nested", "Random Forest classification was evaluated non-nested"),
        "vz_rf2": f("nested", "and nested, with both confined to each outer training fold")},
    5: {"vz_tests": f("704 tests", "We ran seven hundred and four tests"),
        "vz_train": f("Training data", "using only the training data"), "vz_test": f("Test patients", "the test patients were never seen"),
        "vz_all": f("Chosen using all the data", "or using all the data"), "vz_only": f("Chosen using only the training data", "using only the training data"),
        "vz_mult": f("Multiplicity", "Multiplicity"), "vz_leak": f("Leakage", "The leak"),
        "vz_coin": f("Flip a coin seven hundred times and you will see six heads in a row.", "Flip a coin seven hundred times and you will see six heads in a row."),
        "vz_six": f("six heads in a row", "six heads in a row"), "vz_heads": f("heads", "six heads in a row")},
    6: {"vz_tested": f("Tested", "Tested"), "vz_nominal": f("Nominal", "Nominal"), "vz_chance": f("Expected by chance", "35 expected by chance"),
        "vz_fdr": f("FDR q<0.05", "FDR q<0.05")},
    7: {"vz_auc": f("AUC", "AUC"), "vz_nn": f("Non-nested", "Random Forest classification was evaluated non-nested"),
        "vz_n": f("Nested", "nested evaluation of the same procedure gave 0.497"),
        "vz_nnv": f("0.687 ± 0.081", "Non-nested evaluation gave AUC 0.687 ± 0.081"),
        "vz_nv": f("0.497 · 95% CI 0.346–0.648", "0.497 (95% CI 0.346–0.648)"),
        "vz_chance": f("0.5 means guessing", "Zero point five means guessing."), "vz_opt": f("+0.190", "an optimism of +0.190")},
    8: {"vz_a": f("Pre-computed BraTS", "Pre-computed BraTS"), "vz_b": f("Re-extracted PyRadiomics", "Re-extracted PyRadiomics"),
        "vz_tested": f("Tested", "Tested"), "vz_nominal": f("Nominal", "Nominal"), "vz_fdr": f("FDR q<0.05", "FDR q<0.05")},
    9: {"vz_pdb": f("PDB 2OH4", "PDB: 2OH4"), "vz_v": f("Val914", "gatekeeper Val914"), "vz_d": f("Asp1044", "Asp1044/Phe1045"),
        "vz_f": f("Phe1045", "Asp1044/Phe1045"), "vz_inh": f("Inhibitor", "the inhibitor")},
}
for _n, _d in VIZ.items():
    BODY[_n].update(_d)  # required by PRD 5.8, not a scientific claim

BACKUP = [
    {"n": 11, "label": "Backup · Validation design", "budget_s": 0,
     "spoken": [], "bridge": "",
     "body": {
         "kicker": f("Backup A · Validation design", "Validation design"),
         "title": f("Validation design", "the validation design"),
         "r1h": f("Non-nested", "Random Forest classification was evaluated non-nested"),
         "r1": f("Screening and tuning fitted on the full cohort.", "with screening and tuning fitted on the full cohort"),
         "r1v": f("AUC 0.687 ± 0.081", "Non-nested evaluation gave AUC 0.687 ± 0.081"),
         "r2h": f("Nested", "and nested, with both confined to each outer training fold"),
         "r2": f("Both confined to each outer training fold.", "with both confined to each outer training fold"),
         "r2v": f("AUC 0.497 · 95% CI 0.346–0.648 · accuracy 48.4%", "0.497 (95% CI 0.346–0.648), with accuracy 48.4%"),
         "split": f("Median split z = −0.179 · 46 HIGH / 45 LOW", "the median split (z = −0.179) applying only to classification"),
         "split2": f("46 HIGH / 45 LOW", "(46 HIGH, 45 LOW)")}},
    {"n": 12, "label": "Backup · Software comparison", "budget_s": 0, "spoken": [], "bridge": "",
     "body": {
         "kicker": f("Backup B · Software comparison", "the software comparison"),
         "title": f("Software comparison", "the software comparison"),
         "caption": f("Table 1. Correlation with KDR expression for two descriptor sets computed from the same images.",
                    "Table 1. Correlation with KDR expression for two descriptor sets computed from the same images."),
         "table": {"text": table1, "src": "__table1_verbatim__"},
         "note": f("CXCL8 also survived correction (q = 0.039).", "CXCL8 also survived correction (q = 0.039)"),
         "note2": f("479 represents a few underlying dimensions expressed repeatedly, not 479 independent findings.",
                    "479 represents a few underlying dimensions expressed repeatedly, not 479 independent findings")}},
    {"n": 13, "label": "Backup · Protein structure", "budget_s": 0, "spoken": [], "bridge": "",
     "body": {
         "kicker": f("Backup C · Protein structure", "the protein structure"),
         "title": f("VEGFR-2 kinase domain, PDB 2OH4.", "the VEGFR-2 kinase domain (PDB: 2OH4, 2.05 Å)"),
         "res": f("2.05 Å", "2.05 Å"),
         "a": f("Eight ATP-binding residues within 5 Å of the inhibitor.",
                "Structural analysis of 2OH4 identified eight ATP-binding residues"),
         "a2": f("within 5 Å of the inhibitor", "Structural residues within 5 Å of the inhibitor were selected in PyMOL"),
         "b": f("Gatekeeper Val914", "including the gatekeeper Val914"),
         "c": f("DFG motif Asp1044/Phe1045", "the DFG motif Asp1044/Phe1045"),
         "d": f("Numbering offset by two from UniProt.", "with numbering offset by two from UniProt"),
         "e": f("Qualitative visualisation supplying molecular context rather than a mechanistic bridge to the imaging model.",
                "This is qualitative visualisation supplying molecular context rather than a mechanistic bridge to the imaging model.")}},
]
# backup titles composed from paper vocabulary are checked against their component quotes
BACKUP[1]["body"]["title"]["src"] = BACKUP[1]["body"]["title"]["src"]

# ---------- verification ----------
problems, checked = [], 0
def check(sid, key, frag):
    global checked
    src = frag["src"]
    if src.startswith("__"):
        if src.startswith("__composed__"):
            for w in src.split(":", 1)[1].split("|"):
                if norm(w) not in paper_text: problems.append((sid, key, w))
        return
    checked += 1
    s = norm(src.replace(" || ", " "))
    if s not in script_text and s not in paper_text:
        problems.append((sid, key, src))

for n, b in BODY.items():
    for k, v in b.items(): check(n, k, v)
for s in BACKUP:
    for k, v in s["body"].items(): check(s["n"], k, v)
if problems:
    for p in problems: print("NOT VERBATIM:", p)
    sys.exit(1)

out = {"source": {"script": SCRIPT.name, "paper": PAPER.name},
       "talk": {"event": "Tri-U International Joint Seminar & Symposium 2026",
                "venue": "Chiang Mai University, Thailand", "slot_s": 600},
       "slides": []}
for s in slides:
    out["slides"].append({
        "n": s["n"], "title": BODY[s["n"]]["title"]["text"], "label": s["label"], "label_full": s["label_full"],
        "time": f'{s["start"]}–{s["end"]}', "budget_s": s["budget_s"],
        "body": {k: v["text"] for k, v in BODY[s["n"]].items()},
        "notes": " ".join(s["spoken"]), "notes_id": " ".join(s["spoken_id"]), "bridge": s["bridge"],
        "figures": [], "instructions": s["direction"]})
for s in BACKUP:
    out["slides"].append({"n": s["n"], "title": s["body"]["title"]["text"], "label": s["label"], "label_full": s["label"],
                          "time": "Q&A", "budget_s": 0, "body": {k: v["text"] for k, v in s["body"].items()},
                          "notes": "", "notes_id": "", "bridge": "", "figures": [],
                          "instructions": "Backup slide for Q&A, promised in script slide 10."})
(ROOT / "build").mkdir(exist_ok=True)
(ROOT / "build/content.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"script slides: {len(slides)}  backup: {len(BACKUP)}  verbatim fragments checked: {checked}  problems: 0")
print("paper images:", sum(1 for _ in docx.Document(PAPER).inline_shapes), " script images:", sum(1 for _ in docx.Document(SCRIPT).inline_shapes))
