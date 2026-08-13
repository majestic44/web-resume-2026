import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDatabaseEnabled } from '../config/app.js';
import { getDatabasePool } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicUploadsDir = path.resolve(__dirname, '..', '..', 'public', 'uploads');

async function safeUnlink(filePath) {
  if (!filePath) return;

  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }
  }
}

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
  if (!file || !file.path || !file.originalname) {
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

async function findProfileMediaById(connectionOrPool, profileId, mediaId) {
  const [rows] = await connectionOrPool.query(
    `
      SELECT *
      FROM media_assets
      WHERE id = ?
        AND profile_id = ?
      LIMIT 1
    `,
    [mediaId, profileId]
  );

  return rows[0] || null;
}

async function ensureProfileUploadDir(profileSlug) {
  const targetDir = path.join(publicUploadsDir, profileSlug);
  await fs.mkdir(targetDir, { recursive: true });
  return targetDir;
}

function absolutePathFromPublicPath(publicPath) {
  const normalizedPath = String(publicPath || '')
    .replace(/^\/+/, '')
    .replace(/\//g, path.sep);

  return path.resolve(path.join(publicUploadsDir, '..', normalizedPath));
}

function replaceDocumentImageReferences(content, fromPath, toPath) {
  if (!content || typeof content !== 'object') return content;

  const nextContent = { ...content };
  if (nextContent.image === fromPath) {
    nextContent.image = toPath;
  }

  if (nextContent.images?.profile === fromPath) {
    nextContent.images = {
      ...(nextContent.images || {}),
      profile: toPath
    };
  }

  return nextContent;
}

async function replaceProfileMediaReferences(connection, profileId, fromPath, toPath) {
  await connection.query(
    `
      UPDATE portfolio_assets pa
      INNER JOIN portfolio_items pi ON pi.id = pa.portfolio_item_id
      SET pa.file_path = ?
      WHERE pi.profile_id = ?
        AND pa.file_path = ?
    `,
    [toPath, profileId, fromPath]
  );

  const [documents] = await connection.query(
    `
      SELECT id, content_json
      FROM documents
      WHERE profile_id = ?
    `,
    [profileId]
  );

  for (const document of documents) {
    const content = typeof document.content_json === 'string'
      ? JSON.parse(document.content_json)
      : document.content_json;

    const nextContent = replaceDocumentImageReferences(content, fromPath, toPath);
    if (JSON.stringify(nextContent) === JSON.stringify(content)) {
      continue;
    }

    await connection.query(
      `
        UPDATE documents
        SET content_json = ?, updated_at = NOW()
        WHERE id = ?
      `,
      [JSON.stringify(nextContent), document.id]
    );
  }
}

async function countProfileMediaReferences(connection, profileId, publicPath) {
  const [portfolioRows] = await connection.query(
    `
      SELECT COUNT(*) AS count
      FROM portfolio_assets pa
      INNER JOIN portfolio_items pi ON pi.id = pa.portfolio_item_id
      WHERE pi.profile_id = ?
        AND pa.file_path = ?
    `,
    [profileId, publicPath]
  );

  let total = Number(portfolioRows[0]?.count || 0);

  const [documents] = await connection.query(
    `
      SELECT content_json
      FROM documents
      WHERE profile_id = ?
    `,
    [profileId]
  );

  for (const document of documents) {
    const content = typeof document.content_json === 'string'
      ? JSON.parse(document.content_json)
      : document.content_json;

    if (content?.image === publicPath) {
      total += 1;
    }

    if (content?.images?.profile === publicPath) {
      total += 1;
    }
  }

  return total;
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
  let tempFilePath = file?.path || '';
  let finalFilePath = '';

  try {
    await connection.beginTransaction();

    const profile = await findActiveProfileBySlug(connection, profileSlug);
    if (!profile) {
      await connection.rollback();
      await safeUnlink(tempFilePath);
      return null;
    }

    const baseName = normalizeFileNameSegment(path.parse(validated.originalName).name) || 'asset';
    const extension = normalizeStoredExtension(validated.originalName, validated.mimeType);
    const storedName = `${Date.now()}-${baseName}${extension}`;
    const profileUploadDir = await ensureProfileUploadDir(profile.slug);
    finalFilePath = path.join(profileUploadDir, storedName);
    const publicPath = `/uploads/${profile.slug}/${storedName}`;

    await fs.rename(tempFilePath, finalFilePath);
    tempFilePath = '';

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
    await safeUnlink(tempFilePath);
    await safeUnlink(finalFilePath);
    throw error;
  } finally {
    connection.release();
  }
}

export async function deleteProfileMedia(profileSlug, mediaId) {
  if (!isDatabaseEnabled()) {
    throw new Error('Media library management requires DATA_SOURCE=database.');
  }

  const nextMediaId = Number(mediaId);
  if (!Number.isInteger(nextMediaId) || nextMediaId <= 0) {
    throw new Error('A valid media asset id is required.');
  }

  const pool = getDatabasePool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const profile = await findActiveProfileBySlug(connection, profileSlug);
    if (!profile) {
      await connection.rollback();
      return { status: 'missing_profile' };
    }

    const mediaRow = await findProfileMediaById(connection, profile.id, nextMediaId);
    if (!mediaRow) {
      await connection.rollback();
      return { status: 'missing_media' };
    }

    const referenceCount = await countProfileMediaReferences(connection, profile.id, mediaRow.public_path);
    if (referenceCount > 0) {
      await connection.rollback();
      throw new Error('This media asset is currently in use. Replace it first or remove its references before deleting it.');
    }

    await connection.query('DELETE FROM media_assets WHERE id = ?', [nextMediaId]);
    await connection.commit();

    await safeUnlink(absolutePathFromPublicPath(mediaRow.public_path));
    return { status: 'deleted' };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function replaceProfileMedia(profileSlug, mediaId, file, actorUserId = null) {
  if (!isDatabaseEnabled()) {
    throw new Error('Media library management requires DATA_SOURCE=database.');
  }

  const nextMediaId = Number(mediaId);
  if (!Number.isInteger(nextMediaId) || nextMediaId <= 0) {
    throw new Error('A valid media asset id is required.');
  }

  const validated = validateUploadFile(file);
  const pool = getDatabasePool();
  const connection = await pool.getConnection();
  let tempFilePath = file?.path || '';
  let finalFilePath = '';
  let oldAbsolutePath = '';

  try {
    await connection.beginTransaction();

    const profile = await findActiveProfileBySlug(connection, profileSlug);
    if (!profile) {
      await connection.rollback();
      await safeUnlink(tempFilePath);
      return null;
    }

    const existing = await findProfileMediaById(connection, profile.id, nextMediaId);
    if (!existing) {
      await connection.rollback();
      await safeUnlink(tempFilePath);
      return null;
    }

    const baseName = normalizeFileNameSegment(path.parse(validated.originalName).name) || 'asset';
    const extension = normalizeStoredExtension(validated.originalName, validated.mimeType);
    const storedName = `${Date.now()}-${baseName}${extension}`;
    const profileUploadDir = await ensureProfileUploadDir(profile.slug);
    finalFilePath = path.join(profileUploadDir, storedName);
    const nextPublicPath = `/uploads/${profile.slug}/${storedName}`;
    oldAbsolutePath = absolutePathFromPublicPath(existing.public_path);

    await fs.rename(tempFilePath, finalFilePath);
    tempFilePath = '';

    await connection.query(
      `
        UPDATE media_assets
        SET kind = ?, original_name = ?, stored_name = ?, mime_type = ?, size_bytes = ?, public_path = ?, updated_by = ?, updated_at = NOW()
        WHERE id = ?
      `,
      [
        mediaKindFromMimeType(validated.mimeType),
        validated.originalName,
        storedName,
        validated.mimeType,
        validated.sizeBytes,
        nextPublicPath,
        actorUserId,
        nextMediaId
      ]
    );

    await replaceProfileMediaReferences(connection, profile.id, existing.public_path, nextPublicPath);

    const [rows] = await connection.query('SELECT * FROM media_assets WHERE id = ? LIMIT 1', [nextMediaId]);
    await connection.commit();

    await safeUnlink(oldAbsolutePath);
    return rows[0] ? sanitizeMediaAsset(rows[0]) : null;
  } catch (error) {
    await connection.rollback();
    await safeUnlink(tempFilePath);
    await safeUnlink(finalFilePath);
    throw error;
  } finally {
    connection.release();
  }
}
