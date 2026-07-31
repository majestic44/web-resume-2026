# Feature Checklist

Last updated: 2026-06-13

## Completed

- [x] Private landing page at `/` with no household profile directory
- [x] Clean public landing page with reusable modal-based sign-in
- [x] Authenticated internal resume, cover-letter, and profile previews
- [x] Isolated public resumes at `/shared/resume/:token`
- [x] Resume draft editor with save, reset, history, and publish workflow
- [x] Cover-letter draft editor with save, reset, history, and publish workflow
- [x] Profile management page
- [x] Member access management page
- [x] Role-based authentication with sessions in database mode
- [x] Per-profile editor access control
- [x] Template registry with `modern` and `classic` templates
- [x] Profile image support with initials fallback in authenticated previews
- [x] Portfolio schema scaffold
- [x] Portfolio repository and API routes
- [x] Dedicated media library page at `/portfolio` in database mode
- [x] Portfolio management integrated into the editor workflow
- [x] Public portfolio project cards with lead images, links, project type, and progress
- [x] Portfolio tag support in editor/public card presentation
- [x] Media library and upload workflow for profile photos, portfolio images, PDFs, and attachments
- [x] Media file replace/delete handling with reference protection
- [x] Profile section visibility controls for documents, portfolio, certifications, and references
- [x] Public portfolio filtering and image popout viewer
- [x] Certifications and licenses data model
- [x] References data model
- [x] Draft version history UI with restore workflow
- [x] Private resume sharing with opaque 256-bit tokens, secure token hashes, rotation, revocation, and access tracking
- [x] Private profile sharing with separate opaque tokens and password-protected references

## In Progress / Partial

- [ ] Portfolio editor workflow QA
  Status: portfolio now lives in the editor, the media library now lives on the dedicated Media page, and public cards are rendering. It still needs end-to-end testing with real database content and the latest migrations.

- [ ] Portfolio seed-mode editing
  Status: public seed scaffolding exists, but portfolio editing is still database-only.

- [ ] Portfolio public content population
  Status: public profile pages are ready, but current seed portfolio files are empty and live database content needs broader filling-out.

- [ ] Draft version history compare polish
  Status: the editor now shows version-history cards, snapshot details, JSON preview, and restore actions. A richer side-by-side diff view can still be added later.

- [x] Resume share-link management
  Status: authorized editors can create, copy, rotate, and disable one isolated resume link per profile from the editor.

- [ ] Certifications and references workflow QA
  Status: both content models now exist in the editor and public profile flow, but they still need broader database-mode testing with real records and the latest migrations.

## Next Planned Work

- [ ] Database migration + regression verification
  Goal: confirm migrations through `011_profile_resume_share_links.sql` are applied cleanly and verify authenticated previews, share-link rotation/revocation, and PDF export with real content.

- [x] Share-link and visibility management
  Status: section visibility and isolated resume share links are available in the CMS.

## Planned Next Features

- [ ] Resume variants per profile
  Example: operations, logistics, skilled trades, IT support

- [ ] Cover-letter variants per profile
  Example: general, warehouse, manufacturing, admin

- [ ] Certifications and licenses
  Status: implemented in the editor and public profile. Next step is population and QA.

- [x] Public share-link management
  Status: implemented for resumes only; cover letters remain private unless separately shared in a future feature.

- [ ] Application tracking / private notes
  Goal: internal-only notes for jobs applied to, version used, and follow-up status

- [ ] Profile packet export
  Goal: export resume + cover letter + selected portfolio items together

- [ ] References section
  Status: implemented in the editor and public profile. Next step is population and QA.

## Suggested Testing Focus

- [ ] Confirm anonymous `/` does not expose profile information
- [ ] Confirm the landing-page sign-in modal handles invalid credentials, keyboard submission, Escape, and dashboard redirection
- [ ] Confirm anonymous `/resume/:slug`, `/profile/:slug`, and `/api/documents/:type/:slug` do not expose documents
- [ ] Confirm a valid `/shared/resume/:token` renders only its assigned resume and exports as PDF
- [ ] Confirm a valid `/shared/profile/:token` renders the intended profile without a cover letter
- [ ] Confirm protected references are absent from the initial profile response and require the configured password
- [ ] Confirm regenerated and disabled share links return 404 immediately
- [ ] Confirm profile images display when present and fall back to initials when missing
- [ ] Confirm resume editor still saves/publishes correctly
- [ ] Confirm cover-letter editor still saves/publishes correctly
- [ ] Confirm draft history entries show in `/editor` after saving
- [ ] Confirm a previous draft history version can be restored from `/editor`
- [ ] Confirm the editor document selector now includes `Portfolio`
- [ ] Confirm portfolio CRUD works from `/editor` in database mode
- [ ] Confirm media uploads work from `/portfolio` in database mode
- [ ] Confirm uploaded media can be copied, replaced, and deleted safely
- [ ] Confirm profile photo selection works with uploaded media
- [ ] Confirm profile section visibility saves correctly from `/profiles`
- [ ] Confirm documents can be hidden from authenticated profile previews
- [ ] Confirm portfolio can be hidden from authenticated profile previews
- [ ] Confirm certifications and references placeholders only appear when enabled
- [ ] Confirm certifications CRUD works from `/editor` in database mode
- [ ] Confirm references CRUD works from `/editor` in database mode
- [ ] Confirm certifications render on authenticated profile previews when enabled
- [ ] Confirm references render on authenticated profile previews when enabled
- [ ] Confirm tags save and render correctly on public portfolio cards
- [ ] Confirm portfolio image popout opens and closes correctly
- [ ] Confirm project type and progress save correctly after migration `005_portfolio_project_meta.sql`
- [ ] Confirm certifications save correctly after migration `008_profile_certifications.sql`
- [ ] Confirm references save correctly after migration `009_profile_references.sql`
- [ ] Confirm a portfolio item appears on authenticated profile previews with lead image, tags, links, and progress chips
- [ ] Confirm shared resume navigation cannot reach the CMS or another profile
