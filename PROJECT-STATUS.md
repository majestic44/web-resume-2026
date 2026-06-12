# Project Status

Last updated: 2026-06-11
Branch: `feature/multi-user-resume-app`

## Summary

This repository is no longer the older static HTML resume site.
It has been rebuilt into a Household Resume CMS using:

- Node.js + Express for the API/server
- Vite + React for the app shell and public pages
- MariaDB for the secure multi-user data path
- seed JSON files for local-first development before database cutover

The old static pages are not the active app path anymore.

## Current Live Structure In Repo

Public routes:

- `/` public household profile directory
- `/resume/jareth`
- `/resume/angel`
- `/cover-letter/jareth`
- `/cover-letter/angel`

Admin/app routes:

- `/login`
- `/dashboard`
- `/editor`
- `/profiles`
- `/members`
- `/templates`

## Implemented

### Public experience

- Public profile directory rendered from API profile data
- Public resume pages rendered by React templates
- Public cover letter pages rendered by React templates
- PDF export via browser print flow

### Editing workflow

- Resume and cover-letter draft editor with section-based editing
- Save draft
- Reset draft to source
- Publish saved draft to the live public document in database mode
- Draft history tracking
- Public preview link from the editor

### Multi-profile CMS foundation

- Profile creation and profile updates
- Automatic creation of default resume and cover letter documents for new profiles
- Template selection per profile
- Seed-mode profile/document loading
- Database-mode profile/document loading

### Authentication and access control

- Login/logout endpoints
- HttpOnly session cookies
- role-based access:
  - `owner`
  - `admin`
  - `editor`
  - `viewer`
- profile-specific edit access for editors
- owner/admin management of member assignments

### Data layer

- MariaDB migrations for users, profiles, profile roles, documents, versions, public links, password resets, audit logs, drafts, and sessions
- seed JSON document storage
- file-based draft storage in seed mode
- database draft storage in database mode

## Current Seed Profiles

- Jareth Thomas
  - resume template: `modern`
- Angel Cunningham
  - resume template: `classic`

Seed documents currently live in:

- `server/data/seeds/jareth-resume.json`
- `server/data/seeds/jareth-cover-letter.json`
- `server/data/seeds/angel-resume.json`
- `server/data/seeds/angel-cover-letter.json`

## In Progress / Not Fully Surfaced Yet

- Database schema includes `public_links`, `password_resets`, and `audit_logs`, but those are not fully exposed through the current UI flow yet
- Document versioning exists in the schema and draft publish path, but there is not yet a fuller history-management UI

## Current Verification Notes

- Repo scan confirms the CMS code structure is present and wired together
- Recent branch work focused on profile management, draft publishing, and member access fixes
- Dependencies were installed successfully with `npm.cmd install`
- Production build now passes with `npm.cmd run build`
- Cover-letter draft editing now uses the same save/reset/publish workflow as the resume editor

## Recent Milestone Commits

- `3ef257a` First Commit New System
- `b9f3895` Add profile management, draft publishing, and improved member access workflow
- `9af5113` Fix member profile assignment switches in access management UI
- `9b112d9` Fix member profile access switches in member management UI
- `a9c6b27` Render HeroUI profile access switches correctly on Members page
- `088a070` Fix non-working member access switches on Members page

## Recommended Next Steps

1. Install dependencies and run a clean local build.
2. Verify end-to-end flows in both seed mode and database mode.
3. Decide whether to expose public-link sharing, audit logs, and version history in the UI now or keep them staged for a later phase.
