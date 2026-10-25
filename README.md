# 🎶 Flute Mastery Journey

An interactive, animated guide for daily flute practice and step-by-step skill development — from beginner to professional.

**Live site:** https://xudipta.github.io/Flute-Mastery-Journey/

## Features
- Daily practice routine with per-block timers, a breathing animation and a streak tracker (saved in your browser)
- Interactive finger-placement chart (D4–C5)
- Five-stage roadmap from foundations to professional playing
- Core technique cards

## Run locally
It is a plain static site (no build step):

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```

## Deployment
GitHub Pages deploys via `.github/workflows/pages.yml` on every push to `main`.
In the repository go to **Settings → Pages → Source: GitHub Actions** (one-time).

## Structure
```
index.html          page markup
assets/styles.css   styling (light/dark aware)
assets/app.js       routine, timer, fingering chart, content data
assets/favicon.svg
```
