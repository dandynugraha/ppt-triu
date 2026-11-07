# DESIGN.md — Tri-U 2026 scroll deck

Refs (in `input/refs/`):
- **A** = `ref_a_partnership_deck.png` — 14-slide business deck: paper-white + periwinkle/violet gradient panels, lime highlighter on key words, white rounded cards, grotesk type.
- **B** = `ref_b_neuroanatomy_deck.png` — 9-slide neuro deck: white slides, deep violet titles, glossy violet→pink stylised brain on the right half, flat pale-blue disc behind it, small logo + label top-left, filled violet pill buttons.

The two refs agree (light, violet-blue, rounded, left text / right image), so one system fits; no STOP.
**BEST_REFS:** A, B (only two exist; both used).

## Mood
Quiet clinical-editorial: white paper, one deep violet ink for structure, a single lime mark for the one thing to remember, and an illustrated form living on the right half. (A: lime marks; B: white + violet + right-side hero.)

## Grid (1920×1080)
| Token | Value | Source |
|---|---|---|
| Outer margin L/R | 112 px (5.8%) | B: title block starts ~6% from left edge |
| Top / bottom margin | 72 / 72 px | B: header logo row sits ~6% from top |
| Columns | 12, gutter 24 px | A: card rows split cleanly into 2/3/4 |
| Text column | cols 1–6 → x 112–936 (5.8–48.8%) | A + B: text always left, image right |
| Art zone (video subject) | x ≥ 1000 (52–100%) | B: brain occupies right ~50% |
| Header row | y 56–96: logos + event label left, slide counter right | B: "Neurology" logo row on every slide |

## Type
Refs show one geometric/neo-grotesk family in several weights (A: tight Cyrillic grotesk, semibold titles, sentence case; B: rounded geometric sans, bold violet titles). Choice: **Onest** (OFL, Cyrillic-born grotesk closest to A, round enough for B), weights 400/500/600/700, bundled `.woff2` in `deck/fonts/`. Thai glyphs for "ขอบคุณครับ" on the close slide only: **Noto Sans Thai 500** (script fallback, not a second display face).

| Role | px @1920 | weight | line-height | tracking | Source |
|---|---|---|---|---|---|
| display (close, single-line titles) | 112 | 600 | 0.98 | −0.035em | B "Neuroanatomy" / "Thanks You" |
| h1 (slide titles) | 68 | 600 | 1.04 | −0.025em | A titles, B "Gross Anatomy" |
| title-long (paper title, slide 1) | 52 | 600 | 1.08 | −0.02em | B cover subtitle scale |
| number (stat numerals) | 112 | 600 | 0.95 | −0.04em, tabular | A "на 40%" / "01 02" numerals |
| h3 (card heads) | 30 | 600 | 1.15 | −0.01em | A card titles |
| body | 25 | 400 | 1.42 | 0 | A/B body copy |
| label / chip | 19 | 500 | 1.2 | +0.01em | A chips, B pill |
| micro (credits, counter) | 18 | 500 | 1.3 | +0.02em | B header label |

Max line length: 26 em for body, 18 em for titles. Sentence case everywhere (A and B never set titles in all caps except A's one brand slide).

## Colour (sampled with k-means k=6/10, `tools/palette.py`)
| Token | Hex | Sampled from | Use |
|---|---|---|---|
| `--paper` | #F8F9FB | A 26.9% | page / video left zone |
| `--lavender` | #EFEEF8 | B 26.1% | soft surface tint, disc behind subject |
| `--card` | #FFFFFF | A/B card fill | cards |
| `--ink` | #1C202B | A 5.2% | primary text |
| `--muted` | #4A4F6B | A #555B76 darkened to pass 7:1 | secondary text |
| `--rule` | #C5CCE0 | A 6.5% | hairlines (decorative only, not text) |
| `--violet` | #3D3CD3 | B saturated median | titles, chips, numerals |
| `--violet-deep` | #2E2DB8 | B #3A40C9 darkened | text-bearing violet panels |
| `--periwinkle` | #5A7AF3 | A saturated median | panel glow (never under text) |
| `--lilac` | #8385ED | B 4.0% | video mid-tone |
| `--lime` (accent) | #D9FA3F | A 0.57% (highlighter) | ONE highlight per slide, behind ink text |
| `--pink` | #F099C2 | B brain highlight | video only |
| scrim | `--paper` 100% → 0% over x 0–56% | B white left half | guarantees text never sits on motion |

Contrast (computed, `tools/contrast.py`, all ≥ 7:1): ink/paper 15.4 · ink/card 16.3 · muted/card 8.0 · muted/paper 7.6 · violet/card 7.5 · violet/paper 7.2 · white/violet-deep 9.6 · ink/lime 13.7. Violet text is never placed on `--lavender` (6.5 fails). White text never on `--periwinkle` (3.8 fails).

## Surfaces & detail
- Radius 22 px cards, 999 px pills (A cards ≈ 20–24 px at 1920; B pills).
- Hairline 1 px `#E3E6F0` around white cards; no drop shadows beyond `0 1px 2px rgba(28,32,43,.05)` (A cards read flat).
- Violet stat panel: `--violet-deep` → `--violet` linear, periwinkle glow in the corner opposite the text (A "Долгосрочная прибыль" cards).
- Lime highlighter: block behind 1–4 words, radius 6 px, padding 0 .14em (A "главный мультипликатор", "прибыль").
- Chips: 1.5 px violet outline, violet text, pill (A "Эффективные союзы").
- Numbering: two-digit `01 02 03` in violet numerals (A "Результат интенсива").
- Grain: fine monochrome grain overlay at 4% over the video only (B's soft 3D render has visible noise; A's gradients are smooth — so grain is kept subtle).
- Image treatment: the illustrative animation lives full-bleed on the right half, fading into paper on the left (B cover).
- Captions: micro size, muted, top-aligned under the element.
- No real figures exist in the content files (paper has 0 embedded images), so data are set as type, never drawn.

## Motion character
Calm and exact (both refs are still and orderly): frame scrub with strong ease-out, content rises 8 px and fades in 220 ms, staggered 50 ms. Nothing loops or bounces on slide content.

## Do
- Left text / right art on every slide (A, B).
- One lime mark per slide max, on the single claim to remember (A).
- Violet numerals for numbers; ink for sentences (A, B).
- Logo + event label in the header of every slide (B).

## Don't
- No glassmorphism or blur cards (A uses flat white cards; banned by PRD §7).
- No glowing orbs, neon, gradient text, emoji, icon sets (neither ref relies on them for meaning).
- No stock photos (B uses them; we have none and must not invent imagery that reads as data).
- No centred-everything layout except the close slide (B "Thanks You" is left-aligned too — keep left).
- No more than one violet panel per slide.

## Logos
`deck/assets/logo/ipb.png` and `deck/assets/logo/triu.png` (Dandy adds them). Header shows both at 40 px high; intro shows them at 200 px. If a file is missing the image hides itself and the institution name is shown as text instead.

---

## v2 revision — Dandy's feedback (supersedes Type, Grid "text column" and Motion above)

**Why:** the Onest + lime-chip look read as a generic AI template; every Enter looked like the same zoom; slides felt sparse.

### Type (v2)
| Role | Face | px @1920 | Note |
|---|---|---|---|
| Headlines, numerals, pull quotes | **Newsreader** 400/500/600 + italic (Production Type, OFL) | 56–184 | Editorial journal serif; italic carries emphasis, inside the lime mark |
| Text, labels, kickers, tables | **IBM Plex Sans** 400/500/600 (IBM, OFL) | 16–25 | Research/technical sans; labels in uppercase +0.12em |
| Thai close line | Noto Sans Thai 500 | 56 | Script fallback only |
Scale: close 184 · xl 120 · l 84 · m 64 (long title 56) · numerals 92–190 · pull 30–36 · body 22–25 · label 17.
Kicker = serif number — drawn rule — uppercase label (journal running head), replacing the outlined chips.

### Layout (v2): one composition per slide
The art is shown through an **art window** that morphs between slides (rect + radius + offset into the frame), so each Enter changes the composition, not only the zoom. Text never sits on the art except on an opaque card (checked).
| # | Composition | Art window | Ground |
|---|---|---|---|
| 1 | Cover: title left, meta row with drawn rule | circle Ø820 + hairline orbit (ref B disc) | paper |
| 2 | Statement + two cards + giant 91 | tall rounded panel right | paper |
| 3 | Art LEFT, vertical drawn timeline right | rounded panel left | paper |
| 4 | Title row + aside, wide band, 3-node pipeline | full-width band | paper |
| 5 | Big statement, outline numerals 01/02 | small lens + lime arc | **violet-deep** |
| 6 | Number wall 704 · 61 · 35 · 0 (counts up) | capsule strip right | paper |
| 7 | Solid white card over full-bleed art | full bleed | paper |
| 8 | Title across, two result cards | Ø900 circle running off the corner + orbit | paper |
| 9 | Manifesto right, violet ask panel | narrow strip left | paper |
| 10 | Thank you, Thai line in lime | Ø1100 circle + lime arc | **ink** |
| 11–13 | Backup: wide content, data in serif | small Ø268 circle | paper |

### Motion (v2)
Kept: frame scrub with strong ease-out `1-(1-t)^5`, cancel-and-retarget, backward plays backward. Added on the same clock: art window shape/position and ground colour morph (≥1000 ms when the window moves). After settle: headline words rise out of masks (760 ms, 34 ms/word), lime mark wipes in under the italic phrase, cards/panels wipe left→right (clip-path 900 ms), rules/timelines/pipeline lines draw, nodes pop, orbit rings draw, numerals count up to their real value (final value always the true one; static/PDF show the true value only), strike-through draws across 0.687 and 0.497 rolls down from 0.687. Exit stays ≤120 ms.

---

## v3 — current (supersedes the v2 section above)
Dandy rejected v2 ("jelek, bagus yang tadi") and asked for the v1 design back with a different font that is neither Onest nor Newsreader/IBM Plex.
- **Layout, motion, frames: exactly v1** (sections Grid, Surfaces, Motion, Do/Don't at the top of this file apply again; the v2 table no longer applies).
- **Font: Schibsted Grotesk** 400/500/600/700 (OFL, Schibsted media group, 2023) — an editorial newspaper grotesk: same role and sizes as the v1 type table, with more distinct letterforms than Onest. Thai line still Noto Sans Thai 500.

## v4 — text entrances vary per slide (settled layout = v1)
words (01) · wipe + card pop + count (02) · open-up + slide-in steps (03) · 3D flip cards (04) · scale-settle + far rise (05) · bounce cells + count (06) · word rise + animated strike + arrow + 0.687→0.497 roll (07) · cards from opposite sides (08) · panel stretch (09) · letter-by-letter (10) · fade (backups). Lime highlight wipes in on every slide. Easing stays the v1 strong ease-out.

---

## v5 — current (supersedes colour + motion above; layout = v1, font = Schibsted Grotesk)
New reference **C** = `input/refs/ref_c_electric_tech_deck.jpg` ("contoh baru.jpg"): black → electric-blue diagonal field, soft blue glow, faint grid, regular-weight white display type, small `[bracketed]` labels, corner triangle mark, glowing particle / plexus imagery, white pill for the brand block.
| Token | Hex | From |
|---|---|---|
| paper (field, left) | #04050B | ref C black |
| field right | #1219A8 → #2A34F2 | ref C electric blue |
| card | #0E1230 | ref C dark panels |
| ink | #F4F6FF | ref C white type (18.9:1) |
| muted | #AEB6DA | (10.2:1 paper, 9.2:1 card) |
| accent text | #9FB0FF | (9.8:1) |
| panel | #1E27C9 → #2A34F2 | ref C blue blocks (white 7.3:1) |
| glow | #46D8FF cyan, #FF5FAE pink | ref C particle renders |
| lime highlight | #D9FA3F with #04050B text | ref A (kept, 17.2:1) |
Display weight 500 (ref C uses regular weights). Intro cover stays light (#F8F9FB) and lifts to reveal the dark field.

### Motion v5
Frame travel 1.6–3.4 s with a gentle in/out curve (Dandy: too fast); text arrives at 82 % of the travel; while a slide is shown the art keeps swaying inside its 14-frame hold (9 s period) so it never freezes.

---

## v6 — current (supersedes colour/art notes of v5; layout v1, font Schibsted Grotesk)
- **Live art** (`deck/js/art.js`, WebGL): background page + 7 000 particles; no video frames (package 0.25 MB). Auto quality: 7 000 → 4 800 → 3 200 particles and lower resolution if the laptop drops under ~35 fps.
- **Background = scrolling page**: 11 sections stacked vertically; deck position = scroll (next → page moves up, back → down). Each section has a coloured dark base (indigo #150E3C, deep teal #06293A, plum #260A33, navy #0D1848, violet #1B0F4C, midnight #0C1236, violet-plum #140A38, aubergine #28122E, petrol #082C3E, indigo #1B0E40) and 2–3 off-centre light blobs (violet, magenta, teal, crimson, amber, coral, cyan). Never pure black, never a centred blob. Horizontal hairlines belong to the page and scroll with it.
- **Text alternates sides**: 1, 3, 5, 7, 9 left; 2, 4, 6, 8, 10 and backups right. A tinted (not black) calm zone sits under the text column; it relaxes during travel when no text is on screen.
- **Particle colours vary per subject**: brain cyan→violet→magenta with amber tumour; MRI teal; vessels pink→coral with amber core; pipeline cyan grid / teal+magenta helix / coral protein; checks teal grid + amber & lime lenses; 61 magenta flares; megaminx faces from a hue wheel (neighbours differ) with one lime face; twins slate vs amber/gold; protein rainbow with lime pocket; close brain amber→pink→violet.
- **Measured**: every text run (122) against the actual rendered background ≥ 8.05:1 (`tools/textcontrast.mjs` + `.py`).
- Header label "Tri-U 32" (was "Tri-U 2026").

---

## v9 — current (supersedes v5–v8 art/type notes; background page from v7 kept)
**Why:** Dandy — dots everywhere read as AI-generic; some subjects made no sense (slide 6 "just a plate"); text treatments all the same (card / lime / blue box); wanted charts, a correct 2OH4 protein, and a bold, Apple-like font.
- **Type:** Inter Tight 600/700/800 (display; tight, keynote-style) + Inter 400/500/600 + italic (text). Both OFL (SF Pro cannot be bundled; Inter is its closest open counterpart). Eyebrow labels: 15 px, +0.16 em, uppercase, lime rule.
- **Visuals (one per slide, opposite the text):** 1/10 contour brain (axial slices, sweeping scan plane, amber/lime tumour); 2 waffle of the 91 patients (46 HIGH / 45 LOW); 3 angiogenesis schematic (tumour → signal → VEGFR-2 receivers → new vessels; bevacizumab blocks the signal); 4 pipeline infographic with real counts; 5 704-test grid + leakage split diagram; 6 bar chart 704 → 61 → 35 → 0; 7 AUC dot-and-interval chart (0.687 ± 0.081 vs 0.497, 95 % CI 0.346–0.648, 0.5 line, +0.190 bracket); 8 paired bars from Table 1; 9 & backup C the real PDB 2OH4 structure (C-alpha tube by secondary structure, inhibitor GIG ball-and-stick, Val914/Asp1044/Phe1045 labelled); backups A/B reuse the AUC and Table-1 charts.
- **Text compositions differ per slide:** hero + giant stat (1), definition list + inline stat (2), filled big-numeral stepper (3), tri-colour giant title + bar quote (4), giant statement + pill tags (5), mega title + 4-up stat row (6), quote-led (7), callout box (8), lime ask with underline (9), letter-by-letter "Thank you." (10).
- **Motion:** each title its own move (rise, wipe, slide, flip, scale, drop, split, reveal, letters); visuals draw themselves (bars grow, lines draw, dots pop, the nested AUC point travels from 0.687 to 0.497, signals flow from tumour to receivers).
- **Colour:** accents cyan #3FE0FF, magenta #FF8AE6, amber #FFC24B, lime #D9FA3F, slate #B3BAE4; muted text #C6CCEA. Background darkens softly behind each visual (stage). Measured: 298/298 text runs (incl. chart labels) ≥ 7:1 on the rendered background.
