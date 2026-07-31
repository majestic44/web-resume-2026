# Household Resume CMS

This branch starts a clean Node/Express + Vite/React app for a private household resume editor backed by MariaDB.

The old static pages have been removed from the active app path. The current resume content is kept as seed JSON in `server/data/seeds/`, and React renders authenticated CMS previews plus isolated token-based shared resumes.

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

- `/` - private landing page with modal-based sign-in
- `/shared/resume/:token` - isolated shared resume
- `/login` - compatibility redirect to the landing-page sign-in modal
- `/dashboard` - admin dashboard
- `/editor` - resume draft editor
- `/portfolio` - dedicated media library
- `/profiles` - owner/admin profile management
- `/members` - owner/admin access management
- `/templates` - template registry
- `/profile/:slug` - authenticated profile preview
- `/resume/:slug` - authenticated resume preview
- `/cover-letter/:slug` - authenticated cover-letter preview

API routes run through Express on port `3000` during local development:

- `/api/health`
- `/api/internal/profiles`
- `/api/internal/profiles/:slug`
- `/api/internal/documents/:type/:slug`
- `/api/shared/resume/:token`
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
4. Use **Publish Live** to push the saved draft to the live resume or cover letter
5. Review **Version History** in the editor sidebar to inspect older saved snapshots and restore one as the current draft
6. Use **Reset** to throw away the active draft and return to the current live document

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

The `/` route is a privacy-safe application landing page. It never requests or displays household member, profile, slug, or document data. Signed-out visitors can sign in through the HeroUI modal; signed-in visitors see an **Open Dashboard** action and a small account status indicator. The legacy `/login` route redirects to `/?signin=1` so it opens the same modal rather than maintaining a separate sign-in form.

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
  - public section visibility toggles for:
    - documents
    - portfolio
    - certifications and licenses
    - references
- Each new profile automatically creates:
  - a default resume document
  - a default cover letter document
- Profile updates also keep the linked resume/cover letter template metadata in sync
- Profile updates can also control which sections appear on the public profile hub

New profiles show up in the editor profile selector and the member access assignment screen. They are not discoverable anonymously.

## Authenticated Profile Preview + Portfolio

The first portfolio foundation is now in place.

- Signed-in users can preview profiles at `/profile/:slug` when their role grants access.
- Each profile can show:
  - profile photo
  - headline
  - summary
  - resume and cover letter document cards
  - public portfolio items
  - optional certifications/licenses cards
  - optional references cards
- Portfolio cards in profile previews now support:
  - tag filtering
  - project-type filtering
  - progress filtering
  - richer project link presentation
  - larger image popout/lightbox behavior
- Portfolio seed files currently exist for:
  - `server/data/seeds/jareth-portfolio.json`
  - `server/data/seeds/angel-portfolio.json`
- A dedicated media library page now exists at `/portfolio`
- Admin CRUD API routes are available for database mode:
  - `GET /api/admin/profiles/:slug/portfolio`
  - `POST /api/admin/profiles/:slug/portfolio`
  - `PATCH /api/admin/profiles/:slug/portfolio/:itemId`
  - `DELETE /api/admin/profiles/:slug/portfolio/:itemId`
  - `GET /api/admin/profiles/:slug/certifications`
  - `POST /api/admin/profiles/:slug/certifications`
  - `PATCH /api/admin/profiles/:slug/certifications/:certificationId`
  - `DELETE /api/admin/profiles/:slug/certifications/:certificationId`
  - `GET /api/admin/profiles/:slug/references`
  - `POST /api/admin/profiles/:slug/references`
  - `PATCH /api/admin/profiles/:slug/references/:referenceId`
  - `DELETE /api/admin/profiles/:slug/references/:referenceId`

Portfolio editing from `/editor` requires `DATA_SOURCE=database` plus an `owner`, `admin`, or `editor` account with access to the selected profile.
Media uploads from `/portfolio` require `DATA_SOURCE=database` plus an `owner`, `admin`, or `editor` account with access to the selected profile.
Certification and reference editing from `/editor` require `DATA_SOURCE=database` plus an `owner`, `admin`, or `editor` account with access to the selected profile.

## Private Resume Sharing

Resume sharing is available only in `DATA_SOURCE=database` mode. Authorized profile managers can use **Share Resume** in `/editor` to create, copy, regenerate, or disable a link.

- Shared URLs use `/shared/resume/:token`, where the token is an opaque 256-bit random value.
- Only a SHA-256 hash of the token is stored in MariaDB; the complete URL is returned once when generated.
- Regenerating or disabling a link immediately makes prior URLs return `404`.
- Shared pages contain only that resume and PDF export. They do not link to the household directory or CMS.
- Cover letters, portfolios, certifications, references, and other household profiles are not shared by this feature.

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

Recent migrations to make sure are applied before testing newer profile/portfolio features:

- `005_portfolio_project_meta.sql`
- `006_media_assets.sql`
- `007_profile_section_visibility.sql`
- `008_profile_certifications.sql`
- `009_profile_references.sql`
- `010_document_draft_authors.sql`
- `011_profile_resume_share_links.sql`

## PDF Export

Use the **Export PDF** button or the browser print dialog on an authenticated document preview or a shared resume page.
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
3. Confirm the new profile appears in `/editor` and `/members`, but not on the anonymous landing page
4. Open `/editor`, save a draft, and publish it
5. Create a resume share link from `/editor`, then open `/shared/resume/{token}` in a signed-out browser and verify the live page updated
6. Regenerate and disable the link, confirming the old URLs return `404`
7. Use **Export PDF** on the shared resume page to verify print output
