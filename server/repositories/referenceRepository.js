import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDatabaseEnabled } from '../config/app.js';
import { getDatabasePool } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const seedDir = path.resolve(__dirname, '..', 'data', 'seeds');

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase().slice(0, 200);
}

function sanitizeReference(row) {
  return {
    id: row.id,
    profileId: row.profile_id,
    name: row.name,
    title: row.title || '',
    company: row.company || '',
    relationshipLabel: row.relationship_label || '',
    email: row.email || '',
    phone: row.phone || '',
    referenceText: row.reference_text || '',
    contactNote: row.contact_note || '',
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function validateCreateInput(input = {}) {
  const name = String(input.name || '').trim();
  if (!name) {
    throw new Error('Reference name is required.');
  }

  return {
    name,
    title: String(input.title || '').trim().slice(0, 160),
    company: String(input.company || '').trim().slice(0, 160),
    relationshipLabel: String(input.relationshipLabel || '').trim().slice(0, 160),
    email: normalizeEmail(input.email),
    phone: String(input.phone || '').trim().slice(0, 80),
    referenceText: String(input.referenceText || '').trim(),
    contactNote: String(input.contactNote || '').trim(),
    sortOrder: Number.isFinite(Number(input.sortOrder)) ? Number(input.sortOrder) : 0
  };
}

function applyPatch(existing, input = {}) {
  return {
    name: input.name !== undefined ? String(input.name || '').trim() : existing.name,
    title: input.title !== undefined ? String(input.title || '').trim().slice(0, 160) : existing.title,
    company: input.company !== undefined ? String(input.company || '').trim().slice(0, 160) : existing.company,
    relationshipLabel: input.relationshipLabel !== undefined
      ? String(input.relationshipLabel || '').trim().slice(0, 160)
      : existing.relationshipLabel,
    email: input.email !== undefined ? normalizeEmail(input.email) : existing.email,
    phone: input.phone !== undefined ? String(input.phone || '').trim().slice(0, 80) : existing.phone,
    referenceText: input.referenceText !== undefined ? String(input.referenceText || '').trim() : existing.referenceText,
    contactNote: input.contactNote !== undefined ? String(input.contactNote || '').trim() : existing.contactNote,
    sortOrder: input.sortOrder !== undefined && Number.isFinite(Number(input.sortOrder))
      ? Number(input.sortOrder)
      : existing.sortOrder
  };
}

async function findActiveProfileBySlug(connectionOrPool, profileSlug) {
  const [rows] = await connectionOrPool.query(
    `
      SELECT id
      FROM profiles
      WHERE slug = ?
        AND status = 'active'
      LIMIT 1
    `,
    [profileSlug]
  );

  return rows[0] || null;
}

async function readSeedReferences(profileSlug) {
  const seedFile = `${profileSlug}-references.json`;

  try {
    const raw = await fs.readFile(path.join(seedDir, seedFile), 'utf8');
    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.items) ? parsed.items : [];

    return items.map((item, index) => ({
      id: item.id || `${profileSlug}-reference-${index + 1}`,
      profileId: profileSlug,
      name: String(item.name || '').trim() || 'Reference Name',
      title: String(item.title || '').trim(),
      company: String(item.company || '').trim(),
      relationshipLabel: String(item.relationshipLabel || '').trim(),
      email: normalizeEmail(item.email),
      phone: String(item.phone || '').trim(),
      referenceText: String(item.referenceText || '').trim(),
      contactNote: String(item.contactNote || '').trim(),
      sortOrder: Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : index
    }));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }

    throw error;
  }
}

async function loadDatabaseReferences(connectionOrPool, profileId) {
  const [rows] = await connectionOrPool.query(
    `
      SELECT *
      FROM profile_references
      WHERE profile_id = ?
      ORDER BY sort_order ASC, id DESC
    `,
    [profileId]
  );

  return rows.map(sanitizeReference);
}

export async function listPublicReferences(profileSlug) {
  if (!isDatabaseEnabled()) {
    return readSeedReferences(profileSlug);
  }

  const pool = getDatabasePool();
  const profile = await findActiveProfileBySlug(pool, profileSlug);
  if (!profile) return [];

  return loadDatabaseReferences(pool, profile.id);
}

export async function listManagedReferences(profileSlug) {
  if (!isDatabaseEnabled()) {
    return readSeedReferences(profileSlug);
  }

  const pool = getDatabasePool();
  const profile = await findActiveProfileBySlug(pool, profileSlug);
  if (!profile) return [];

  return loadDatabaseReferences(pool, profile.id);
}

export async function createReference(profileSlug, input, actorUserId = null) {
  if (!isDatabaseEnabled()) {
    throw new Error('Reference management requires DATA_SOURCE=database.');
  }

  const values = validateCreateInput(input);
  const pool = getDatabasePool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const profile = await findActiveProfileBySlug(connection, profileSlug);
    if (!profile) {
      await connection.rollback();
      return null;
    }

    await connection.query(
      `
        INSERT INTO profile_references (
          profile_id, name, title, company, relationship_label, email, phone,
          reference_text, contact_note, sort_order, created_by, updated_by
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        profile.id,
        values.name,
        values.title || null,
        values.company || null,
        values.relationshipLabel || null,
        values.email || null,
        values.phone || null,
        values.referenceText || null,
        values.contactNote || null,
        values.sortOrder,
        actorUserId,
        actorUserId
      ]
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  const items = await listManagedReferences(profileSlug);
  return items.find(item => item.name === values.name && item.email === values.email) || items[0] || null;
}

export async function updateReference(profileSlug, referenceId, input, actorUserId = null) {
  if (!isDatabaseEnabled()) {
    throw new Error('Reference management requires DATA_SOURCE=database.');
  }

  const nextReferenceId = Number(referenceId);
  if (!Number.isInteger(nextReferenceId) || nextReferenceId <= 0) {
    throw new Error('A valid reference id is required.');
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
        FROM profile_references
        WHERE id = ?
          AND profile_id = ?
        LIMIT 1
      `,
      [nextReferenceId, profile.id]
    );

    const existing = rows[0];
    if (!existing) {
      await connection.rollback();
      return null;
    }

    const values = applyPatch(sanitizeReference(existing), input);
    if (!values.name) {
      throw new Error('Reference name is required.');
    }

    await connection.query(
      `
        UPDATE profile_references
        SET name = ?, title = ?, company = ?, relationship_label = ?, email = ?, phone = ?,
            reference_text = ?, contact_note = ?, sort_order = ?, updated_by = ?, updated_at = NOW()
        WHERE id = ?
      `,
      [
        values.name,
        values.title || null,
        values.company || null,
        values.relationshipLabel || null,
        values.email || null,
        values.phone || null,
        values.referenceText || null,
        values.contactNote || null,
        values.sortOrder,
        actorUserId,
        nextReferenceId
      ]
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return (await listManagedReferences(profileSlug)).find(item => item.id === nextReferenceId) || null;
}

export async function deleteReference(profileSlug, referenceId) {
  if (!isDatabaseEnabled()) {
    throw new Error('Reference management requires DATA_SOURCE=database.');
  }

  const nextReferenceId = Number(referenceId);
  if (!Number.isInteger(nextReferenceId) || nextReferenceId <= 0) {
    throw new Error('A valid reference id is required.');
  }

  const pool = getDatabasePool();
  const profile = await findActiveProfileBySlug(pool, profileSlug);
  if (!profile) return false;

  const [result] = await pool.query(
    `
      DELETE FROM profile_references
      WHERE id = ?
        AND profile_id = ?
    `,
    [nextReferenceId, profile.id]
  );

  return result.affectedRows > 0;
}
