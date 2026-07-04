# Deployment

Karkas is deployed to **GitHub Pages** via `.github/workflows/deploy-pages.yml`. (A dedicated
Netlify pipeline was introduced in issue #74 and removed again — the required Netlify account
secrets were never set up, and Pages covers the project's hosting needs.)

## Environments

| Environment | Angular configuration | Trigger | URL |
|-------------|----------------------|---------|-----|
| production | `production` (default) | push to `master` or manual `workflow_dispatch` | `https://<owner>.github.io/<repo>/` |
| development | `development` | `npm start` locally | http://localhost:4200 |

Environment-specific values live in `src/environments/`:

- `environment.ts` — production defaults (the file that ships unless replaced)
- `environment.staging.ts` — swapped in by the `staging` build configuration
- `environment.development.ts` — swapped in by the `development` build configuration

The swap is done via `fileReplacements` in `angular.json`. Import from
`src/environments/environment` in application code; never import a suffixed file directly.
The `staging` build configuration (`npm run build:staging`) currently has no hosted deploy
target; it remains available for local production-like builds and any future staging host.
`environment.apiBaseUrl` is reserved for the future backend (issue #75): in deployed builds it
points at same-origin `/api`.

## CI/CD

`.github/workflows/deploy-pages.yml`:

- **push to `master`** (or manual `workflow_dispatch`) → production build with
  `--base-href /<repo-name>/` → upload artifact → deploy to GitHub Pages
- `index.html` is copied to `404.html` so deep links fall back to the SPA
- a `build.txt` (name/version/dependencies/timestamp) is emitted alongside the bundle for
  deploy verification

No repository secrets are required — the workflow authenticates with the built-in
`GITHUB_TOKEN` (`pages: write` / `id-token: write` permissions).

## Notes

- The app keeps hash-based routing (`withHashLocation()`), which works from the repo subpath
  GitHub Pages serves (`/<repo-name>/`); the `404.html` copy additionally makes path-style
  URLs land back on the app.
- The Pages build **requires** the `--base-href` flag because the site is served from a repo
  subpath rather than a domain root.

## Future backend integration (issue #75)

- Deploy the API separately (Fly.io, Railway, etc.); GitHub Pages cannot proxy requests, so
  the frontend must call the API host directly.
- Set the API origin in `environment.apiBaseUrl` (per environment file) — CORS must be
  enabled on the API for the Pages origin.
