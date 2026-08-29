# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static, view-only public "track record" page: a sortable/filterable table of stock picks, sourced live from a Google Sheet, with no backend and no build step. It's linked from the owner's Substack as public proof of past calls. Deployed on GitHub Pages.

The entire app is 3 files at the repo root — `index.html`, `style.css`, `app.js` — plus `README.md` (user-facing setup/update instructions, kept in sync with this file).

## Commands

There is no build, lint, or test tooling — plain HTML/CSS/JS, zero dependencies, zero `package.json`.

Run locally:
```
python -m http.server 8000
```
Then open `http://localhost:8000`. (`fetch()` from `file://` is unreliable across browsers, so always serve it rather than opening `index.html` directly.)

Deploy: push to `main` on the public GitHub repo; GitHub Pages (Settings → Pages → Deploy from branch → `main` / root) serves it directly — no build step in the pipeline.

## Architecture

**Data flow:** `app.js` fetches the Google Sheet's first tab (`gid=0`) via Google's `gviz/tq` endpoint (`?tqx=out:json`), strips the `google.visualization.Query.setResponse(...)` JSONP-style wrapper by substring, and parses the JSON. No API key, no Google Cloud project — this only works because the sheet is shared "Anyone with the link → Viewer." The `SHEET_ID` constant at the top of `app.js` is the only per-deployment config.

**Schema-driven, not hardcoded** — this is the central design decision and must be preserved in any change: `app.js` reads whatever columns exist in row 1 of the sheet (`json.table.cols`, each with a `label` and a gviz `type` like `number`/`string`/`date`) and builds the table head, sort behavior, and filters from that at runtime. The sheet owner can add, remove, or rename columns with zero code changes. Do not reintroduce fixed column indices or hardcoded field names — column identification is done by matching on `label` text, not position.

Two header names get special rendering treatment, matched case-insensitively against whatever labels the sheet has:
- a label containing `"link"` → cell renders as a `View ↗` anchor instead of raw URL text (`renderBody` in `app.js`)
- a label exactly `"status"` → cell renders as a colored badge; its distinct values (collected once in `assignStatusColors`) auto-populate the status filter `<select>` (`buildStatusFilter`)

Numeric-typed columns and any column whose label matches `/date/i` get the monospace `cell-mono` styling automatically — this is also label/type-driven, not a fixed column list.

**State model:** `allRows` (built once on load, keyed by column label) is never mutated. `render()` derives the filtered + sorted view from `allRows` plus `sortState`/`filterState` on every interaction, and `renderBody`/`buildHead` rebuild the DOM via `createElement`/`textContent` — never `innerHTML` for sheet-sourced content, since it's untrusted free text from the spreadsheet.

**Failure mode:** any fetch/parse error (bad response, network failure, empty sheet) falls through to `showError()`, which hides the controls/table and shows a static message. There's no stale-data fallback by design — the sheet is the sole source of truth, so a failure means "try again," never "show wrong data."

## Brand identity (must be preserved in style/copy changes)

"Skin In The Game" — old-money financial-journalism aesthetic, defined in `style.css` CSS variables:
- Palette: Ink `#1a1a18` on Parchment `#e8e5de` (primary), Bronze `#9b7355` (accent/links/primary badge), Slate `#2c3e50` and Sand `#c9b99a` (secondary badges), Signal Red `#d4373a`.
- **Signal Red is reserved for loss/risk disclosures only — never used decoratively.** It's deliberately excluded from `BADGE_PALETTE` in `app.js` (status badges rotate Bronze/Slate/Sand/Ink instead) and is used only for the `.status-message` error state. Don't add it to the badge rotation or use it as a generic accent color.
- Typography: Playfair Display for the `<h1>` (loaded via Google Fonts in `index.html`, falls back to Georgia), Georgia for body/prose, Courier New for all tabular/data text (column headers, dates, numbers, status badges) — this split is implemented via the `--font-display`/`--font-body`/`--font-data` CSS variables and the `cell-mono` class.
- No dark-mode variant — the light Ink-on-Parchment look is the identity itself (the brand brief explicitly contrasts it with "white-on-black tech"), not a light/dark pair.

## Google Sheet contract

See `README.md` for the full user-facing setup guide. The load-bearing conventions `app.js` depends on:
- Data lives on the sheet's first (leftmost) tab — the fetch URL is hardcoded to `gid=0`.
- Date columns should be formatted as **plain text** `YYYY-MM-DD` in the sheet (sorts correctly as a string with no date-parsing). A real Date-typed cell is also handled (`parseGvizDate` converts gviz's `Date(y,m,d)` wrapper), but plain text is the documented recommendation.
- Numeric columns (e.g. price) should be formatted as plain Number in the sheet so gviz reports `type: 'number'` and they sort numerically instead of alphabetically.
