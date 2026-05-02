# Contractor Pocket Guide

**A static site deployment pipeline for Contractor Pocket Guide.**

This repository contains the exported static site and a GitHub Actions workflow that deploys it to [Cloudflare Pages](https://pages.cloudflare.com).

---

## Architecture Overview

```
[CMS / export tool]
        │
        │  manual export / zip upload
        ▼
   raw/  ──────────────────────────────────────── committed to git (reference copy)
        │
        │  copy to dist/
        ▼
   dist/ ──────────────────────────────────────── committed to git + deployed
        │
        └── main branch  →  Cloudflare Pages (production)  →  [domain]
```

There is a single workflow:

- **`deploy.yml`** — builds and deploys to production. Always run manually from the `main` branch.

---

## Repository Structure

```
.
├── .github/
│   └── workflows/
│       └── deploy.yml                  # Build and deploy to production
│
├── scripts/
│   ├── extract-zip.py                  # Extracts zip archives preserving filename casing
│   ├── copy-raw.sh                     # Copies raw/ → dist/
│   └── cleanup-deployments.js          # Deletes old Cloudflare Pages deployments
│
├── raw/                                # Untouched export (committed, never modified)
├── dist/                               # Output (committed, deployed to Cloudflare)
├── uploads/                            # Optional: place export.zip here for zip archive option
│
├── 404.html                            # Optional: custom 404 page (copied into dist/)
├── sitemap.xml                         # Optional: manually maintained sitemap (copied into dist/)
├── robots.txt                          # Optional: manually maintained robots.txt (copied into dist/)
│
└── README.md
```

---

## Workflow — Build and Deploy to Production

Triggered manually via GitHub Actions `workflow_dispatch`. Must be run from the `main` branch.

### Export Source Options

| Option | Behaviour |
|---|---|
| `Use existing raw/` | Deploys whatever is already in `raw/` |
| `Use uploaded archive` | Extracts `uploads/export.zip` and populates `raw/` from it |

### Steps

1. Extract archive or confirm `raw/` exists
2. Copy `raw/` → `dist/`
3. Copy any `.html`, `.xml`, `.txt`, and font files from the repo root into `dist/`
4. Commit `raw/` and `dist/` to `main`
5. Deploy `dist/` to Cloudflare Pages
6. Delete old deployments beyond the most recent 3

---

## Deploying a New Export

**From an existing `raw/`:**
1. Go to **Actions → Build and Deploy to Production → Run workflow**
2. Leave the export source as `Use existing raw/` and run

**From a new zip archive:**
1. Rename your export to `export.zip` and commit it to `uploads/export.zip`
2. Push to `main`
3. Go to **Actions → Build and Deploy to Production → Run workflow**
4. Select `Use uploaded archive` and run

---

## Root-Managed Files

Any of the following file types committed to the repo root will be copied into `dist/` on every deploy, overriding whatever the export produced:

- `.html` files (e.g. `404.html`)
- `.xml` files (e.g. `sitemap.xml`)
- `.txt` files (e.g. `robots.txt`)
- Font files (`.woff`, `.woff2`, `.ttf`, `.otf`, `.eot`)

This is useful for maintaining a custom 404 page, sitemap, or robots.txt independently of the CMS export.

---

## GitHub Secrets

| Secret | Description |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with Pages write access |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |
| `CLOUDFLARE_PROJECT_NAME` | Cloudflare Pages project name |
