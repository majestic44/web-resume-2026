import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDatabaseEnabled } from '../config/app.js';
import { getDatabasePool } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const seedDir = path.resolve(__dirname, '..', 'data', 'seeds');

function normalizeStatus(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  return ['active', 'in_progress', 'expired'].includes(normalized) ? normalized : 'active';
}

function normalizeDate(value) {
  const normalized = String(value || '').trim();
  if (!normalized) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : null;
}

function sanitizeCertification(row) {
  return {
    id: row.id,
    profileId: row.profile_id,
    title: row.title,
    issuer: row.issuer,
    status: row.status || 'active',
    issuedOn: row.issued_on || null,
    expiresOn: row.expires_on || null,
    credentialId: row.credential_id || '',
    credentialUrl: row.credential_url || '',
    notes: row.notes || '',
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function validateCreateInput(input = {}) {
  const title = String(input.title || '').trim();
  const issuer = String(input.issuer || '').trim();

  if (!title || !issuer) {
    throw new Error('Certification title and issuer are required.');
  }

  return {
    title,
    issuer,
    status: normalizeStatus(input.status),
    issuedOn: normalizeDate(input.issuedOn),
    expiresOn: normalizeDate(input.expiresOn),
    credentialId: String(input.credentialId || '').trim().slice(0, 160),
    credentialUrl: String(input.credentialUrl || '').trim().slice(0, 500),
    notes: String(input.notes || '').trim(),
    sortOrder: Number.isFinite(Number(input.sortOrder)) ? Number(input.sortOrder) : 0
  };
}

function applyPatch(existing, input = {}) {
  return {
    title: input.title !== undefined ? String(input.title || '').trim() : existing.title,
    issuer: input.issuer !== undefined ? String(input.issuer || '').trim() : existing.issuer,
    status: input.status !== undefined ? normalizeStatus(input.status) : existing.status,
    issuedOn: input.issuedOn !== undefined ? normalizeDate(input.issuedOn) : existing.issuedOn,
    expiresOn: input.expiresOn !== undefined ? normalizeDate(input.expiresOn) : existing.expiresOn,
    credentialId: input.credentialId !== undefined
      ? String(input.credentialId || '').trim().slice(0, 160)
      : existing.credentialId,
    credentialUrl: input.credentialUrl !== undefined
      ? String(input.credentialUrl || '').trim().slice(0, 500)
      : existing.credentialUrl,
    notes: input.notes !== undefined ? String(input.notes || '').trim() : existing.notes,
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

async function readSeedCertifications(profileSlug) {
  const seedFile = `${profileSlug}-certifications.json`;

  try {
    const raw = await fs.readFile(path.join(seedDir, seedFile), 'utf8');
    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.items) ? parsed.items : [];

    return items.map((item, index) => ({
      id: item.id || `${profileSlug}-certification-${index + 1}`,
      profileId: profileSlug,
      title: String(item.title || '').trim() || 'Untitled Certification',
      issuer: String(item.issuer || '').trim() || 'Unknown Issuer',
      status: normalizeStatus(item.status),
      issuedOn: normalizeDate(item.issuedOn),
      expiresOn: normalizeDate(item.expiresOn),
      credentialId: String(item.credentialId || '').trim(),
      credentialUrl: String(item.credentialUrl || '').trim(),
      notes: String(item.notes || '').trim(),
      sortOrder: Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : index
    }));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }

    throw error;
  }
}

async function loadDatabaseCertifications(connectionOrPool, profileId) {
  const [rows] = await connectionOrPool.query(
    `
      SELECT *
      FROM profile_certifications
      WHERE profile_id = ?
      ORDER BY sort_order ASC, issued_on DESC, id DESC
    `,
    [profileId]
  );

  return rows.map(sanitizeCertification);
}

export async function listPublicCertifications(profileSlug) {
  if (!isDatabaseEnabled()) {
    return readSeedCertifications(profileSlug);
  }

  const pool = getDatabasePool();
  const profile = await findActiveProfileBySlug(pool, profileSlug);
  if (!profile) return [];

  return loadDatabaseCertifications(pool, profile.id);
}

export async function listManagedCertifications(profileSlug) {
  if (!isDatabaseEnabled()) {
    return readSeedCertifications(profileSlug);
  }

  const pool = getDatabasePool();
  const profile = await findActiveProfileBySlug(pool, profileSlug);
  if (!profile) return [];

  return loadDatabaseCertifications(pool, profile.id);
}

export async function createCertification(profileSlug, input, actorUserId = null) {
  if (!isDatabaseEnabled()) {
    throw new Error('Certification management requires DATA_SOURCE=database.');
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
        INSERT INTO profile_certifications (
          profile_id, title, issuer, status, issued_on, expires_on,
          credential_id, credential_url, notes, sort_order, created_by, updated_by
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        profile.id,
        values.title,
        values.issuer,
        values.status,
        values.issuedOn,
        values.expiresOn,
        values.credentialId || null,
        values.credentialUrl || null,
        values.notes || null,
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

  const items = await listManagedCertifications(profileSlug);
  return items.find(item => item.title === values.title && item.issuer === values.issuer) || items[0] || null;
}

export async function updateCertification(profileSlug, certificationId, input, actorUserId = null) {
  if (!isDatabaseEnabled()) {
    throw new Error('Certification management requires DATA_SOURCE=database.');
  }

  const nextCertificationId = Number(certificationId);
  if (!Number.isInteger(nextCertificationId) || nextCertificationId <= 0) {
    throw new Error('A valid certification id is required.');
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
        FROM profile_certifications
        WHERE id = ?
          AND profile_id = ?
        LIMIT 1
      `,
      [nextCertificationId, profile.id]
    );

    const existing = rows[0];
    if (!existing) {
      await connection.rollback();
      return null;
    }

    const values = applyPatch(sanitizeCertification(existing), input);
    if (!values.title || !values.issuer) {
      throw new Error('Certification title and issuer are required.');
    }

    await connection.query(
      `
        UPDATE profile_certifications
        SET title = ?, issuer = ?, status = ?, issued_on = ?, expires_on = ?,
            credential_id = ?, credential_url = ?, notes = ?, sort_order = ?, updated_by = ?, updated_at = NOW()
        WHERE id = ?
      `,
      [
        values.title,
        values.issuer,
        values.status,
        values.issuedOn,
        values.expiresOn,
        values.credentialId || null,
        values.credentialUrl || null,
        values.notes || null,
        values.sortOrder,
        actorUserId,
        nextCertificationId
      ]
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return (await listManagedCertifications(profileSlug)).find(item => item.id === nextCertificationId) || null;
}

export async function deleteCertification(profileSlug, certificationId) {
  if (!isDatabaseEnabled()) {
    throw new Error('Certification management requires DATA_SOURCE=database.');
  }

  const nextCertificationId = Number(certificationId);
  if (!Number.isInteger(nextCertificationId) || nextCertificationId <= 0) {
    throw new Error('A valid certification id is required.');
  }

  const pool = getDatabasePool();
  const profile = await findActiveProfileBySlug(pool, profileSlug);
  if (!profile) return false;

  const [result] = await pool.query(
    `
      DELETE FROM profile_certifications
      WHERE id = ?
        AND profile_id = ?
    `,
    [nextCertificationId, profile.id]
  );

  return result.affectedRows > 0;
}
