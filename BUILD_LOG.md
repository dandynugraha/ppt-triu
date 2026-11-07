# BUILD_LOG.md — Tri-U 2026 scroll deck

Run date: 2026-11-07. Executor: Claude Code (claude-opus-5-5).

## Overrides from Dandy (binding for this run)
- **No image/video generation API or website.** Phases 5.4–5.5 replaced by a procedural render (WebGL + Canvas 2D, deterministic, 192 frames via Playwright). Then continue from 5.7.
- Order of slides follows the script (`Tri-U_Script_EN_ID.docx`); paper (`Muhammad Dandy Nugraha_Healthcare Innovation.docx`) is the source for numbers.
- Intro flow from `flow.PNG`: IPB logo in → IPB slides left, Tri-U logo enters → Enter → slide 1 → … → end.
- Logos `ipb.png` / `triu.png` supplied later by Dandy → `deck/assets/logo/`.

## Spend
| Item | Calls | Cost |
|---|---|---|
| Image generation | 0 | USD 0 |
| Video generation | 0 | USD 0 |
| Any paid API | 0 | **USD 0** |
No `.env` / API key used. All rendering local.

## Setup (§4)
- Python 3.14 with python-docx, pymupdf, pillow, numpy already present.
- `npm i -D playwright@1.65.0 @fontsource/onest @fontsource/noto-sans-thai` — OK; Chromium installed.
- ffmpeg not installed → not needed (frames are encoded to WebP inside Chromium by `canvas.toDataURL('image/webp', 0.86)`).
- `npx skills add https://github.com/Leonxlnx/taste-skill` — **blocked** by the session's permission policy (installing third-party code). The impeccable and emil-design-eng installs were therefore not attempted. Command for Dandy if wanted: `npx skills add https://github.com/Leonxlnx/taste-skill`, `npx skills add pbakaus/impeccable`, `npx skills add https://github.com/emilkowalski/skills --skill emil-design-eng`. Review was done manually against the same criteria (see Quality pass).

## Input layout
Files were in the project root, not in `input/`. Copied (originals untouched):
- `input/content/` ← script docx, paper docx, `flow.PNG`
- `input/refs/ref_a_partnership_deck.png` ← `2c1dc6be-….png`; `input/refs/ref_b_neuroanatomy_deck.png` ← `c1f06946-….png`
STOP condition not met (content readable, 2 refs present).

## 5.1 Ingest → `build/content.json` (`tools/ingest.py`)
- Script parsed into 10 slides (`SLIDE n  label  start–end`), spoken EN + ID columns → notes, last "→" row → bridge line, director's line under each heading → `instructions`.
- 3 backup slides (validation design, software comparison, protein structure) added because script slide 10 says "I have extra slides on…"; their text is from the paper only.
- **Every on-screen string carries a `src` quote that is asserted verbatim against the script or paper text** (normalised whitespace/dashes, case-insensitive). 100 fragments checked, 0 failures. Two fragments I first wrote ("Before the results", "Resolution …") failed or were not Dandy's words → replaced/removed.
- Figures: script 0 images, paper 0 images → no figures exist; nothing extracted, nothing drawn. Numbers are set as type.
- Spot-check (random seed 7: slides 6, 3, 7): notes match the script word for word.
- Slide count = source (10) + 3 declared backups.

## 5.2 Design → `DESIGN.md`, `deck/css/tokens.css`
- k-means (k=6,10) via `tools/palette.py`; lime sampled separately (0.57 % of ref A, below the 3 % cut but it is the refs' signature highlighter).
- Contrast via `tools/contrast.py`. Adjustments: muted #555B76 → #4A4F6B (6.68 → 8.01 on white); text-bearing violet panels use #2E2DB8 (white 9.62) — periwinkle only as a non-text glow.
- Font: Onest 400–700 (OFL) bundled; Noto Sans Thai 500 bundled only for "ขอบคุณครับ" (script fallback, logged as allowed exception to "max two typefaces" — it is the same role, not a second display face).
- Refs agree (light, violet-blue, left text / right hero) → single system, no STOP.
- PRD §7 bans "purple/blue AI gradients unless a reference clearly shows it": both refs clearly use violet→periwinkle gradients, so one gradient panel per slide max is allowed.

## 5.3 Storyboard → `STORYBOARD.md`
- Concept kept from PRD default (multi-scale descent), abstracted: orb → vessel-like filaments growing inward to a soft core → curved wall with receptor-like stalks.
- t map: intro 0, S1 .05, S2 .17, S3 .32, S4 .46, S5 .53, S6 .60, S7 .66, S8 .86, S9 .93, S10 1.0, backups hold at 1.0 (intentional hold).
- No stop placed inside the 0.67–0.83 crossfade (double exposure).
- S3 at t=.32 deliberately lands mid-growth so the script line "You can see it growing inward here" has something to point at (illustrative, credited).

## 5.4–5.5 (replaced) Procedural render → `deck/frames/`
- `assets/render/scene.html`: WebGL fragment shader (orb shading, interior field, wall) + Canvas 2D (vessel trees, stalks) + baked paper mask x<40 %. Seeded RNG (mulberry32), no clock → deterministic. Verified: re-rendering frame 100 gives a byte-identical file.
- `tools/render.mjs`: Playwright Chromium (SwiftShader WebGL), 192 frames, `toDataURL('image/webp', .86)`, writes `manifest.js`.
- Iterations (all logged as decisions):
  1. v1: vessel network far too dense (hair-ball), white hole at core, messy B→C. → depth 6→4, branch prob .42→.26, 9→6 roots, sprouts 46→22, core as soft noisy blob, vessels fade with wB^1.6.
  2. v2: good; growth moved earlier (ss .17–.40) so slide 3 shows active growth.
  3. Orb folds read as a world map (continents) — rejected; tried cloudy marble (planet look) — rejected; ridged creases (jagged) — rejected; **final: smooth sinusoidal fold ribbons bent by low-frequency noise** — reads as a folded organic form, clearly illustrative, not an MRI.
- Checks on a 12-frame sheet: continuous motion, no cuts (one crossfade per stage change), no text, left 40 % pure paper in every frame, nothing resembling MRI slice / protein render / chart / microscopy.

## 5.7 Engine → `deck/index.html`, `deck/js/engine.js`, `deck/css/deck.css`
- Zero dependencies, `<script>` data files, works on `file://`. Stage is a 1920×1080 box scaled to fit; canvas draws the nearest loaded frame (cover math, DPR ≤ 2); 2 px progress line while preloading.
- Keys per PRD incl. clicker keys, number jump (digits + Enter or 0.9 s pause), F/F5, B/`.`, N presenter (written via `window.open('')`, keys forwarded, EN notes + ID translation + director's line + lime bridge line + slide/total timers vs the script's per-slide budget).
- Tween: `clamp(700, 400 + 9·Δframes, 1600)` ms, ease `1-(1-t)^5`, cancel-and-retarget, backward plays backward. Content enters after settle (220 ms, 8 px rise, 50 ms stagger), leaves in 110 ms.
- Wheel 40 px threshold + 750 ms lock; pointer right 2/3 next, left 1/3 previous; reduced-motion jumps frames; `?static`, `__go(n)`, `__ready`, `#n`.
- Grain generated in-page (LCG noise → data URL), 4 %, masked to the art zone.
- Figure `highlight` option not implemented: content contains no figures and no emphasis instruction, so it would be dead code.
- Intro: logos animate per `flow.PNG`; missing logo files are replaced by the institution name as text (not a placeholder graphic) until Dandy drops the PNGs in.

## 5.8 Compose → `deck/slides.js` (`tools/build_slides.py`)
- Layout per slide in the left text column (x 112–936); one lime highlight per slide on the claim to remember; violet numerals; one violet panel max.
- "Background: illustrative animation, not data." credit on slide 1 footer.
- On-screen word counts kept ≈ ≤ 30 on main slides (title slide is longer because the full paper title is mandatory). Everything else stays in presenter notes.

## 5.9 Quality pass
### Round 1 findings (screenshots `shots/NN.png`)
- Violet panels rendered white on slides 6–7 (`.cell` background overrode `.panel` by source order) → fixed with higher specificity.
- Static screenshots captured the intro mid-fade over slide 1 → transitions disabled under `?static` for intro/header.
- Slide counter (top right) collided with vessels/stalks on slides 3, 7, 8, 9 → moved to bottom-left of the text column.
- Slide 7 title at display size broke as "all the / data." with a split highlight → set at h1.
- Slide 10 link wrapped mid-URL → contact lines stacked.
- Backup A values wrapped to 3 lines → values moved below the description.
- Slide 5 card heads misaligned → fixed index spacing.
- Orb "world map" look → see render iterations.

### Round 2
- All 14 slides re-shot at 1920×1080 + slides 1, 7, 13 at 1280×720. Reviewed every shot: text fits, nothing on the moving subject, counter clear of art, one lime mark per slide, panels render, 720p legible (smallest text ≈ 12 px at 720p = micro labels only).
- No further defects → stopped at round 2 (cap is 3).
- Manual review in place of the blocked skills — conflicts kept on purpose: refs use violet gradients (PRD §7 allows when a ref shows it); slide 6 uses both a lime mark and a violet panel (ref A pairs them); slide 1 exceeds ~30 words because the full paper title is required.

### `tools/check.mjs` — all checks passed
frames 192 = manifest · frames 9.36 MB · deck 9.54 MB · no http(s) in runtime · no TODO/placeholder · fonts bundled and loaded · all contrast pairs ≥ 7:1 (lowest violet/paper 7.16) · every slide reachable forward and backward by keyboard · rapid 5× Enter ends on slide 6 at its frame · number jump · End · B and `.` black screen · presenter window opens with notes + timers and its keys drive the deck · wheel = one slide · `#7` deep link · all text inside the text column · no console errors · no network requests.
WARN only: logo files not yet added (text fallback shown).
(One early FAIL was a bug in the check itself — case-sensitive match on CSS-uppercased "TOTAL" — fixed in the check, not in the deck.)

## 5.10 Export & package
- `backup.pdf` — 14 pages (intro + 10 + 3 backup), 1920×1080, settled state, 2.74 MB (`tools/export.mjs`).
- `triu-deck.zip` — `triu-deck/deck/` + `backup.pdf` + `README.txt`, 11.82 MB, 210 files. Excludes node_modules and raw render sources.

## For Dandy to check (not changed silently)
1. Script slide 7: "**Eleven** sides here are finished" — a Rubik's cube has six faces. Maybe "five sides"?
2. Script slide 8: "about **twelve patterns explain ninety percent**" — the paper only says "a few underlying dimensions". Kept in notes, **not** shown on screen.
3. Script slide 4: "about **a thousand**" measurements per scan — paper has 704 (pre-computed) and 1,098 (re-extracted). Fine as a spoken approximation; on-screen text avoids the number.
4. Paper §2.2 typo: "**Pre-Pre-computed** descriptors". Paper only, not in deck.
5. PRD calls the event "32nd Tri-U IJSS"; the script and paper never say "32nd", so the deck omits the ordinal.
6. No figures exist in either file. If you want a real figure (e.g. from the supplementary at ipb.link/triu-nugraha-2026), add it and it will be placed unaltered.

---

## v2 — Dandy's feedback (same day)
Request: (1) font looks AI-generic → change it; (2) every Enter only zooms → different, more drastic changes and layouts per slide; (3) slides look text-sparse → refine positioning, add shape/bold animation. "Don't change anything else."

### What changed (and only this)
- **Font:** Onest → Newsreader (serif display/numerals/quotes) + IBM Plex Sans (text/labels). Both OFL, bundled `.woff2`; Onest files removed from `deck/fonts`.
- **Frames:** re-rendered 2560×1440 without the baked left mask (11.40 MB, 192 frames, 0 errors, ~7 min) so the art can be framed anywhere. Camera, timing and content of the animation unchanged. v1 frames kept in `build/frames_v1_backup/`.
- **Engine:** added the art window (dest rect, radius, offset, zoom) + ground colour, both tweened on the existing frame-tween clock; dark theme and header pill per slide; numeral count-up. Keys, presenter, timers, hooks, intro flow untouched.
- **Slides:** 13 new compositions (DESIGN.md v2 table). Kickers, masked word reveals, lime wipe, drawn rules/rings/timeline/pipeline, outline numerals, wipes.
- **More text:** 16 supporting lines added, each verbatim from the script or paper and verified by `tools/ingest.py` (116 fragments, 0 failures).
- **check.mjs:** "text inside the left column" replaced by "no text over the art window unless on an opaque card"; font check now Newsreader + Plex.

### Quality pass v2
- Round 1: S2 panel showed paper in a corner → zoom 0.8 onto the orb; S4 band mostly empty fog and overlapped by the aside → band moved down, zoom 0.5 on core + vessels; S7 0.497 panel lost its violet (`.vcell` order) → fixed; backup values too small (`.card p` override) → fixed; S1 author line wrapped → smaller in meta row.
- Round 2: S7 card had empty lower third → card height follows content; strike-through centred on the digits; S7 card now wipes in.
- Live mid-transition captures (`tools/midshots.mjs`, `shots/mid_*.png`) confirm the window morphs (band → lens on violet, capsule → full bleed), word reveals, lime wipe, timeline draw.

---

## v3 — revert to v1 + new font (Dandy: "JELEK, BAGUS YANG TADI, UBAH LAGI KAYA TADI, FONT JUGA GANTI, JANGAN FONT ITU")
- Restored v1 frames from `build/frames_v1_backup/` (192, 9.36 MB) and reverted `assets/render/scene.html` to v1; re-rendering frame 100 is byte-identical to the restored frame, so source and frames match.
- Reverted `deck/css/deck.css`, `deck/js/engine.js`, `deck/index.html` (scrim back), `tools/build_slides.py`, `tools/check.mjs` (text-column check) to their v1 state.
- Font: Newsreader + IBM Plex Sans removed; **Schibsted Grotesk** bundled (8 woff2: latin + latin-ext, 400–700). Only the font token changed in `tokens.css`; all v1 sizes/tracking kept.
- `build/content.json` still contains the 16 extra verbatim lines from v2, but the v1 layout does not display them (no visible change).

---

## v4 — subject changes per slide + varied text animation (Dandy: "YANG AKU MAKSUD BEDA BEDA ITU BUKAN DARI LINGKARAN JADI KOTAK, TAPI DARI GAMBAR OTAK JADI RADIO MISALNYA TERUS SLIDE BERIKUTNYA JADI PROTEIN DLL. TERUS JUGA DARI SEGI TEXT MUNCUL DLL ITU BEDA BEDA ANIMASINYA")
- Interpretation logged: "radio" = radiology → an MRI scanner (the machine, not a scan image).
- New shot (STORYBOARD v4): brain → MRI scanner → vessels (v1) → DNA → linked rings → coin → puzzle cube → twin spheres → protein-like chain → brain. Ray-marched SDFs, morphing, deterministic, no API. Layout v1 + Schibsted Grotesk unchanged.
- **Integrity note (PRD §8 vs Dandy's explicit request):** the PRD asked that the animation not resemble a protein structure; Dandy now explicitly asked for a protein. It is a glossy bead chain in the deck palette (no backbone, no residues, no real fold), clearly illustrative, and slide 1 credits the background as "illustrative animation, not data". Flagged in the report.
- Text: per-slide entrance variants + count-ups (DESIGN v4); settled positions identical to v1.
- check.mjs: all passed; backup.pdf + triu-deck.zip rebuilt for v4.

---

## v5 — Dandy: "animasi gambarnya terlalu cepet dan disitu situ aja, kurang menarik, gambarnya banyak yang kurang pas; rubiknya ganti jadi megaminx; bg jangan putih polos; contoh baru.jpg referensi; THINKING HARD"
- Read `contoh baru.jpg` (copied to `input/refs/ref_c_electric_tech_deck.jpg`): dark black→electric-blue field, glowing particle imagery, regular-weight white type, bracket labels.
- Art rebuilt as a **particle system** (STORYBOARD v5). Subjects re-chosen to match each slide's content (rings/coin/twin spheres dropped; pipeline, 704-test grid, 61 flare, two brains added); **megaminx** replaces the 3×3 cube.
- Motion: 374 frames with per-slide HOLD segments → the deck sways the art continuously while a slide is shown; travel 1.6–3.4 s with in/out easing (deviation from PRD's "never ease-in", at Dandy's request); text arrives at 82 % of the travel.
- Deck: dark theme tokens (contrast all ≥ 7:1, checked), bracket labels, white logo pill, corner mark, regular display weight. Layout v1 and Schibsted Grotesk unchanged. Intro cover stays light.
- Iterations: megaminx v1 faces wrong (normals guessed) → normals found numerically; then faces truncated by the 4 200-particle cap → fewer points per face; vessel tree too compact → roots further out, more branches; twin brains overlapping → spaced.
- Frame budget: check raised to < 40 MB for the longer shot (package limit 60 MB unchanged).
- v5 checks: all passed (see check.mjs output); live travel 6→7 measured 2.1 s, hold sway frames 252–265 (tools/motioncheck.mjs). backup.pdf + zip rebuilt.

---

## v6 — Dandy: "ganti tri-u 2026 jadi tri-u 32 · di laptop agak ngelag · bintiknya kurang banyak · warna boring · kenapa tulisan di kiri semua, tukar ke kanan juga · jangan pas di tengah gradasinya · jangan biru doang · PENTING: bg transisinya ke atas pas next dan ke bawah pas back (bg saja) · jangan full hitam"
- Root cause of the lag: 374 × 1920×1080 frames decoded in memory (~3 GB). Replaced by live WebGL (`deck/js/art.js`): morphs run in the vertex shader; background shader only evaluates the 3 page sections on screen; canvas DPR capped 1.25; 30 fps while idle, 60 fps while travelling; automatic quality fallback (verified: on the software-GL test browser it stepped 7 000 → 4 800 particles by itself).
- Particles 4 200 → 7 000 (denser shapes); per-subject colour schemes; megaminx faces coloured by a hue wheel.
- Background rebuilt as a vertically scrolling coloured page (next = up, back = down; verified live: position rises on next, falls on back). Text and art do not scroll.
- Text alternates sides; art moves to the opposite side; calm zone follows the text; the zone relaxes while travelling so particles can fly across the whole screen.
- "Tri-U 2026" → "Tri-U 32" (logo fallbacks, intro title, README, page title).
- Frames removed (`deck/frames/` deleted; v4/v1 kept in `build/` for reference). check.mjs updated for the live renderer; new `tools/textcontrast.*`, `tools/midframes.mjs`, `tools/motioncheck.mjs`.
- Results: all checks passed; 122/122 text runs ≥ 8.05:1 on the real background; backup.pdf 14 pages.

---

## v7 — Dandy: "hilangkan kotak-kotaknya · perubahan warna jangan pas di tengah, dibikin diagonal · gambarnya kecil, tersebar, banyakin titiknya biar kebentuk · siap di-up ke GitHub Pages"
- Background grid hairlines removed. Section colours now blend along a diagonal page coordinate (`wd = wy + (x-.5)*.62`), diagonal shading added, and the calm zone under the text has a slanted edge instead of a vertical seam.
- Particles 7 000 → 10 000; ambient dust 250 only; forms topped up with jittered copies on the subject (denser shapes); subjects ~25–35 % larger, refitted so none is cut by the frame edge; crisper dot size. Auto-quality steps now 10 000 → 6 500 → 4 000.
- Checks: all passed; 122/122 text runs ≥ 7:1 on the real background.
- GitHub Pages: root `index.html` forwards to `deck/`, `.nojekyll`, `README.md`, `.gitignore` keeps private inputs (paper, script, reference images), build artefacts and superseded renderers out. Local repo initialised on `main` and committed; tested over HTTP (root → deck, WebGL on, navigation works, no errors). Not pushed (waiting for the repository link).
