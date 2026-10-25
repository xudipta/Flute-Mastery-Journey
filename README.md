# 🎶 Flute Mastery Journey

An interactive, animated guide to the **Indian classical bansuri** — daily riyaaz, finger-hole charts, ragas, taal and technique, from beginner to professional.

**Live site:** https://xudipta.github.io/Flute-Mastery-Journey/

## Features
- Daily riyaaz routine with per-block timers, a breathing animation and a streak tracker (saved in your browser)
- Synthesised tanpura (Pa-Sa-Sa-low Sa, with harmonic shimmer) and tabla, controlled from a tools bar that stays on screen
- Tabla taal player (Teentaal, Dadra, Keherwa, Jhaptaal, Ektaal, Rupak) with adjustable tempo
- Interactive six-hole finger chart (Pa to Ma, with half-covered hole)
- Animated "How to play" demos for 16 ragas (aroha, avaroha, pakad on a finger-hole diagram with sound)
- Five-stage roadmap, 23 raga cards filterable by time of day, and bansuri technique cards (meend, kan, taan, tonguing)

## Run locally
It is a plain static site (no build step):

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```

## Deployment
GitHub Pages deploys via `.github/workflows/pages.yml` on every push to `dev`.
In the repository go to **Settings → Pages → Source: GitHub Actions** (one-time).

## Structure
```
index.html          page markup
assets/styles.css   styling (light/dark aware)
assets/app.js       routine, timer, tools bar, finger chart, content data
assets/audio.js     tabla, tanpura, bell and flute-line synthesis, audio engine
assets/demo.js      finger chart, swar fingering model, demo dialog and player
assets/ragas.js     raga notation data
assets/favicon.svg
```
