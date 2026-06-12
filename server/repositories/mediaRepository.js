import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDatabaseEnabled } from '../config/app.js';
import { getDatabasePool } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicUploadsDir = path.resolve(__dirname, '..', '..', 'public', 'uploads');

function sanitizeMediaAsset(row) {
  return {
    id: row.id,
    profileId: row.profile_id,
    kind: row.kind,
    originalName: row.original_name,
    storedName: row.stored_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    publicPath: row.public_path,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function normalizeFileNameSegment(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/['â€™]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function extensionFromMimeType(mimeType) {
  if (mimeType === 'application/pdf') return '.pdf';
  if (mimeType === 'image/png') return '.png';
  if (mimeType === 'image/webp') return '.webp';
  if (mimeType === 'image/gif') return '.gif';
  if (mimeType === 'image/svg+xml') return '.svg';
  if (mimeType === 'image/jpeg') return '.jpg';
  return '';
}

function normalizeStoredExtension(originalName, mimeType) {
  const parsed = path.parse(String(originalName || '').trim());
  const ext = parsed.ext ? parsed.ext.toLowerCase() : '';
  if (ext) return ext.slice(0, 12);
  return extensionFromMimeType(mimeType) || '.bin';
}

function mediaKindFromMimeType(mimeType) {
  if (String(mimeType || '').startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'pdf';
  return 'file';
}

function validateUploadFile(file) {
  if (!file || !file.buffer || !file.originalname) {
    throw new Error('A file upload is required.');
  }

  const mimeType = String(file.mimetype || '').toLowerCase();
  if (!mimeType.startsWith('image/') && mimeType !== 'application/pdf') {
    throw new Error('Only image and PDF uploads are supported right now.');
  }

  return {
    mimeType,
    sizeBytes: Number(file.size || 0),
    originalName: String(file.originalname || '').trim() || 'upload'
  };
}

async function findActiveProfileBySlug(connectionOrPool, profileSlug) {
  const [rows] = await connectionOrPool.query(
    `
      SELECT id, slug
      FROM profiles
      WHERE slug = ?
        AND status = 'active'
      LIMIT 1
    `,
    [profileSlug]
  );

  return rows[0] || null;
}

async function ensureProfileUploadDir(profileSlug) {
  const targetDir = path.join(publicUploadsDir, profileSlug);
  await fs.mkdir(targetDir, { recursive: true });
  return targetDir;
}

export async function listProfileMedia(profileSlug) {
  if (!isDatabaseEnabled()) {
    throw new Error('Media library management requires DATA_SOURCE=database.');
  }

  const pool = getDatabasePool();
  const profile = await findActiveProfileBySlug(pool, profileSlug);
  if (!profile) return [];

  const [rows] = await pool.query(
    `
      SELECT *
      FROM media_assets
      WHERE profile_id = ?
      ORDER BY created_at DESC, id DESC
    `,
    [profile.id]
  );

  return rows.map(sanitizeMediaAsset);
}

export async function createProfileMedia(profileSlug, file, actorUserId = null) {
  if (!isDatabaseEnabled()) {
    throw new Error('Media library management requires DATA_SOURCE=database.');
  }

  const validated = validateUploadFile(file);
  const pool = getDatabasePool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const profile = await findActiveProfileBySlug(connection, profileSlug);
    if (!profile) {
      await connection.rollback();
      return null;
    }

    const baseName = normalizeFileNameSegment(path.parse(validated.originalName).name) || 'asset';
    const extension = normalizeStoredExtension(validated.originalName, validated.mimeType);
    const storedName = `${Date.now()}-${baseName}${extension}`;
    const profileUploadDir = await ensureProfileUploadDir(profile.slug);
    const absoluteFilePath = path.join(profileUploadDir, storedName);
    const publicPath = `/uploads/${profile.slug}/${storedName}`;

    await fs.writeFile(absoluteFilePath, file.buffer);

    const [result] = await connection.query(
      `
        INSERT INTO media_assets (
          profile_id, kind, original_name, stored_name, mime_type, size_bytes, public_path, created_by, updated_by
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        profile.id,
        mediaKindFromMimeType(validated.mimeType),
        validated.originalName,
        storedName,
        validated.mimeType,
        validated.sizeBytes,
        publicPath,
        actorUserId,
        actorUserId
      ]
    );

    const [rows] = await connection.query('SELECT * FROM media_assets WHERE id = ? LIMIT 1', [result.insertId]);
    await connection.commit();

    return rows[0] ? sanitizeMediaAsset(rows[0]) : null;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
