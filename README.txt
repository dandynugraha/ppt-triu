Tri-U 32 - scroll deck (Muhammad Dandy Nugraha & Wisnu Ananta Kusuma)

OPEN
  Double-click triu-deck/deck/index.html in Chrome or Edge (hardware acceleration ON:
  Settings > System > "Use graphics acceleration when available").
  The background and particles are drawn live by the graphics card (WebGL) - no video files.
  If a laptop is slow, the deck lowers the particle count by itself after ~1.5 s.
  If nothing shows, open a terminal in the deck folder and run
    python -m http.server 8000
  then open http://localhost:8000

LOGOS
  Put ipb.png and triu.png in deck/assets/logo/ (exact names). No rebuild needed.

KEYS
  Next ........ Enter, Space, Right, Down, PageDown (clicker forward)
  Previous .... Backspace, Left, Up, PageUp (clicker back)
  Home / End .. intro / last main slide (10)
  Number+Enter  jump to that slide (11-13 are backup slides for Q&A)
  F or F5 ..... fullscreen
  B or . ...... black screen (press again to return)
  N ........... presenter window (notes EN + ID, bridge line, slide timer, total timer)
  Mouse wheel = one slide per gesture. Click/tap right 2/3 = next, left 1/3 = previous.

FLOW
  Intro: IPB logo appears, slides left, Tri-U logo enters. Press Enter to start slide 1.

AT THE VENUE
  1. Copy the triu-deck folder to the presenting computer, double-click deck/index.html (Chrome/Edge).
     If frames don't show, run "python -m http.server 8000" in the deck folder and open http://localhost:8000
  2. F = fullscreen, N = presenter window (move it to the laptop screen), clicker forward = PageDown.
  3. Anything wrong -> open backup.pdf fullscreen and keep going. Don't debug on stage.

The background animation is illustrative only (procedurally drawn), not data.
