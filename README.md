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
- `/login` - sign in
- `/dashboard` - admin dashboard
- `/editor` - resume draft editor
- `/profiles` - owner/admin profile management
- `/members` - owner/admin access management
- `/templates` - template registry
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
- `/api/drafts/cover-letter/:slug`
- `/api/drafts/resume/:slug/publish`
- `/api/drafts/cover-letter/:slug/publish`
- `/api/admin/members`
- `/api/admin/profiles`

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

## Draft and Publish Workflow

The editor now supports a full draft workflow:

1. Open `/editor`
2. Choose a profile and switch between `Resume` or `Cover Letter`
3. Make changes and use **Save Draft** to store the latest working copy
4. Use **Publish Live** to push the saved draft to the live public document
5. Use **Reset** to throw away the active draft and return to the current live document

Behavior by data source:

- `DATA_SOURCE=seed`
  - resume and cover-letter drafts are stored in `server/data/drafts/`
  - draft history is stored locally
  - publishing is intentionally not supported
- `DATA_SOURCE=database`
  - resume and cover-letter drafts plus draft history are stored in MariaDB
  - publish copies the active draft into `documents.content_json`
  - publish clears the active draft but keeps draft history

## Authentication

Authentication is active when `DATA_SOURCE=database`.

- `POST /api/auth/login` creates an HttpOnly session cookie
- `GET /api/auth/me` returns the current signed-in user
- `POST /api/auth/logout` clears the session
- Draft save/reset/publish routes require a signed-in user with `owner`, `admin`, or `editor` access to that profile

## Profile Management

Owner/admin accounts can manage profiles from `/profiles`.

- Create a profile with:
  - display name
  - slug
  - headline
  - template
- Each new profile automatically creates:
  - a default resume document
  - a default cover letter document
- Profile updates also keep the linked resume/cover letter template metadata in sync

New profiles show up in:

- the public directory
- the editor profile selector
- the member access assignment screen

## Member Access

Owner/admin accounts can manage household members from `/members`.

- `owner` and `admin` automatically get access to all profiles
- `editor` can edit only the profiles assigned to them
- `viewer` has no edit access
- turning on profile access for a viewer automatically promotes them to `editor`

Profile assignment uses HeroUI `Switch` controls so access changes are easier to scan and update.

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

Use the **Export PDF** button or the browser print dialog on public resume/cover letter pages.
Choose:

- Destination: Save as PDF
- Paper size: Letter
- Margins: Default or printer default
- Background graphics: On

Both the `modern` and `classic` templates include dedicated print rules for:

- Letter-sized output
- hidden navigation and UI controls
- tighter print spacing
- better page-break control for sections, cards, and experience entries
- consistent template-specific typography in print

## Plesk Smoke Test

After deploying to Plesk:

1. Open `/login` and sign in with the seeded admin account
2. Open `/profiles` and create a new profile
3. Confirm the new profile appears in `/`, `/editor`, and `/members`
4. Open `/editor`, save a draft, and publish it
5. Open `/resume/{slug}` and verify the live page updated
6. Use **Export PDF** on the resume and cover letter pages to verify print output
