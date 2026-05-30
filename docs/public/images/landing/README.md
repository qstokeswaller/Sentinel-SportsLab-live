# Landing-page images

This folder holds the public images consumed by the landing page, auth page,
and related public-facing surfaces. All slots are null-safe — if a file is
missing, the layout falls through to its pre-photo design (gradient
background, etc.) so the page still renders cleanly.

## Expected files

| Filename | Used by | Source image |
|---|---|---|
| `hero.jpg` | Landing hero — full-bleed backdrop behind hero content | Image 1 (coach with tablet on pitch) |
| `auth-bg.jpg` | `/login` page — backdrop behind the split-panel card | Image 3 or 4 (sport scientist at desk) |
| `pilot.jpg` | 21-Day Pilot section header strip | Image 2 (group onboarding — after shirt-text fix) |
| `audience-scientist.jpg` | "Built for sport scientists" card | Image 3 (female sport scientist) |
| `audience-coach.jpg` | "Built for coaches" card | Image 4 (male sport scientist) |
| `sc-floor.jpg` | (Optional) Conditioning Hub feature card or section divider | Image 5 (squat with coach) |

## Production guidelines

- **Format**: JPEG (sRGB), quality 85-90. Avoid PNG (large) and HEIC (browser support).
- **Resolution**:
  - Hero: 2400×1350 (16:9) — used as full-bleed
  - Auth backdrop: 1920×1080 (16:9) — heavily blurred, so smaller is fine
  - Pilot strip: 2400×1000 (21:9) cinematic
  - Audience cards: 1200×900 (4:3)
- **Filesize**: aim for <300 KB each; the hero can go to 500 KB.
- **Colour grade**: apply the same Lightroom preset or "auto-match" pass to all images so they read as one shoot, not separate frames.

## Null-safe behaviour

The React layout uses CSS `background-image` URLs for these slots. If a file
is missing, the browser silently fails the request and the underlying
gradient/background remains visible — no broken-image icons. So you can drop
files in one at a time without breaking the page.

## After dropping files

No code change needed — just refresh the browser. If you want the slots
removed entirely (no photo, no slot reserved), tell me and I'll roll the
layout back to its pre-photo state.
