import { isDatabaseEnabled } from '../config/app.js';
import { getDatabasePool } from '../config/database.js';
import { listProfiles as listSeedProfiles } from '../data/profiles.js';
import { readSeedDocument } from '../services/documentStore.js';

function documentTypeForDatabase(type) {
  return type === 'cover-letter' ? 'cover_letter' : type;
}

function documentTypeForApi(type) {
  return type === 'cover_letter' ? 'cover-letter' : type;
}

function profileLinks(slug) {
  return {
    resumeLink: `/resume/${slug}`,
    coverLetterLink: `/cover-letter/${slug}`
  };
}

export async function listProfiles() {
  if (!isDatabaseEnabled()) {
    return listSeedProfiles();
  }

  const pool = getDatabasePool();
  const [rows] = await pool.query(
    `
      SELECT p.slug, p.display_name, p.headline, d.template
      FROM profiles p
      LEFT JOIN documents d
        ON d.profile_id = p.id
        AND d.type = 'resume'
        AND d.slug = 'resume'
      WHERE p.status = 'active'
      ORDER BY p.display_name
    `
  );

  return rows.map(row => ({
    slug: row.slug,
    name: row.display_name,
    label: row.headline || 'Professional Profile',
    template: row.template || 'modern',
    ...profileLinks(row.slug)
  }));
}

export async function readDocument(type, profileSlug) {
  if (!isDatabaseEnabled()) {
    return readSeedDocument(type, profileSlug);
  }

  const databaseType = documentTypeForDatabase(type);
  const documentSlug = databaseType === 'cover_letter' ? 'general' : 'resume';
  const pool = getDatabasePool();
  const [rows] = await pool.query(
    `
      SELECT
        p.slug AS profile_slug,
        p.display_name,
        p.headline,
        d.type,
        d.slug AS document_slug,
        d.title,
        d.template,
        d.content_json,
        d.updated_at
      FROM documents d
      INNER JOIN profiles p ON p.id = d.profile_id
      WHERE p.slug = :profileSlug
        AND p.status = 'active'
        AND d.type = :type
        AND d.slug = :documentSlug
      LIMIT 1
    `,
    { profileSlug, type: databaseType, documentSlug }
  );

  const row = rows[0];

  if (!row) {
    return null;
  }

  const apiType = documentTypeForApi(row.type);

  return {
    meta: {
      slug: row.profile_slug,
      name: row.display_name,
      label: row.headline || row.title,
      template: row.template,
      updatedAt: row.updated_at,
      ...(apiType === 'resume'
        ? profileLinks(row.profile_slug)
        : { backLink: `/resume/${row.profile_slug}` })
    },
    content: typeof row.content_json === 'string' ? JSON.parse(row.content_json) : row.content_json
  };
}
