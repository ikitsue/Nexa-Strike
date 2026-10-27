# NexaStrike

A multi-platform application for browsing and managing maps, suggestions, and clips.

## Overview

NexaStrike is made up of several components: a backend (API and database), a web frontend, and a desktop app built with Electron. This repository contains the source code, database setup scripts, and required assets.

## Project structure

- `backend/`: Node.js API and database setup scripts
- `desktop/`: Electron desktop application
- `frontend/`: web interface
- `public/`, `uploads/`: public assets and uploaded files

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
