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

- `/` private landing page with sign-in access only
- `/shared/resume/:token` isolated shared resume access
- `/shared/profile/:token` isolated shared profile access

Admin/app routes:

- `/login`
- `/dashboard`
- `/editor`
- `/portfolio` dedicated media library page
- `/profiles`
- `/members`
- `/templates`

## Implemented

### Private sharing experience

- No anonymous household profile directory or slug-based document access
- Token-only shared resume pages rendered by React templates
- Token-only shared profile pages with resume, portfolio, certifications, and password-protected references
- Generic landing page that does not expose household member information
- HeroUI modal-based sign-in from the landing page, with `/login` redirect compatibility
- PDF export via browser print flow
- Portfolio gallery/cards on public profile pages
- Public portfolio filtering and larger-image popout viewer
- Public certifications/licenses cards on profile pages
- Public references cards on profile pages

### Editing workflow

- Resume and cover-letter draft editor with section-based editing
- Draft history sidebar with saved snapshot details and restore actions
- Portfolio manager integrated into the editor workflow for per-profile project management
- Certifications manager integrated into the editor workflow for per-profile credential management
- References manager integrated into the editor workflow for per-profile reference management
- Dedicated media library for per-profile uploads and reusable files
- Save draft
- Reset draft to source
- Publish saved draft to the live public document in database mode
- Draft history tracking
- Authenticated internal preview routes from the editor
- Per-profile resume share-link controls with create, copy, regenerate, and disable actions
- Per-profile profile-share controls with a separate reference password

### Multi-profile CMS foundation

- Profile creation and profile updates
- Automatic creation of default resume and cover letter documents for new profiles
- Profile-level section visibility controls for documents, portfolio, certifications, and references
- Portfolio schema and repository foundation
- Certifications schema and repository foundation
- References schema and repository foundation
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
- 256-bit opaque resume share tokens stored only as secure hashes
- immediate share-link rotation and revocation
- separately hashed profile-share tokens and bcrypt-protected reference passwords

### Data layer

- MariaDB migrations for users, profiles, profile roles, documents, versions, public links, password resets, audit logs, drafts, and sessions
- Follow-up migrations for portfolio metadata, media assets, profile section visibility, certifications, references, draft authors, resume share links, and profile share links
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
- Portfolio, media, certifications, references, profile-section, resume-share, and profile-share workflows need broader QA with live database content and migrations through `012_profile_share_links.sql`
- Database schema includes `public_links`, `password_resets`, and `audit_logs`, but those are not fully exposed through the current UI flow yet
- Draft history restore now exists in the editor, but there is not yet a richer side-by-side diff or publish-version timeline UI

## Current Verification Notes

- Repo scan confirms the CMS code structure is present and wired together
- Recent branch work focused on profile management, draft publishing, and member access fixes
- Dependencies were installed successfully with `npm.cmd install`
- Production build now passes with `npm.cmd run build`
- Cover-letter draft editing now uses the same save/reset/publish workflow as the resume editor
- Portfolio is now managed from the editor, with public project cards, lead images, tags, project type, and progress support
- Media uploads are now managed from `/portfolio`, with upload, copy-path, replace, and delete controls
- Authenticated profile-preview sections can now be shown or hidden per profile, and portfolio images can open in a larger popout viewer
- Certifications and references now have dedicated editor workspaces plus public profile card rendering
- Resume and cover-letter editor now expose saved draft history entries with snapshot restore support
- Resumes can now be shared privately through opaque, hashed, revocable per-profile links
- Complete profile views can be shared privately without exposing cover letters; references require a separate password

## Recent Milestone Commits

- `3ef257a` First Commit New System
- `b9f3895` Add profile management, draft publishing, and improved member access workflow
- `9af5113` Fix member profile assignment switches in access management UI
- `9b112d9` Fix member profile access switches in member management UI
- `a9c6b27` Render HeroUI profile access switches correctly on Members page
- `088a070` Fix non-working member access switches on Members page

## Recommended Next Steps

1. Apply migrations through `012_profile_share_links.sql`, then verify the related workflows in database mode.
2. Test that invalid, revoked, and rotated share tokens return 404 while valid profile links hide cover letters and protect references with the configured password.
3. Populate real portfolio, certification, and reference content and test authenticated preview cards with live images, links, tags, and contact details.
4. Choose the next CMS surface to expose: application tracking/private notes, profile packet export, or separately scoped cover-letter sharing.
5. Decide whether seed-mode portfolio editing is worth supporting or whether portfolio remains database-only.
