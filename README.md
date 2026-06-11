# Household Resume CMS

This branch starts a clean Node/Express + Vite/React app for a private household resume editor backed by MariaDB.

The old static pages have been removed from the active app path. The current resume content is kept as seed JSON in `server/data/seeds/`, and the public resume/directory pages are now rendered by React.

## Structure

- `server/` - Express API, MariaDB connection, seed document loading
- `client/` - Vite/React app for public pages and admin/editor shell
- `public/` - static assets such as profile images
- `server/data/seeds/` - current resume and cover letter JSON used before MariaDB import
- `database/migrations/` - MariaDB schema files
- `.env.example` - local/Plesk environment variables

## Local Quick Start

```bash
cp .env.example .env
npm install
npm run dev:server
```

In a second terminal:

```bash
npm run dev
```

Then open:

```text
http://localhost:5173
```

Useful routes:

- `/` - profile directory
- `/login` - login placeholder
- `/dashboard` - dashboard shell
- `/editor` - editor shell
- `/templates` - template registry shell
- `/resume/jareth`
- `/resume/angel`
- `/cover-letter/jareth`
- `/cover-letter/angel`

API routes run through Express on port `3000` during local development:

- `/api/health`
- `/api/profiles`
- `/api/documents/resume/jareth`
- `/api/documents/cover-letter/jareth`
- `/api/drafts/resume/:slug`

By default, local development uses seed JSON:

```text
DATA_SOURCE=seed
```

After MariaDB is migrated and seeded, switch to:

```text
DATA_SOURCE=database
```

## Database Scripts

Preview migration and seed work without connecting to MariaDB:

```bash
npm run db:migrate:dry
npm run db:seed:dry
```

Run against MariaDB after `.env` is configured:

```bash
npm run db:migrate
npm run db:seed
```

If you want the database seed to create an initial login account, set these in `.env` first:

```text
ADMIN_NAME="Household Admin"
ADMIN_EMAIL=you@example.com
ADMIN_PASSWORD=choose-a-strong-password
```

## Frontend UI

The dashboard/editor surface uses HeroUI components with lucide icons. Public resume and cover letter pages keep custom CSS so print/PDF layout stays tightly controlled.

Tailwind CSS v4 is wired in through the Vite plugin and a CSS-first setup in `client/src/styles/app.css`. You will not see a `tailwind.config.js` unless we later add custom Tailwind configuration that actually needs one.

## Draft Saving

Resume drafts can now be saved locally before authentication is added.

- Draft files are stored under `server/data/drafts/`
- Each save writes the latest draft plus a lightweight version history
- Reset in the editor deletes the saved draft and falls back to the source resume JSON

When `DATA_SOURCE=database`, the same draft API stores drafts and draft history in MariaDB instead of the local draft files.

## Authentication

Authentication is active when `DATA_SOURCE=database`.

- `POST /api/auth/login` creates an HttpOnly session cookie
- `GET /api/auth/me` returns the current signed-in user
- `POST /api/auth/logout` clears the session
- Draft save/reset routes require a signed-in user with `owner`, `admin`, or `editor` role

## Plesk Deployment

Recommended setup:

1. Pull this repository into Plesk from GitHub.
2. Configure the Plesk Node.js app to use `server/index.js` as the startup file.
3. Set the app root to the repository directory.
4. Copy `.env.example` to `.env` on the server.
5. Fill in the MariaDB credentials from Plesk.
6. Run `npm install`.
7. Run `npm run db:migrate`.
8. Run `npm run db:seed`.
9. Set `DATA_SOURCE=database`.
10. Run `npm run build` so Express can serve the React app from `dist/client`.

## PDF Export

Use the **Export PDF** button or the browser print dialog.
Choose:

- Destination: Save as PDF
- Paper size: Letter
- Margins: Default
- Background graphics: On

## Next Milestone

The next build step is authentication and permissions:

- add login and role checks
- gate save/reset/history actions by permissions
- then add public/private document management
