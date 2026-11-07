# PRD — Tri-U 2026 Scroll Deck (one video, end-to-end by Claude Code)

> **Untuk Dandy.** File ini menggantikan brief sebelumnya. Claude Code mengerjakan semuanya sendiri: baca isi PPT kamu, baca referensi Pinterest, generate 2 gambar di Gemini (Nano Banana), jadikan 1 video di Veo, pecah jadi frame, bangun deck scroll/Enter, cek kualitas, sampai export PDF backup.
> Kamu cukup siapkan 3 hal (bagian 2), taruh file ini di root folder, lalu paste prompt di bagian 0.

---

## 0. Prompt to paste into Claude Code

```text
Read PRD_TRIU_SCROLL_DECK.md completely before acting. Execute it end to end, phase by phase (section 5), without asking me questions unless a phase's "STOP if" condition is met.
Source of truth order: (1) my content file in input/content/, (2) my reference images in input/refs/, (3) this PRD.
Never invent scientific content. Never ship placeholder assets. Keep the run log in BUILD_LOG.md (what you did, what each API call cost, every decision and why).
When everything in section 10 passes, give me a short final report.
```

---

## 1. Goal

Turn Dandy's existing presentation content into a **scroll/Enter-driven web deck** for the 32nd Tri-U IJSS 2026 (Chiang Mai University):

- **One** AI-generated background video (8 s) that moves forward/backward only when the presenter advances. Each slide is a stop on the video timeline.
- Dandy's own slide content (text + figures) sits on top, laid out in the visual language of his Pinterest references.
- Works fully **offline** from a laptop, controlled by keyboard or presentation clicker, with a presenter window and a **PDF backup**.
- Looks designed by a person: specific, restrained, consistent with the references. Not "AI slop".

### Non-goals
- No rewriting of the scientific story. No new claims, numbers, or figures.
- No multiple videos, no audio, no web hosting, no frameworks.
- No AI-generated imagery that could be mistaken for data (MRI, protein structure, plots, gels).

---

## 2. Inputs Dandy provides (folder layout)

```
project/
├── PRD_TRIU_SCROLL_DECK.md
├── .env                         GEMINI_API_KEY=...   (Google AI Studio key, billing enabled — Veo has no free tier)
└── input/
    ├── content/                 the presentation content Dandy made: .pptx / .pdf / .docx / .md / Figma export
    └── refs/                    Pinterest reference images (.jpg/.png/.webp), 3–12 images
```

Optional: `input/content/notes.*` (speaker notes), `input/fonts/` (font files Dandy wants).

**STOP if** `input/content/` is empty or unreadable, or `input/refs/` is empty. Ask Dandy for them; do nothing else.
**If `GEMINI_API_KEY` is missing or Veo returns a billing/permission error:** do not stop the whole build; switch to the manual fallback in 5.5B and continue all other phases.

---

## 3. Where each step happens (overview)

| Step | What | Where / tool | Automated? |
|---|---|---|---|
| A | Read Dandy's content + extract his figures | Python (`python-pptx`, `pdfplumber`/`pymupdf`, `python-docx`) | yes |
| B | Read the Pinterest refs → design system | Claude Code reads the images itself + PIL colour extraction | yes |
| C | Write video concept + storyboard | Claude Code → `STORYBOARD.md` | yes |
| D | Generate **start frame** + **end frame** stills | **Google Gemini image model (Nano Banana)** via Gemini API, refs passed as style input. Manual alternative: gemini.google.com or aistudio.google.com | yes (API) |
| E | Turn the two stills into **one 8 s video** | **Veo 3.1 (Fast)** via Gemini API, "first and last frame" mode. Manual alternative: Gemini app or Google Flow with the same two stills | yes (API) |
| F | Video → image frames | `ffmpeg` → WEBP sequence | yes |
| G | Build the deck engine | plain HTML/CSS/JS, zero dependencies | yes |
| H | Compose slides from content + design system | Claude Code | yes |
| I | Quality pass | skills: taste-skill, impeccable, emil-design-eng + Playwright screenshots | yes |
| J | Backup | Playwright → `backup.pdf`, zip | yes |

---

## 4. Setup (Claude Code runs this first)

```bash
# Python
pip install google-genai python-dotenv pillow numpy python-pptx pymupdf python-docx
# Node (for screenshots/PDF)
npm init -y && npm i -D playwright && npx playwright install chromium
# ffmpeg must exist
ffmpeg -version
# Design skills (installed into this project)
npx skills add https://github.com/Leonxlnx/taste-skill
npx skills add pbakaus/impeccable
npx skills add https://github.com/emilkowalski/skills --skill emil-design-eng
```

If any install fails, record it in `BUILD_LOG.md`, tell Dandy the exact command that failed, and continue with what works. Playwright may use installed Chrome via `channel: "chrome"` if the browser download is blocked.

**Model IDs change often.** Before the first API call, list available models and pick:
```python
from google import genai
client = genai.Client()  # reads GEMINI_API_KEY
for m in client.models.list(): print(m.name)
```
- Image: prefer the current **Nano Banana Pro** (e.g. `gemini-3-pro-image-preview`) for quality; otherwise the current Nano Banana / Nano Banana 2 flash image model. Record the exact ID used.
- Video: prefer **`veo-3.1-fast-generate-preview`** (or its GA successor in the list). Use standard Veo 3.1 only if Fast output fails the quality check twice.

---

## 5. Phases

Each phase has an output and an acceptance check. Do not start a phase until the previous one passes. Log everything in `BUILD_LOG.md`.

### 5.1 Ingest content → `build/content.json`

1. Extract, in Dandy's order, every slide/section: title, body text, bullet structure, speaker notes, and embedded images.
   - `.pptx`: `python-pptx` (text frames, tables, notes, `shape.image.blob` for pictures).
   - `.pdf`: `pymupdf` (text per page + images; also render each page to PNG for visual reference).
   - `.docx`/`.md`: headings = slides.
2. Save figures to `build/figures/sNN_k.png` at original resolution. Never redraw, recolour or crop away axes/labels of a figure.
3. If the content file contains instructions (e.g. "slide ini pakai gambar X", "highlight bagian Y", timing, order), they are **binding** unless they break section 8 (integrity) or 6 (offline/controls).
4. Output `build/content.json`:
```json
{ "slides": [ { "n": 1, "title": "...", "body": ["...", "..."], "notes": "...", "figures": ["build/figures/s01_1.png"], "instructions": "..." } ] }
```

**Accept when:** slide count equals the source; a spot-check of 3 random slides matches the source word for word; every embedded figure is extracted.
**Text rules:** keep Dandy's wording. Allowed edits: fixing obvious typos (log each), splitting an over-long slide into two (log it), moving overflow sentences to speaker notes. Not allowed: paraphrasing claims, changing numbers, adding facts.

### 5.2 Design read → `DESIGN.md` + `deck/css/tokens.css`

Look at every image in `input/refs/` yourself (Read tool), then run colour extraction:

```python
# k-means palette per ref image (k=6), keep colours with >3% area
```

Write `DESIGN.md` with concrete, checkable decisions, each tied to a reference file name:
- **Mood in one sentence** (e.g. "quiet editorial, lots of air, one warm accent").
- **Grid:** columns, outer margins, gutter, where text sits vs image (as % of 1920×1080).
- **Type:** classification of the display and text faces seen in the refs (serif / grotesk / mono, weight, tracking, case), the size scale in px at 1920 wide, line-height, max line length. Choose actual fonts that match and are free to embed (Google Fonts OFL), download `.woff2` into `deck/fonts/`.
- **Colour:** background, ink, muted, rule, one accent, scrim colour for text over video — hex values sampled from the refs, with contrast ratios computed (text ≥ 7:1 on its background).
- **Surfaces & detail:** corner radius (or none), borders/hairlines, grain/texture, image treatment (duotone? full-bleed? framed?), numbering style, how captions look.
- **Motion character:** calm/snappy, derived from the refs' mood.
- **Do / Don't list** specific to these refs.
- **BEST_REFS:** the 3–4 refs that best represent the system (used as style input for image generation in 5.4).

Run the taste-skill's design-read step and impeccable's `shape`/`critique` vocabulary on the plan, but **the refs win** when a skill default disagrees.

**Accept when:** every token in `tokens.css` traces to a line in `DESIGN.md`, and each line cites a ref file.
**STOP if** the refs contradict each other so strongly that no single system fits (e.g. half brutalist neon, half pastel minimal): pick the larger group, log why, continue.

### 5.3 Video concept + storyboard → `STORYBOARD.md`

One continuous **8-second** shot, no cuts, that matches the talk's arc and the refs' look.

Default concept (adjust to Dandy's content and refs):
> **Multi-scale descent.** The camera starts wide on an abstract, stylised brain form and travels inward through tissue and a dense vascular network, ending close on the surface of a blood-vessel wall studded with receptor-like structures. It mirrors the paper's three scales: image → transcript/vasculature → protein.

The clip is **illustrative only**: it sets atmosphere and pacing; Dandy's real figures carry the science (section 8).

Write in `STORYBOARD.md`:
1. Start-frame description, end-frame description, camera move, light, palette (hex from `DESIGN.md`), texture, what must stay empty (negative space where slide text will sit, per the grid).
2. **Slide → timeline map:** for every slide, a position `t` in [0,1] on the video, plus what is visible there. Rules: mostly monotonic forward; title near 0; structure/protein slides near 1; dense text slides on calm stretches; consecutive slides at least 0.04 apart unless they intentionally "hold".
3. Where each slide's figure and text sit so they never cover the moving subject.

**Accept when:** every slide has `t`, and the negative-space plan leaves room for the grid's text column.

### 5.4 Generate the two stills (Nano Banana) → `assets/stills/start.png`, `end.png`

```python
import glob
from google import genai
from google.genai import types
from PIL import Image
client = genai.Client()
ref_paths = BEST_REFS or sorted(glob.glob("input/refs/*"))[:4]   # 3–4 strongest refs chosen in 5.2
refs = [Image.open(p) for p in ref_paths]
resp = client.models.generate_content(
    model=IMG_MODEL,
    contents=[STILL_PROMPT, *refs],
    config=types.GenerateContentConfig(
        response_modalities=["IMAGE"],
        image_config=types.ImageConfig(aspect_ratio="16:9"),
    ),
)
for part in resp.candidates[0].content.parts:
    if part.inline_data:
        open("assets/stills/start.png", "wb").write(part.inline_data.data)
```
(If an SDK field name errors, check the installed `google-genai` version's docs and adapt; log the fix.)

**Prompt recipe** (fill from `DESIGN.md` / `STORYBOARD.md`):
```
[subject + scale], [composition: where the empty space is, e.g. "left 40% calm and dark for text"],
[lighting], [palette: hex list], [texture/grain], [lens/camera], editorial scientific illustration,
in the visual style of the attached reference images,
no text, no letters, no labels, no logos, no watermark, no UI, no medical scan look.
```
- Generate the **start** frame first. Generate the **end** frame passing the accepted start frame as an extra reference so style matches.
- Make 3 candidates each. Score each candidate 1–5 on: matches refs, negative space where planned, no text/artefacts, believable but clearly illustrative, palette match. Keep the best; log scores. Max 9 image calls per frame.
- Upscale/resize to exactly 1920×1080 (cover crop that keeps the subject and empty area).

**Accept when:** both stills score ≥ 4 on every criterion, look like one series, and contain no text.
**If the model refuses medical wording:** remove "brain/tumour" words, describe forms abstractly ("folded organic form", "branching red vessel network").

### 5.5 Generate the video (Veo 3.1, first + last frame) → `assets/video/master.mp4`

#### 5.5A API (default)
```python
import time
from google import genai
from google.genai import types
client = genai.Client()
def img(path): return types.Image(image_bytes=open(path, "rb").read(), mime_type="image/png")

op = client.models.generate_videos(
    model=VIDEO_MODEL,                       # veo-3.1-fast-generate-preview or successor
    prompt=VIDEO_PROMPT,
    image=img("assets/stills/start.png"),
    config=types.GenerateVideosConfig(
        last_frame=img("assets/stills/end.png"),
        aspect_ratio="16:9",
        resolution="1080p",
        duration_seconds=8,
        negative_prompt="cuts, scene change, text, captions, letters, watermark, logo, flicker, morphing faces, camera shake",
    ),
)
while not op.done:
    time.sleep(10)
    op = client.operations.get(op)
vid = op.response.generated_videos[0]
client.files.download(file=vid.video)
vid.video.save("assets/video/master.mp4")
```
**Video prompt recipe:**
```
One continuous, slow, steady camera move from the first frame to the last frame: [dolly-in / descent path from STORYBOARD].
Constant speed, no cuts, no zoom jumps, no new objects appearing suddenly, keep the [left 40%] area calm.
Soft volumetric light, [palette], fine film grain. Silent.
```
**Budget:** max **3** video generations (≈ USD 1 each on Veo 3.1 Fast 1080p at time of writing — verify current price on Google's pricing page and log it). Never exceed without Dandy's OK.

**Check every result** (extract 12 evenly spaced frames, look at them): continuous motion, no cut, no warping/melting, no text, start ≈ start still, end ≈ end still, calm zone respected. Retry with a corrected prompt if any fails.

#### 5.5B Manual fallback (no key / no billing / API blocked)
Write `MANUAL_VIDEO_STEPS.md` for Dandy and continue building with a temporary **still-only** sequence (crossfade start→end, 192 frames) so the deck is usable:
1. Open the Gemini app (or Google Flow) with a plan that includes Veo.
2. Choose video generation with **first and last frame** (Frames to video), upload `assets/stills/start.png` and `end.png`, paste `VIDEO_PROMPT` from `STORYBOARD.md`.
3. 16:9, 8 s, highest quality available. Download the MP4 to `assets/video/master.mp4`.
4. Tell Claude Code "video ready" → it reruns 5.6 onward.
The temporary crossfade must be marked in `BUILD_LOG.md` and flagged in the final report.

### 5.6 Frames → `deck/frames/f_0001.webp …`

```bash
ffmpeg -i assets/video/master.mp4 -an -vf "fps=24,scale=1920:-2" -c:v libwebp -quality 80 deck/frames/f_%04d.webp
```
Expect ~192 frames. Total size target < 30 MB (lower `-quality` if above). Write `deck/frames/manifest.js` → `window.FRAMES = { count: N, path: "frames/f_", pad: 4, ext: ".webp" };`

### 5.7 Build the deck engine → `deck/`

Plain HTML/CSS/JS, **no dependencies, no CDN, no network at runtime**, must work by double-clicking `index.html` (`file://`): load data via `<script>` files, never `fetch`.

```
deck/
├── index.html
├── slides.js        ← generated from content.json + STORYBOARD.md
├── css/tokens.css   css/deck.css
├── js/engine.js
├── fonts/  frames/  figures/
```

**Behaviour (all required):**
- Full-viewport `<canvas>` draws the current frame (`object-fit: cover` math, devicePixelRatio ≤ 2). All frames preloaded with a thin progress line; no spinner.
- Each slide has `t` → target frame `round(t × (count−1))`.
- **Next**: Enter, Space, →, ↓, PageDown. **Previous**: Backspace, ←, ↑, PageUp. **Home/End**. Typing a number jumps to that slide. **F**/F5 fullscreen, **B** or `.` black screen, **N** presenter window.
- Advancing tweens the frame index from current to target: duration `clamp(700ms, 400 + 9ms × Δframes, 1600ms)`, strong ease-out (`1-(1-t)^5` or `cubic-bezier(0.23,1,0.32,1)`). Never ease-in, never bounce. Going back plays the video backward.
- Pressing next during a tween cancels it and goes to the new target (no queued animations).
- Slide content (text, figures, highlights) appears **after** frames settle: fade + 8 px rise, 200–250 ms, children staggered 40–60 ms. Content of the previous slide fades out in ≤120 ms when leaving.
- Mouse wheel/trackpad = one slide per gesture (threshold + 750 ms lock). Touch tap: right 2/3 next, left 1/3 previous.
- Ignore keys while a link/button has focus.
- `prefers-reduced-motion`: jump frames instantly, keep fades.
- **Presenter window (N):** `window.open('')` and write its DOM from the main window (works on `file://`). Shows current slide title, next slide title, speaker notes, slide timer, total timer, slide budget (from content notes if Dandy gave timings, else total slot ÷ slides). Keys pressed in the presenter window control the deck.
- `?static` + `window.__go(n)` hook + `window.__ready` flag, for automated screenshots.
- URL hash `#n` opens slide n.
- Optional per-slide `highlight` over a figure: `outline` (rect) or `spotlight` (circle, dims the rest of the figure only), coordinates normalised to the figure box. Use only where Dandy's content asks for emphasis.

### 5.8 Compose slides → `deck/slides.js`

For each slide in `content.json`: `t` from storyboard, layout from `DESIGN.md` grid, Dandy's text verbatim, his figures, notes.
- Text over video always sits on a solid or near-solid surface/scrim defined in `DESIGN.md` (contrast ≥ 7:1). No text directly on busy frames.
- Figures are shown on a clean surface (paper colour), never tinted, with a small source/caption line if Dandy's content has one.
- Max ~30 words visible per slide; the rest goes to notes (log moves).
- First slide shows a small, quiet "Background: illustrative animation" credit somewhere unobtrusive (or on the acknowledgements slide).

### 5.9 Quality pass

1. Screenshots: Playwright at 1920×1080 for every slide (`?static`, `__go(n)`, wait `__ready`) → `shots/NN.png`. Also 1280×720 for slides 1, middle, last.
2. Look at **every** screenshot. Check: text fits, nothing overlaps the moving subject at that `t`, figure readable from the back of a room (labels ≥ ~18 px at 1080p — if Dandy's figure is too small, enlarge the figure, never retype its labels), consistent margins, accent used sparingly, no orphans/widows in titles.
3. Run impeccable `critique` then `audit` on the deck; run emil-design-eng review on `engine.js` + CSS motion; run taste-skill's anti-slop rules. Fix what they find **unless it conflicts with the refs or Dandy's content** (log conflicts).
4. Automated checks (write `tools/check.mjs`): frame count matches manifest; no `http(s)://` in runtime files; no console errors; no network requests; every slide reachable forward and backward via keyboard; rapid 5× Enter ends on the right slide; no TODO/placeholder strings; text contrast ≥ 7:1 for each text token pair.
5. Re-shoot after fixes. Repeat until clean (max 3 rounds, then report what is left).

### 5.10 Export & package

- `node tools/export.mjs` → `backup.pdf` (one slide per page, 1920×1080, settled state).
- `triu-deck.zip` = `deck/` + `backup.pdf` + `README.txt` (how to open, key map, fallback). Exclude `node_modules`, `assets/` raw files.

---

## 6. Hard constraints

- Offline at runtime. Fonts bundled. No external requests (checked).
- 16:9, designed for 1920×1080, legible at 1280×720.
- Opens from `file://` in Chrome/Edge; also works via `python3 -m http.server`.
- Controls compatible with standard presentation clickers (PageDown/PageUp, F5, `.`/B).
- Total package < 60 MB.

## 7. Anti-slop rules (in addition to the refs)

Banned unless a reference image clearly shows it: purple/blue AI gradients, glassmorphism and backdrop blur cards, glowing orbs, neon outlines, emoji or generic icon sets, stock "AI brain/circuit" imagery, centred-everything layouts, more than two typefaces, drop-shadow-heavy cards, gradient text, "Revolutionizing/Unlock/Empower" style copy, decorative animations on every element, scroll-jacked parallax on text.
Required: one clear focal point per slide; a visible grid; deliberate type scale; generous negative space; a single accent colour used for emphasis only; real figures shown honestly.

## 8. Scientific integrity

- Dandy's content file is the only source of scientific text, numbers and figures. Never add or "improve" a number.
- The AI video and stills are **illustrative atmosphere**. They must not resemble an MRI scan, a protein structure render, a chart or a microscopy image closely enough to be mistaken for data. Credit them as illustrative once in the deck.
- Never generate, redraw or "enhance" a data figure with AI. Resizing and placing only.
- If something in the content looks inconsistent (e.g. a number differs between two slides), do **not** fix it silently: list it in the final report as "for Dandy to check".

## 9. Cost & failure policy

| Item | Cap | On failure |
|---|---|---|
| Image calls | 9 per still, 18 total | lower ambition of the prompt, keep best so far |
| Veo generations | 3 | manual fallback 5.5B + crossfade sequence |
| Quality rounds | 3 | ship, list remaining issues |
| Any paid call beyond caps | — | ask Dandy first |

Log model IDs, call counts, and estimated spend in `BUILD_LOG.md`.

## 10. Definition of done (final report must tick each)

- [ ] `content.json` matches the source (slide count, spot-checked wording, all figures)
- [ ] `DESIGN.md` with ref-cited decisions; fonts bundled
- [ ] `STORYBOARD.md` with every slide's `t`
- [ ] `start.png`, `end.png` accepted (scores logged); `master.mp4` from Veo **or** clearly flagged crossfade fallback
- [ ] Frames + manifest; size within budget
- [ ] Deck works offline from `file://`; all keys incl. PageDown/PageUp; presenter window with notes + timers
- [ ] All slides screenshotted and reviewed; skill critiques applied or conflicts logged
- [ ] `tools/check.mjs` passes
- [ ] `backup.pdf` + `triu-deck.zip` built
- [ ] Final report: what was built, spend, anything flagged for Dandy (content inconsistencies, fallbacks, unresolved critique items)

## 11. At the venue (copy into README.txt)

1. Copy `triu-deck/` to the presenting computer, double-click `index.html` (Chrome/Edge). If frames don't show, run `python3 -m http.server 8000` in the folder and open `http://localhost:8000`.
2. F = fullscreen, N = presenter window (move it to the laptop screen), clicker forward = PageDown.
3. Anything wrong → open `backup.pdf` fullscreen and keep going. Don't debug on stage.
