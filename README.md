# NexaStrike

A multi-platform application for browsing and managing maps, suggestions, and clips.

## Overview

NexaStrike is made up of several components: a backend (API and database), a web frontend, and a desktop app built with Electron. This repository contains the source code, database setup scripts, and required assets.

## Project structure

- `backend/`: Node.js API and database setup scripts
- `desktop/`: Electron desktop application
- `frontend/`: web interface
- `public/`, `uploads/`: public assets and uploaded files

## Languages

The web and desktop apps share their interface translations in `shared/i18nTranslations.js` and locale handling in `shared/i18nRuntime.js`. English is the fallback language; French, Russian, Spanish, and Simplified Chinese are also available. The language selector saves the choice in browser/Electron local storage under `nexastrike-language`; when there is no saved choice, the app uses the first supported browser language.

When adding a language or changing a user-facing string, update every locale in the shared catalog, preserve interpolation placeholders, and verify that both the web and desktop builds succeed. Supabase Auth confirmation and recovery email templates are configured in the Supabase Dashboard, outside this repository.

## Requirements

- Node.js (>=14)
- npm or yarn
- PostgreSQL (if running the backend locally)

## Quick start

1. Install the dependencies (at the root or in the relevant directories):

```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

2. Initialize the database, if needed:

```bash
node backend/init-db.js
```

3. Start the backend:

```bash
cd backend
npm start
```

4. Start the frontend in development mode:

```bash
cd frontend
npm start
```

5. Start the desktop app, if configured:

```bash
cd desktop
npm start
```

## Configuration

Check `backend/config/database.js` for database connection settings. Use environment variables for sensitive credentials.

For the frontend, copy `frontend/.env.example` to `frontend/.env.local` and provide the required values. Do not commit `.env*` files containing local or production values. The Supabase publishable/anon key is intended for client-side use; never put a `service_role` key or another server secret in the frontend.

For the backend, copy `backend/.env.example` to `backend/.env` and replace the example values with your own settings. Do not publish `.env` files. The `node backend/set-user-admin.js <user-email>` script requires an explicit email address; also replace the example values in `backend/create_admin.sql` before running it.

To publish this project to a new repository without exposing old commit email addresses or pull request references, create a fresh Git repository and publish a snapshot of the code without importing the old history. Configure Git to use the GitHub-provided `noreply` email address before creating the first public commit.

## Supabase security

The migration `supabase/migrations/20261012075726_secure_admin_authorization.sql` protects the `users`, `maps`, `utility_points`, `suggestions`, `clips`, and `comments` tables. It replaces the existing RLS policies on these tables, restricts SQL privileges, removes client access to passwords and tokens stored in `users`, and reserves role changes, bans, and approvals for authorized administrators.

This migration assumes that the application tables from `backend/database.sql` already exist in the Supabase project. After linking the repository to the correct project, review the migration plan and apply the migrations with `supabase db push --linked`. Do not accidentally apply this migration to another project. The `backend/supabase-rls.sql` script is maintained for existing manual installations.

The React checks on `/admin`, `/admin/tickets`, `/utility-manager`, and the map editor only hide the interface; RLS policies and PostgreSQL privileges provide the actual protection for data and operations.

The pgTAP test `supabase/tests/admin_authorization_test.sql` checks attempts at self-promotion, changing ban status, and self-approval. Run it with `supabase test db` in a local Supabase environment that contains the application schema.

### Image storage with Cloudflare R2

The web app is built as a static Vite site in `frontend/`; the linked Vercel project is under `frontend/`. Its `/api/media` Node function validates the Supabase access token and current database role before issuing a 60-second PUT URL for the private `nexa-strike-images-staging` bucket. Map and utility images require an admin profile; clip images require a signed-in, non-banned user. A separate staging-only R2 key is used for these URLs. The server verifies the actual format, size, dimensions, and full decode, then writes the valid bytes to the public `nexa-strike-images` bucket with a server-derived opaque key. It reads the published object back and verifies its SHA-256, size, type, and decodability before returning its URL. The maximum image size is 50 MiB; JPEG, PNG, GIF, and WebP are accepted. Signed `If-None-Match: *` conditions prevent presigned uploads and publication writes from overwriting existing keys. Image deletion is refused while the URL is referenced in the database; a Supabase migration installs the atomic reference/deletion guard.

The upload path is browser-to-private-staging, followed by server-side validation and a server-to-public-bucket write; the browser never receives an R2 public-bucket write URL. The final object key is not disclosed before validation. Invalid uploads are removed from staging; a failed write can be retried with the same staging key, and a verified completion is idempotent. Staging objects expire after 24 hours, including abandoned uploads, and incomplete multipart uploads are aborted. Image reads use the existing public R2 custom domain; old Supabase Storage URLs and relative storage paths continue to resolve through the existing URL helper. Video uploads remain on their existing Supabase Storage path. Supabase Auth, PostgreSQL, RLS, tickets, favorites, and other application services are unchanged.

Configure these server-only variables in the Vercel project's **Production**, **Preview**, and **Development** environments:

- `CLOUDFLARE_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME` — public bucket (`nexa-strike-images`)
- `R2_STAGING_ACCESS_KEY_ID`
- `R2_STAGING_SECRET_ACCESS_KEY`
- `R2_STAGING_BUCKET_NAME` — private staging bucket (`nexa-strike-images-staging`)
- `R2_PUBLIC_KEY_SECRET` — random secret of at least 32 bytes; keep it stable across key rotations
- `R2_ENDPOINT` — `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`
- `R2_PUBLIC_URL` — `https://images.nexa-strike.com`, the Custom Domain on the public bucket only
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` — the Supabase publishable/anon key, not a service-role key
- `MEDIA_ALLOWED_ORIGINS` — comma-separated exact origins (no wildcards). By default, the API allows `https://nexa-strike.com`, the packaged Electron origin `http://127.0.0.1:43127`, and the confirmed Preview origin `https://nexa-strike-mbktdm3te-axel4.vercel.app`. When this variable is set, it replaces the defaults; include each required origin explicitly. Never allow `*` or a broad `*.vercel.app` pattern.

Create two distinct R2 S3 credentials, each scoped to one bucket only. Both need **Object Read & Write**: staging needs presigned PUT, server read/verification, and cleanup; public needs server write, read-back verification, and reference-safe deletion. Do not grant bucket administration or list permissions to these runtime credentials. Keep `R2_PUBLIC_KEY_SECRET` server-only and stable so retries map to the same opaque public key, even when R2 credentials rotate. The public bucket keeps its `images.nexa-strike.com` domain; the staging bucket must have neither a Custom Domain nor the managed `r2.dev` domain enabled. Do not put R2 credentials or Supabase service-role credentials in any `VITE_` variable. The web app uses its current origin for `/api/media`; the packaged Electron app runs at `http://127.0.0.1:43127` and defaults to `https://nexa-strike.com/api/media`. Set `VITE_MEDIA_API_URL` only when intentionally using a different API deployment. API authorization still requires a valid Supabase token.

Apply the `supabase/migrations/20261110124102_r2_image_security_hardening.sql` migration to each intended Supabase environment before deploying the hardened Vercel API. It creates a database-backed limit of 10 presigning requests per authenticated user per hour and reference-safe image deletion tombstones. The API fails closed if the migration has not been applied. The migration is not automatically applied to hosted Supabase. Run the existing SQL tests with `supabase test db` in a local project before applying it to a hosted environment.

The private staging bucket must allow only browser PUT from origins that actually call the media API. Its configured production origins are `https://nexa-strike.com` and `http://127.0.0.1:43127`; add any required Preview origin as a literal, exact origin. Allow only `PUT` and the headers used by the signed upload. The existing public bucket's CORS is unchanged for the currently deployed uploader; after the new API is deployed and confirmed, its browser PUT allowance can be removed. For production-only access, the staging policy shape is:

```json
[
  {
    "AllowedOrigins": ["https://nexa-strike.com", "http://127.0.0.1:43127"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["Content-Type", "Cache-Control", "If-None-Match"],
    "MaxAgeSeconds": 600
  }
]
```

Do not use wildcard origins in production. `Content-Length` is signed by the presigned request but is browser-controlled and should not be manually set or required in the CORS preflight allowlist. The staging lifecycle rule expires all objects after 86,400 seconds; do not attach public domains or change the expiration rule to a longer period without reviewing the cleanup impact.

#### Inventory and migrate existing images

The repository does not contain a live Storage inventory or bucket policies. Before copying, run the migration inventory against the intended Supabase project using a temporary local shell with a Supabase service-role key (never configure that key in Vercel):

```powershell
cd frontend
$env:SUPABASE_URL = "https://your-project.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "your-service-role-key"
npm run migrate:images
```

The default run is read-only and writes `r2-migration-report.json`, including bucket visibility, object counts/bytes, database references, content hashes/duplicates, and unsupported or private objects. It downloads supported images from public buckets to verify file signatures and identify identical content; it does not write to either storage or the database. Review that report and the Supabase Dashboard's bucket policies before proceeding. Objects in private buckets are intentionally skipped: the configured public R2 Custom Domain cannot preserve per-object private access. Leave those objects and their database URLs in Supabase; the existing URLs remain usable. Do not make a private bucket public to migrate it.

After confirming the destination bucket and the report, configure the six R2 variables in that same local shell and run:

```powershell
npm run migrate:images -- --apply
```

The apply mode copies supported images from public Supabase buckets to deterministic `legacy/<bucket>/<path>` keys, verifies each destination by reading it back and comparing its checksum, and only then updates matching database references. It never removes source objects. Re-running it safely retries failures and skips matching destination objects; conflicting destination contents are reported as failures. Keep the report for the migration record and inspect failures before retrying. Do not run `--apply` until the inventory and access model have been reviewed.

The database-backed upload limiter is global across Vercel instances and implements a per-user hour window. Existing public Supabase images and private-bucket objects remain untouched; private buckets continue to be skipped by migration.

### Ticket system

On the website, tickets and their replies are stored in Supabase. Administrators manage them at `/admin/tickets`; signed-in users can find their tickets at `/my-tickets`. A ticket submitted without an account can be linked to the user's account after they sign in or register with the same verified email address.

To enable the system in a Supabase project:

1. Link the correct project with `supabase link`, then review and apply the migration with `supabase db push --linked`.
2. Configure the `HCAPTCHA_SECRET` secret in **Supabase Dashboard → Edge Functions → Secrets** (or with `supabase secrets set HCAPTCHA_SECRET=<secret>`). Never put this secret in the frontend or in the repository.
3. Deploy the Edge Function with `supabase functions deploy create-ticket`.

Public ticket creation goes through this function, which verifies hCaptcha on the server. Supabase keys remain managed by the Edge environment; no `service_role` key is needed in the frontend.

## Useful scripts

- `scripts/set-version.js`: synchronizes the version across subprojects; the `--bump` option increments the release version
- The `dev` and `start` commands keep the current version; the `build` commands increment the version before compiling
- `backend/init-db.js`: database initialization script

## Contributing

Contributions are welcome! Open an issue to suggest an improvement or submit a pull request with a clear description of the changes.

## License

See `package.json` for license information.
