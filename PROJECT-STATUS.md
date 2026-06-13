# Project Status

Last updated: 2026-06-13
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
- `/portfolio` dedicated media library page
- `/profiles`
- `/members`
- `/templates`

## Implemented

### Public experience

- Public profile directory rendered from API profile data
- Public profile hub pages at `/profile/:slug`
- Public resume pages rendered by React templates
- Public cover letter pages rendered by React templates
- PDF export via browser print flow
- Portfolio gallery/cards on public profile pages
- Public portfolio filtering and larger-image popout viewer

### Editing workflow

- Resume and cover-letter draft editor with section-based editing
- Portfolio manager integrated into the editor workflow for per-profile project management
- Dedicated media library for per-profile uploads and reusable files
- Save draft
- Reset draft to source
- Publish saved draft to the live public document in database mode
- Draft history tracking
- Public preview link from the editor

### Multi-profile CMS foundation

- Profile creation and profile updates
- Automatic creation of default resume and cover letter documents for new profiles
- Profile-level section visibility controls for documents, portfolio, certifications, and references
- Portfolio schema and repository foundation
- Portfolio project metadata support for project type and progress
- Portfolio tag presentation support
- Reusable media upload flow for images and PDFs
- Media replace/delete support with reference-safe cleanup
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

Portfolio seed scaffolding currently lives in:

- `server/data/seeds/jareth-portfolio.json`
- `server/data/seeds/angel-portfolio.json`

## In Progress / Not Fully Surfaced Yet

- Portfolio editing is database-only and not implemented for seed-mode content
- Portfolio, media, and profile-section workflows need broader QA with live database content and migrations `005_portfolio_project_meta.sql`, `006_media_assets.sql`, and `007_profile_section_visibility.sql`
- Database schema includes `public_links`, `password_resets`, and `audit_logs`, but those are not fully exposed through the current UI flow yet
- Document versioning exists in the schema and draft publish path, but there is not yet a fuller history-management UI
- Certifications/licenses and references can now be toggled as public sections, but their underlying content models are still placeholders

## Current Verification Notes

- Repo scan confirms the CMS code structure is present and wired together
- Recent branch work focused on profile management, draft publishing, and member access fixes
- Dependencies were installed successfully with `npm.cmd install`
- Production build now passes with `npm.cmd run build`
- Cover-letter draft editing now uses the same save/reset/publish workflow as the resume editor
- Portfolio is now managed from the editor, with public project cards, lead images, tags, project type, and progress support
- Media uploads are now managed from `/portfolio`, with upload, copy-path, replace, and delete controls
- Public profile sections can now be shown or hidden per profile, and portfolio images can open in a larger popout viewer

## Recent Milestone Commits

- `3ef257a` First Commit New System
- `b9f3895` Add profile management, draft publishing, and improved member access workflow
- `9af5113` Fix member profile assignment switches in access management UI
- `9b112d9` Fix member profile access switches in member management UI
- `a9c6b27` Render HeroUI profile access switches correctly on Members page
- `088a070` Fix non-working member access switches on Members page

## Recommended Next Steps

1. Apply migrations `005_portfolio_project_meta.sql`, `006_media_assets.sql`, and `007_profile_section_visibility.sql`, then verify the related workflows in database mode.
2. Populate real portfolio content and test public profile cards with live images, links, tags, filters, and progress values.
3. Decide whether certifications/licenses or references should become the next real content model behind the new public-section toggles.
4. Choose the next CMS surface to expose after profile/portfolio polish: version history, share-link management, or application tracking/private notes.
5. Decide whether seed-mode portfolio editing is worth supporting or whether portfolio remains database-only.
