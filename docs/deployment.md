# Deployment

Karkas is deployed to **Netlify** as the primary hosting platform (issue #74). GitHub Pages
remains as a legacy mirror until the custom-domain cutover is complete, after which
`.github/workflows/deploy-pages.yml` can be removed.

## Environments

| Environment | Angular configuration | Trigger | URL |
|-------------|----------------------|---------|-----|
| production | `production` (default) | push to `master` | Netlify primary URL / custom domain |
| staging | `staging` | manual `workflow_dispatch` (or Netlify branch/preview deploys) | `staging--<site>.netlify.app` alias |
| development | `development` | `npm start` locally | http://localhost:4200 |

Environment-specific values live in `src/environments/`:

- `environment.ts` — production defaults (the file that ships unless replaced)
- `environment.staging.ts` — swapped in by the `staging` build configuration
- `environment.development.ts` — swapped in by the `development` build configuration

The swap is done via `fileReplacements` in `angular.json`. Import from
`src/environments/environment` in application code; never import a suffixed file directly.
`environment.apiBaseUrl` is reserved for the future backend (issue #75): in deployed builds it
points at same-origin `/api`, which `netlify.toml` will proxy to the API host once it exists.

## CI/CD

`.github/workflows/deploy-hosting.yml`:

- **push to `master`** → production build → `netlify-cli deploy --prod`
- **workflow_dispatch** → choose `production` or `staging`; staging deploys to the
  `staging` alias URL without touching production

Required repository secrets (GitHub → Settings → Secrets and variables → Actions):

| Secret | Where to get it |
|--------|-----------------|
| `NETLIFY_AUTH_TOKEN` | Netlify → User settings → Applications → Personal access tokens |
| `NETLIFY_SITE_ID` | Netlify → Site configuration → Site details → Site ID |

Any additional build-time settings can be added as GitHub Actions secrets/variables and read
in the workflow, or as Netlify environment variables (Site configuration → Environment
variables) for builds run by Netlify itself.

## One-time Netlify setup

1. Create a Netlify site (`netlify sites:create` or via the UI); note the Site ID.
2. Add the two secrets above to the GitHub repository.
3. Push to `master` (or run the workflow manually) — the site goes live at
   `https://<site-name>.netlify.app`.

`netlify.toml` in the repo root configures the build command, publish directory
(`dist/karkas/browser`), the SPA fallback redirect, and security headers, so Netlify can also
build directly from the connected repo if preferred over CI-driven deploys.

## Custom domain

1. Netlify → Domain management → Add a domain.
2. At the DNS provider, point the apex/`www` records at Netlify (CNAME to
   `<site-name>.netlify.app`, or use Netlify DNS).
3. Netlify provisions HTTPS via Let's Encrypt automatically.
4. After the domain resolves, decommission GitHub Pages (delete `deploy-pages.yml` and disable
   Pages in repo settings).

## Notes

- The app keeps hash-based routing (`withHashLocation()`), which works everywhere; the SPA
  fallback in `netlify.toml` additionally makes path-style URLs safe if routing is ever
  switched to path location.
- Netlify builds do **not** need a `--base-href` flag (the site is served from `/`), unlike
  the GitHub Pages build which serves from a repo subpath.

## Future backend integration (issue #75)

- Deploy the API separately (Netlify Functions, Fly.io, Railway, etc.).
- Uncomment and point the `/api/*` proxy redirect in `netlify.toml` at the API host.
- The frontend already reads the API origin from `environment.apiBaseUrl`, so no code change
  is needed to switch environments.
