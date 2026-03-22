# Xi WANG — Academic Website (Copilot Instructions)

## Project Overview

Personal academic website for **Xi WANG**, Tenure-Track Assistant Professor at Ecole Polytechnique, IP Paris. Built on the **al-folio** Jekyll theme with significant custom design work (OKLCH color system, motion tokens, refined typography).

**Live URL**: https://triocrossing.github.io

---

## Architecture

```
_config.yml          # Site-wide settings (name, social, scholar, plugins)
_pages/              # Core pages: about.md (homepage), publications.md, cv.md
_bibliography/       # papers.bib — all publications in BibTeX
_data/               # coauthors.yml, venues.yml, repositories.yml
_news/               # Announcements (inline Markdown)
_projects/           # Project portfolio pages
_layouts/            # HTML templates (about, bib, post, page, etc.)
_includes/           # Reusable components (header, footer, social, news, figure)
_sass/_custom.scss   # Custom design system (OKLCH colors, motion, spacing)
_plugins/            # Ruby plugins (cache-bust, details, external-posts, etc.)
assets/              # img/, pdf/, css/, js/, fonts/, video/, audio/
.github/workflows/   # CI/CD: deploy.yml builds & pushes to gh-pages
```

## Build & Serve

```bash
# Prerequisites: Ruby 3.2+, Bundler, ImageMagick
bundle install

# Build (production)
bundle exec jekyll build --lsi

# Serve locally (macOS — Apple Silicon needs SDK path)
export PATH="/opt/homebrew/opt/ruby@3.3/bin:$PATH"
SDK=$(xcrun --sdk macosx --show-sdk-path)
export SDKROOT=$SDK
export LIBRARY_PATH="$SDK/usr/lib:$SDK/usr/lib/swift"
bundle exec jekyll serve --host 127.0.0.1 --port 4000

# Docker alternative
docker-compose up   # http://localhost:8080
```

### Known Environment Issues
- **mini_racer** and **jekyll-jupyter-notebook** are disabled in Gemfile (V8 build fails on Apple Silicon; Jupyter CLI dependency)
- `--lsi` flag increases build time significantly; omit for iterative local dev
- PurgeCSS runs post-build in CI and may strip dynamic styles — test carefully

---

## Content Conventions

### Adding a Publication
1. Add BibTeX entry to `_bibliography/papers.bib`
2. Custom fields:
   - `selected={true}` — show on homepage "Selected Papers"
   - `preview` — image filename in `assets/img/publication_preview/` (or full URL)
   - `abbr` — venue abbreviation, must match a key in `_data/venues.yml` for color badge
   - `bibtex_show={true}` — show BibTeX export button
   - `arxiv` — arXiv ID for auto-link
   - `abstract` — expandable abstract text
3. Add co-author entries to `_data/coauthors.yml` (lastname → firstname variants + URL)

### Adding News
Create `_news/announcement_<slug>.md`:
```yaml
---
layout: post
date: 2025-03-22 12:00:00+0100
inline: true          # true = inline text; false = dedicated article page
related_posts: false
---
Your announcement text here (supports HTML).
```
Homepage shows max 6 items, scrollable.

### Adding a Project
Create `_projects/N_project.md`:
```yaml
---
layout: page
title: Project Title
description: Short description
img: assets/img/thumbnail.jpg
importance: 1          # Sort order
category: work
related_publications: key1, key2
---
```
Use `{% include figure.html %}` for image grids.

---

## Design System (`_sass/_custom.scss`)

- **Color**: OKLCH perceptually uniform palette with warm amber accent (≈55° hue). Light/dark theme tokens.
- **Motion**: CSS custom properties for easing (`--ease-out-quart`, `--ease-out-expo`) and durations (100ms–700ms).
- **Spacing**: 4px base unit scale (`--sp-1` through `--sp-24`).
- Keep all visual customizations in `_custom.scss` — do **not** modify base al-folio SASS files.

---

## Scholar Configuration

In `_config.yml` under `scholar:`:
- `last_name` / `first_name`: Used to bold/highlight the author in bibliography rendering
- `style: apa`, grouped by year descending
- Rendered via `_layouts/bib.html` (custom: expandable authors, venue badges, preview thumbnails)

> **Note**: `last_name` and `first_name` in `_config.yml` scholar section are set to `["WANG"]` / `["Xi", "X."]` for correct author highlighting.

---

## Deployment

- **CI/CD**: `.github/workflows/deploy.yml` — push to `master`/`main` triggers build + deploy to `gh-pages` branch
- Steps: Ruby 3.2.2 setup → bundle install → Jupyter & mermaid install → `jekyll build --lsi` → PurgeCSS → deploy
- Manual deploy via `bin/deploy` script

---

## Coding Conventions

- **Markdown**: kramdown (GFM), Rouge syntax highlighting
- **Templates**: Liquid templating; layouts inherit from `default.html`
- **External links**: auto-tagged `target="_blank" rel="external nofollow noopener"` via jekyll-link-attributes
- **Images**: Responsive WebP via jekyll-imagemagick (480/800/1400 widths)
- **Math**: MathJax (`$...$` inline, `$$...$$` block)
- **Emoji**: jemoji plugin

## Key Pitfalls

1. Adding a venue badge requires **both** `abbr` in the bib entry and a matching key in `_data/venues.yml`
2. Publication preview images without `://` are resolved relative to `assets/img/publication_preview/`
3. PurgeCSS may remove CSS classes only used in Liquid-generated markup — whitelist in `purgecss.config.js`
4. `_includes/scripts/` loads jQuery, Bootstrap, MathJax — order matters for dependent scripts
