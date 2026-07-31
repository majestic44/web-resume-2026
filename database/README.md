# Database

This app is designed for MariaDB on Plesk with a Node/Express backend.

1. Create the database and database user in Plesk.
2. Copy `.env.example` to `.env`.
3. Fill in the `DB_*` values from Plesk.
4. Run `npm run db:migrate`.
5. Run `npm run db:seed`.
6. Set `DATA_SOURCE=database` when you are ready for the app to read from MariaDB.

The first schema keeps resume and cover letter bodies in `documents.content_json` so the current seed JSON shape can be reused while the editor, version history, permissions, and public links are built around it.

For the current portfolio/media/profile feature set, make sure these later migrations are also applied in order:

- `005_portfolio_project_meta.sql`
- `006_media_assets.sql`
- `007_profile_section_visibility.sql`
- `008_profile_certifications.sql`
- `009_profile_references.sql`
- `010_document_draft_authors.sql`
- `011_profile_resume_share_links.sql`
