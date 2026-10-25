# 🎶 Flute Mastery Journey

An interactive, animated guide to the **Indian classical bansuri** — daily riyaaz, finger-hole charts, ragas, taal and technique, from beginner to professional.

**Live site:** https://xudipta.github.io/Flute-Mastery-Journey/

## Features
- Daily riyaaz routine with per-block timers, a breathing animation and a streak tracker (saved in your browser)
- Tanpura-style drone with selectable Sa
- Interactive six-hole finger chart (Pa to Ma)
- Five-stage roadmap, raga cards and bansuri technique cards (meend, kan, taan, tonguing)

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
assets/app.js       routine, timer, drone, finger chart, content data
assets/favicon.svg
```
