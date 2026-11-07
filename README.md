# Tri-U 32 — scroll deck

**An exploratory multi-scale analysis linking MRI radiomics with KDR/VEGFR-2 expression and kinase-domain structure in glioblastoma**
Muhammad Dandy Nugraha · Wisnu Ananta Kusuma — Department of Bioinformatics, IPB University

Live deck (GitHub Pages): open the site root, it forwards to `deck/`.

## Present
- **Enter / Space / → / ↓ / PageDown**: next · **Backspace / ← / ↑ / PageUp**: back
- **Number + Enter**: jump (11–13 are Q&A backup slides) · **Home / End**
- **F**: fullscreen · **B** or **.**: black screen · **N**: presenter window (notes, timers)
- Works offline too: download the repo and double-click `deck/index.html` (Chrome/Edge, graphics acceleration on).
- Backup: `backup.pdf`.

## How it is built
- No dependencies, no network at runtime. `deck/js/art.js` draws the scrolling gradient background (WebGL); `deck/js/viz.js` draws the contour brain and the real PDB 2OH4 structure (`deck/js/pdb2oh4.js`); charts are SVG built from the paper's numbers; `deck/js/engine.js` handles navigation, presenter window and timers.
- Fonts: Inter Tight + Inter (SIL OFL), bundled.
- On-screen text is generated from the talk script and paper by `tools/ingest.py` → `tools/build_slides.py` (every fragment is checked verbatim against the sources). The source documents are kept out of this public repo.
- Checks: `node tools/check.mjs`, `node tools/textcontrast.mjs && python tools/textcontrast.py`; PDF: `node tools/export.mjs`.
- Design and decisions: `DESIGN.md`, `STORYBOARD.md`, `BUILD_LOG.md`.

The background animation is an illustration, not data.
