# Track Record

A static, view-only page that renders a public track record table straight from
a Google Sheet — no backend, no build step. Edit the sheet, refresh the page,
see the change. No redeploy needed for data changes.

## How it works

`app.js` fetches the Sheet's first tab via Google's `gviz` endpoint and reads
whatever columns exist in row 1. The table, its sort behavior, and the status
filter are all built dynamically from those columns — **you can add, remove,
or rename columns in the Sheet at any time with zero code changes.**

Two header names get special treatment (case-insensitive):

- Any header containing **"link"** (e.g. `Link`, `Substack Link`) — its cells
  render as a clickable `View ↗` instead of the raw URL.
- A header exactly **"Status"** — its cells render as colored badges, and its
  distinct values automatically populate the status filter dropdown.

Everything else is displayed as plain text, using whatever number/date
formatting you've applied to the cell in Google Sheets.

## Setting up the Google Sheet

1. Create a new Sheet. Row 1 = headers. One row per position. Suggested
   starting columns (add more anytime):

   | Name | Date | Link | Entry Price | Status |
   |------|------|------|-------------|--------|

2. **Date column:** format as **Plain text**, enter as `YYYY-MM-DD`
   (e.g. `2026-01-15`). This sorts correctly with no date-parsing needed.
   (If you use a real Date-formatted cell instead, the app also handles that.)
3. **Entry Price column:** format as a plain **Number** — this is what makes
   it sort numerically instead of alphabetically. Any currency formatting you
   apply in Sheets is shown as-is on the page.
4. **Status column:** any text values work. Data validation (dropdown) in
   Sheets is optional — just prevents typos on your end.
5. **Link column:** paste the full URL to the relevant Substack post.
6. Share → General access → **"Anyone with the link"** → **Viewer**.
7. Copy the **Spreadsheet ID** from the sheet's URL — the long string between
   `/d/` and `/edit`:
   `https://docs.google.com/spreadsheets/d/`**`THIS_PART`**`/edit`
8. Paste it into `app.js` as the `SHEET_ID` constant at the top of the file.

Keep all your data on the **first tab** (leftmost) — the app always reads
`gid=0`.

## Running locally

No install needed. From this folder:

```
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Deploying (GitHub Pages)

1. Push this folder to a public GitHub repo.
2. Repo → Settings → Pages → Source: "Deploy from a branch" → `main` / `/ (root)`.
3. Live at `https://<username>.github.io/<repo>/` within about a minute.

## Updating

- **New pick, status change, new/removed column:** edit the Google Sheet.
  Nothing to redeploy — visible on next page load.
- **Design or logic change:** edit `index.html` / `style.css` / `app.js`,
  commit, and push.
