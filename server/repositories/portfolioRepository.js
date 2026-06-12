import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDatabaseEnabled } from '../config/app.js';
import { getDatabasePool } from '../config/database.js';
import { portfolioCollections, profiles } from '../data/profiles.js';
import { readDocument } from './documentRepository.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const seedDir = path.resolve(__dirname, '..', 'data', 'seeds');

function normalizeSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 140);
}

function normalizeVisibility(value) {
  return ['private', 'shared', 'public'].includes(value) ? value : 'private';
}

function normalizeSkills(input) {
  if (Array.isArray(input)) {
    return [...new Set(input.map(item => String(item || '').trim()).filter(Boolean))];
  }

  if (typeof input === 'string') {
    return [...new Set(
      input
        .split(/\r?\n|,/)
        .map(item => item.trim())
        .filter(Boolean)
    )];
  }

  return [];
}

function normalizeAssets(input) {
  if (!Array.isArray(input)) return [];

  return input
    .map((asset, index) => ({
      assetType: ['image', 'pdf', 'link'].includes(asset?.assetType) ? asset.assetType : null,
      filePath: String(asset?.filePath || '').trim(),
      externalUrl: String(asset?.externalUrl || '').trim(),
      label: String(asset?.label || '').trim(),
      sortOrder: Number.isFinite(Number(asset?.sortOrder)) ? Number(asset.sortOrder) : index
    }))
    .filter(asset => asset.assetType && (asset.filePath || asset.externalUrl));
}

function sanitizeAsset(row) {
  return {
    id: row.id,
    assetType: row.asset_type,
    filePath: row.file_path || '',
    externalUrl: row.external_url || '',
    label: row.label || '',
    sortOrder: row.sort_order ?? 0
  };
}

function sanitizePortfolioItem(row, assets = []) {
  const skills = Array.isArray(row.skills_json)
    ? row.skills_json
    : typeof row.skills_json === 'string'
      ? JSON.parse(row.skills_json || '[]')
      : [];

  return {
    id: row.id,
    profileId: row.profile_id,
    title: row.title,
    slug: row.slug,
    summary: row.summary || '',
    description: row.description || '',
    category: row.category || '',
    skills: normalizeSkills(skills),
    visibility: row.visibility,
    featured: Boolean(row.featured),
    sortOrder: row.sort_order ?? 0,
    assets,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function readSeedPortfolioCollection(profileSlug) {
  const collection = portfolioCollections[profileSlug];
  if (!collection) return [];

  try {
    const raw = await fs.readFile(path.join(seedDir, collection.seedFile), 'utf8');
    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.items) ? parsed.items : [];

    return items.map((item, index) => ({
      id: item.id || `${profileSlug}-${normalizeSlug(item.slug || item.title || `portfolio-${index + 1}`)}`,
      profileId: profileSlug,
      title: item.title || 'Untitled Portfolio Item',
      slug: normalizeSlug(item.slug || item.title || `portfolio-${index + 1}`),
      summary: item.summary || '',
      description: item.description || '',
      category: item.category || '',
      skills: normalizeSkills(item.skills),
      visibility: normalizeVisibility(item.visibility || 'public'),
      featured: Boolean(item.featured),
      sortOrder: Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : index,
      assets: normalizeAssets(item.assets)
    }));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }

    throw error;
  }
}

async function findActiveProfileBySlug(connectionOrPool, profileSlug) {
  const [rows] = await connectionOrPool.query(
    `
      SELECT id, slug, display_name, headline
      FROM profiles
      WHERE slug = ?
        AND status = 'active'
      LIMIT 1
    `,
    [profileSlug]
  );

  return rows[0] || null;
}

async function loadDatabasePortfolioItems(connectionOrPool, profileId, { publicOnly = false } = {}) {
  const [itemRows] = await connectionOrPool.query(
    `
      SELECT *
      FROM portfolio_items
      WHERE profile_id = ?
        ${publicOnly ? "AND visibility = 'public'" : ''}
      ORDER BY featured DESC, sort_order ASC, updated_at DESC, id DESC
    `,
    [profileId]
  );

  if (!itemRows.length) return [];

  const [assetRows] = await connectionOrPool.query(
    `
      SELECT *
      FROM portfolio_assets
      WHERE portfolio_item_id IN (?)
      ORDER BY sort_order ASC, id ASC
    `,
    [itemRows.map(row => row.id)]
  );

  const assetsByItemId = assetRows.reduce((map, row) => {
    const entry = map.get(row.portfolio_item_id) || [];
    entry.push(sanitizeAsset(row));
    map.set(row.portfolio_item_id, entry);
    return map;
  }, new Map());

  return itemRows.map(row => sanitizePortfolioItem(row, assetsByItemId.get(row.id) || []));
}

function buildPublicProfilePayload(resumeDocument, portfolioItems) {
  if (!resumeDocument) return null;

  return {
    profile: {
      slug: resumeDocument.meta.slug,
      name: resumeDocument.meta.name,
      label: resumeDocument.meta.label,
      headline: resumeDocument.content?.title || resumeDocument.meta.label || 'Professional Profile',
      summary: resumeDocument.content?.summary || '',
      image: resumeDocument.content?.image || resumeDocument.content?.images?.profile || '',
      profileLink: profiles[resumeDocument.meta.slug]?.profileLink || `/profile/${resumeDocument.meta.slug}`,
      resumeLink: resumeDocument.meta.resumeLink || `/resume/${resumeDocument.meta.slug}`,
      coverLetterLink: resumeDocument.meta.coverLetterLink || `/cover-letter/${resumeDocument.meta.slug}`
    },
    portfolioItems
  };
}

function validatePortfolioCreateInput(input = {}) {
  const title = String(input.title || '').trim();
  if (!title) {
    throw new Error('Portfolio title is required.');
  }

  const slug = normalizeSlug(input.slug || title);
  if (!slug) {
    throw new Error('Portfolio slug is required.');
  }

  return {
    title,
    slug,
    summary: String(input.summary || '').trim(),
    description: String(input.description || '').trim(),
    category: String(input.category || '').trim(),
    skills: normalizeSkills(input.skills),
    visibility: normalizeVisibility(input.visibility || 'private'),
    featured: Boolean(input.featured),
    sortOrder: Number.isFinite(Number(input.sortOrder)) ? Number(input.sortOrder) : 0,
    assets: normalizeAssets(input.assets)
  };
}

function applyPortfolioPatch(existing, input = {}) {
  return {
    title: input.title !== undefined ? String(input.title || '').trim() : existing.title,
    slug: input.slug !== undefined ? normalizeSlug(input.slug) : existing.slug,
    summary: input.summary !== undefined ? String(input.summary || '').trim() : existing.summary,
    description: input.description !== undefined ? String(input.description || '').trim() : existing.description,
    category: input.category !== undefined ? String(input.category || '').trim() : existing.category,
    skills: input.skills !== undefined ? normalizeSkills(input.skills) : existing.skills,
    visibility: input.visibility !== undefined ? normalizeVisibility(input.visibility) : existing.visibility,
    featured: input.featured !== undefined ? Boolean(input.featured) : existing.featured,
    sortOrder: input.sortOrder !== undefined && Number.isFinite(Number(input.sortOrder))
      ? Number(input.sortOrder)
      : existing.sortOrder,
    assets: input.assets !== undefined ? normalizeAssets(input.assets) : existing.assets
  };
}

export async function listPublicPortfolio(profileSlug) {
  if (!isDatabaseEnabled()) {
    return (await readSeedPortfolioCollection(profileSlug)).filter(item => item.visibility === 'public');
  }

  const pool = getDatabasePool();
  const profile = await findActiveProfileBySlug(pool, profileSlug);
  if (!profile) return [];

  return loadDatabasePortfolioItems(pool, profile.id, { publicOnly: true });
}

export async function readPublicProfile(profileSlug) {
  const [resumeDocument, portfolioItems] = await Promise.all([
    readDocument('resume', profileSlug),
    listPublicPortfolio(profileSlug)
  ]);

  return buildPublicProfilePayload(resumeDocument, portfolioItems);
}

export async function listManagedPortfolio(profileSlug) {
  if (!isDatabaseEnabled()) {
    return readSeedPortfolioCollection(profileSlug);
  }

  const pool = getDatabasePool();
  const profile = await findActiveProfileBySlug(pool, profileSlug);
  if (!profile) return [];

  return loadDatabasePortfolioItems(pool, profile.id, { publicOnly: false });
}

export async function createPortfolioItem(profileSlug, input, actorUserId = null) {
  if (!isDatabaseEnabled()) {
    throw new Error('Portfolio item management requires DATA_SOURCE=database.');
  }

  const values = validatePortfolioCreateInput(input);
  const pool = getDatabasePool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const profile = await findActiveProfileBySlug(connection, profileSlug);
    if (!profile) {
      await connection.rollback();
      return null;
    }

    const [result] = await connection.query(
      `
        INSERT INTO portfolio_items (
          profile_id, title, slug, summary, description, category, skills_json,
          visibility, featured, sort_order, created_by, updated_by
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        profile.id,
        values.title,
        values.slug,
        values.summary,
        values.description,
        values.category,
        JSON.stringify(values.skills),
        values.visibility,
        values.featured ? 1 : 0,
        values.sortOrder,
        actorUserId,
        actorUserId
      ]
    );

    for (const asset of values.assets) {
      await connection.query(
        `
          INSERT INTO portfolio_assets (portfolio_item_id, asset_type, file_path, external_url, label, sort_order)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        [result.insertId, asset.assetType, asset.filePath || null, asset.externalUrl || null, asset.label || null, asset.sortOrder]
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return (await listManagedPortfolio(profileSlug)).find(item => item.slug === values.slug) || null;
}

export async function updatePortfolioItem(profileSlug, itemId, input, actorUserId = null) {
  if (!isDatabaseEnabled()) {
    throw new Error('Portfolio item management requires DATA_SOURCE=database.');
  }

  const nextItemId = Number(itemId);
  if (!Number.isInteger(nextItemId) || nextItemId <= 0) {
    throw new Error('A valid portfolio item id is required.');
  }

  const pool = getDatabasePool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const profile = await findActiveProfileBySlug(connection, profileSlug);
    if (!profile) {
      await connection.rollback();
      return null;
    }

    const [rows] = await connection.query(
      `
        SELECT *
        FROM portfolio_items
        WHERE id = ?
          AND profile_id = ?
        LIMIT 1
      `,
      [nextItemId, profile.id]
    );

    const existing = rows[0];
    if (!existing) {
      await connection.rollback();
      return null;
    }

    const currentAssets = await loadDatabasePortfolioItems(connection, profile.id, { publicOnly: false });
    const existingItem = currentAssets.find(item => item.id === nextItemId);
    const values = applyPortfolioPatch(existingItem || sanitizePortfolioItem(existing, []), input);

    if (!values.title) {
      throw new Error('Portfolio title is required.');
    }

    if (!values.slug) {
      throw new Error('Portfolio slug is required.');
    }

    await connection.query(
      `
        UPDATE portfolio_items
        SET title = ?, slug = ?, summary = ?, description = ?, category = ?, skills_json = ?,
            visibility = ?, featured = ?, sort_order = ?, updated_by = ?, updated_at = NOW()
        WHERE id = ?
      `,
      [
        values.title,
        values.slug,
        values.summary,
        values.description,
        values.category,
        JSON.stringify(values.skills),
        values.visibility,
        values.featured ? 1 : 0,
        values.sortOrder,
        actorUserId,
        nextItemId
      ]
    );

    await connection.query('DELETE FROM portfolio_assets WHERE portfolio_item_id = ?', [nextItemId]);

    for (const asset of values.assets) {
      await connection.query(
        `
          INSERT INTO portfolio_assets (portfolio_item_id, asset_type, file_path, external_url, label, sort_order)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        [nextItemId, asset.assetType, asset.filePath || null, asset.externalUrl || null, asset.label || null, asset.sortOrder]
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return (await listManagedPortfolio(profileSlug)).find(item => item.id === nextItemId) || null;
}

export async function deletePortfolioItem(profileSlug, itemId) {
  if (!isDatabaseEnabled()) {
    throw new Error('Portfolio item management requires DATA_SOURCE=database.');
  }

  const nextItemId = Number(itemId);
  if (!Number.isInteger(nextItemId) || nextItemId <= 0) {
    throw new Error('A valid portfolio item id is required.');
  }

  const pool = getDatabasePool();
  const profile = await findActiveProfileBySlug(pool, profileSlug);
  if (!profile) return false;

  const [result] = await pool.query(
    `
      DELETE FROM portfolio_items
      WHERE id = ?
        AND profile_id = ?
    `,
    [nextItemId, profile.id]
  );

  return result.affectedRows > 0;
}
