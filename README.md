# Xi WANG — Academic Website

Personal academic website for **Xi WANG**, Tenure-Track Assistant Professor at [Ecole Polytechnique](https://www.polytechnique.edu/), IP Paris.

**Live**: [triocrossing.github.io](https://triocrossing.github.io)

---

## Quick Start

### Prerequisites

- Ruby 3.2+ with Bundler
- ImageMagick (for responsive image generation)

### Local Development (macOS Apple Silicon)

```bash
export PATH="/opt/homebrew/opt/ruby@3.3/bin:$PATH"
SDK=$(xcrun --sdk macosx --show-sdk-path)
export SDKROOT=$SDK
export LIBRARY_PATH="$SDK/usr/lib:$SDK/usr/lib/swift"

bundle install
bundle exec jekyll serve --host 127.0.0.1 --port 4000
```

### Docker

```bash
docker-compose up   # http://localhost:8080
```

### Production Build

```bash
bundle exec jekyll build --lsi
```

> `--lsi` enables Latent Semantic Indexing for related posts. Omit for faster iterative builds.

---

## Project Structure

```
_pages/              # Core pages: about.md (homepage), publications.md, cv.md
_bibliography/       # papers.bib — all publications in BibTeX
_data/               # coauthors.yml, venues.yml, repositories.yml
_news/               # Announcements (inline Markdown)
_projects/           # Research project pages
_layouts/            # HTML templates (about, bib, post, page, etc.)
_includes/           # Reusable components (header, footer, social, news, figure)
_sass/_custom.scss   # Custom design system (OKLCH colors, motion, spacing)
_plugins/            # Ruby plugins (cache-bust, details, external-posts, etc.)
assets/              # img/, pdf/, css/, js/, fonts/
_config.yml          # Site-wide settings
.github/workflows/   # CI/CD: deploy.yml → gh-pages
```

---

## Content Management

### Add a Publication

1. Add BibTeX entry to `_bibliography/papers.bib`
2. Use custom fields:
   - `selected={true}` — feature on homepage
   - `preview` — image filename in `assets/img/publication_preview/`
   - `abbr` — venue abbreviation (must match key in `_data/venues.yml`)
   - `bibtex_show={true}`, `arxiv`, `abstract` — for buttons and expandable sections
3. Add co-author to `_data/coauthors.yml` if needed

### Add a News Item

Create `_news/announcement_<slug>.md`:

```yaml
---
layout: post
date: 2025-03-22 12:00:00+0100
inline: true
related_posts: false
---
Your announcement text (supports HTML).
```

### Add a Project

Create `_projects/N_project.md`:

```yaml
---
layout: page
title: Project Title
description: Short description
img: assets/img/thumbnail.jpg
importance: 1
category: work
related_publications: key1, key2
---
```

---

## Design System

All visual customizations live in `_sass/_custom.scss`:

- **Color**: OKLCH perceptually uniform palette, warm amber accent, light/dark tokens
- **Motion**: CSS custom properties (`--ease-out-quart`, `--ease-out-expo`, 100ms–700ms)
- **Spacing**: 4px base unit scale (`--sp-1` through `--sp-24`)

> Do **not** modify base al-folio SASS files — only edit `_custom.scss`.

---

## Deployment

Push to `master`/`main` triggers CI/CD via `.github/workflows/deploy.yml`:

Ruby 3.2.2 → bundle install → `jekyll build --lsi` → PurgeCSS → deploy to `gh-pages`

---

## License

Built on the [al-folio](https://github.com/alshedivat/al-folio) Jekyll theme (MIT License).
