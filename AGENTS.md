# AGENTS.md

## Cursor Cloud specific instructions

### Project Overview

Static single-page web application (Travel Expense Dashboard / "Dashboard de Despesas de Viagem"). No backend, no database, no build step. Vanilla HTML + CSS + JavaScript with Chart.js loaded from CDN.

### Running the Dev Server

```bash
npm start
```

This starts `http-server` on port 8080 with cache disabled (`-c-1`). Open `http://localhost:8080`.

### Key Notes

- There is no linter, test framework, or build step configured in this project. The only npm script is `start`.
- The app loads data from `dados.csv` via `fetch()`, so it must be served via HTTP (not `file://`).
- External JS libraries (Chart.js, chartjs-plugin-datalabels, SheetJS) are loaded from CDN at runtime — internet access is required for charts and XLSX export to work.
- The `package.json` had trailing garbage characters that were cleaned up; if `npm install` fails with a JSON parse error, check for corruption in that file.
