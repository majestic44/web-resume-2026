# Database

This app is designed for MariaDB on Plesk with a Node/Express backend.

1. Create the database and database user in Plesk.
2. Copy `.env.example` to `.env`.
3. Fill in the `DB_*` values from Plesk.
4. Run `npm run db:migrate`.
5. Run `npm run db:seed`.
6. Set `DATA_SOURCE=database` when you are ready for the app to read from MariaDB.

The first schema keeps resume and cover letter bodies in `documents.content_json` so the current seed JSON shape can be reused while the editor, version history, permissions, and public links are built around it.
