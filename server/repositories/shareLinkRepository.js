import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { isDatabaseEnabled } from '../config/app.js';
import { getDatabasePool } from '../config/database.js';
import { readDocument } from './documentRepository.js';
import { readPublicProfile } from './portfolioRepository.js';
import { listPublicReferences } from './referenceRepository.js';
import {
  createResumeQrPublicToken,
  isValidResumeQrPublicToken,
  parseResumeQrPublicToken
} from '../services/resumeQrToken.js';

const shareTokenBytes = 32;

function shareTokenHash(token) {
  const pepper = String(process.env.SHARE_TOKEN_PEPPER || '');
  return crypto.createHash('sha256').update(`${pepper}:${token}`).digest('hex');
}

function createShareToken() {
  return crypto.randomBytes(shareTokenBytes).toString('base64url');
}

function normalizeProfileId(value) {
  const profileId = Number(value);
  if (!Number.isInteger(profileId) || profileId <= 0) {
    throw new Error('A valid profile id is required.');
  }

  return profileId;
}

function sanitizeShareLink(row) {
  if (!row) return null;

  return {
    id: row.id,
    profileId: row.profile_id,
    active: !row.revoked_at,
    createdAt: row.created_at,
    revokedAt: row.revoked_at,
    lastAccessedAt: row.last_accessed_at,
    createdByUserId: row.created_by_user_id || null,
    createdByName: row.created_by_name || ''
  };
}

function sanitizeProfileShareLink(row) {
  const link = sanitizeShareLink(row);
  if (!link) return null;

  return {
    ...link,
    referencesPasswordProtected: Boolean(row.references_password_hash)
  };
}

function sanitizeResumeQrLink(row) {
  if (!row) return null;

  return {
    id: row.id,
    profileId: row.profile_id,
    active: !row.disabled_at,
    createdAt: row.created_at,
    disabledAt: row.disabled_at,
    lastAccessedAt: row.last_accessed_at,
    createdByUserId: row.created_by_user_id || null,
    createdByName: row.created_by_name || ''
  };
}

function normalizeReferencesPassword(value) {
  const password = String(value || '');
  if (password.length < 12) {
    throw new Error('Choose a reference password with at least 12 characters.');
  }

  return password;
}

export async function findShareLinkProfile(profileId) {
  if (!isDatabaseEnabled()) {
    throw new Error('Resume sharing requires DATA_SOURCE=database.');
  }

  const nextProfileId = normalizeProfileId(profileId);
  const pool = getDatabasePool();
  const [rows] = await pool.query(
    `
      SELECT id, slug, display_name
      FROM profiles
      WHERE id = ?
        AND status = 'active'
      LIMIT 1
    `,
    [nextProfileId]
  );

  return rows[0] || null;
}

export async function readResumeShareLink(profileId) {
  const profile = await findShareLinkProfile(profileId);
  if (!profile) return null;

  const pool = getDatabasePool();
  const [rows] = await pool.query(
    `
      SELECT l.*, u.name AS created_by_name
      FROM profile_resume_share_links l
      LEFT JOIN users u ON u.id = l.created_by_user_id
      WHERE l.profile_id = ?
      LIMIT 1
    `,
    [profile.id]
  );

  return {
    profile,
    link: sanitizeShareLink(rows[0])
  };
}

export async function createOrRotateResumeShareLink(profileId, actorUserId = null) {
  const profile = await findShareLinkProfile(profileId);
  if (!profile) return null;

  const token = createShareToken();
  const tokenHash = shareTokenHash(token);
  const pool = getDatabasePool();

  await pool.query(
    `
      INSERT INTO profile_resume_share_links (profile_id, token_hash, created_by_user_id)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        token_hash = VALUES(token_hash),
        created_at = CURRENT_TIMESTAMP,
        revoked_at = NULL,
        last_accessed_at = NULL,
        created_by_user_id = VALUES(created_by_user_id)
    `,
    [profile.id, tokenHash, actorUserId]
  );

  const share = await readResumeShareLink(profile.id);
  return {
    ...share,
    token
  };
}

export async function revokeResumeShareLink(profileId) {
  const profile = await findShareLinkProfile(profileId);
  if (!profile) return null;

  const pool = getDatabasePool();
  const [result] = await pool.query(
    `
      UPDATE profile_resume_share_links
      SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP)
      WHERE profile_id = ?
        AND revoked_at IS NULL
    `,
    [profile.id]
  );

  return {
    profile,
    revoked: result.affectedRows > 0
  };
}

export async function readProfileShareLink(profileId) {
  const profile = await findShareLinkProfile(profileId);
  if (!profile) return null;

  const pool = getDatabasePool();
  const [rows] = await pool.query(
    `
      SELECT l.*, u.name AS created_by_name
      FROM profile_share_links l
      LEFT JOIN users u ON u.id = l.created_by_user_id
      WHERE l.profile_id = ?
      LIMIT 1
    `,
    [profile.id]
  );

  return { profile, link: sanitizeProfileShareLink(rows[0]) };
}

export async function createOrRotateProfileShareLink(profileId, referencesPassword, actorUserId = null) {
  const profile = await findShareLinkProfile(profileId);
  if (!profile) return null;

  const token = createShareToken();
  const passwordHash = await bcrypt.hash(normalizeReferencesPassword(referencesPassword), 12);
  const pool = getDatabasePool();

  await pool.query(
    `
      INSERT INTO profile_share_links (profile_id, token_hash, references_password_hash, created_by_user_id)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        token_hash = VALUES(token_hash),
        references_password_hash = VALUES(references_password_hash),
        created_at = CURRENT_TIMESTAMP,
        revoked_at = NULL,
        last_accessed_at = NULL,
        created_by_user_id = VALUES(created_by_user_id)
    `,
    [profile.id, shareTokenHash(token), passwordHash, actorUserId]
  );

  const share = await readProfileShareLink(profile.id);
  return { ...share, token };
}

export async function revokeProfileShareLink(profileId) {
  const profile = await findShareLinkProfile(profileId);
  if (!profile) return null;

  const pool = getDatabasePool();
  const [result] = await pool.query(
    `UPDATE profile_share_links SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP)
     WHERE profile_id = ? AND revoked_at IS NULL`,
    [profile.id]
  );

  return { profile, revoked: result.affectedRows > 0 };
}

async function resolveProfileShareLink(token) {
  if (!isDatabaseEnabled()) return null;

  const rawToken = String(token || '').trim();
  if (!/^[A-Za-z0-9_-]{43}$/.test(rawToken)) return null;

  const pool = getDatabasePool();
  const [rows] = await pool.query(
    `
      SELECT l.id AS share_link_id, l.profile_id, l.references_password_hash, p.slug, p.show_references
      FROM profile_share_links l
      INNER JOIN profiles p ON p.id = l.profile_id
      WHERE l.token_hash = ? AND l.revoked_at IS NULL AND p.status = 'active'
      LIMIT 1
    `,
    [shareTokenHash(rawToken)]
  );

  return rows[0] || null;
}

export async function hasActiveSharedProfile(token) {
  return Boolean(await resolveProfileShareLink(token));
}

export async function resolveSharedProfile(token) {
  const link = await resolveProfileShareLink(token);
  if (!link) return null;

  const payload = await readPublicProfile(link.slug);
  if (!payload) return null;

  const pool = getDatabasePool();
  await pool.query('UPDATE profile_share_links SET last_accessed_at = CURRENT_TIMESTAMP WHERE id = ?', [link.share_link_id]);

  const { coverLetterLink, profileLink, ...safeProfile } = payload.profile;
  return {
    profile: {
      ...safeProfile,
      resumeLink: `/shared/profile/${token}/resume`,
      referenceAccess: payload.profile.sectionVisibility?.references ? 'password' : 'hidden'
    },
    portfolioItems: payload.portfolioItems,
    certifications: payload.certifications,
    references: []
  };
}

export async function resolveSharedProfileResume(token) {
  const link = await resolveProfileShareLink(token);
  if (!link) return null;

  const document = await readDocument('resume', link.slug);
  if (!document) return null;

  return {
    meta: { template: document.meta.template, updatedAt: document.meta.updatedAt },
    content: document.content
  };
}

export async function resolveSharedProfileReferences(token, password) {
  const link = await resolveProfileShareLink(token);
  if (!link) return null;
  if (!link.show_references) return { status: 'hidden' };

  const passwordMatches = await bcrypt.compare(String(password || ''), link.references_password_hash);
  if (!passwordMatches) return { status: 'invalid_password' };

  const references = await listPublicReferences(link.slug);
  return { status: 'ok', references };
}

function normalizeResumeShareToken(token) {
  const rawToken = String(token || '').trim();
  return /^[A-Za-z0-9_-]{43}$/.test(rawToken) ? rawToken : null;
}

async function findActiveSharedResumeDocument(token, { table, inactiveColumn, linkIdAlias }) {
  if (!isDatabaseEnabled()) return null;

  const rawToken = normalizeResumeShareToken(token);
  if (!rawToken) return null;

  const pool = getDatabasePool();
  const [rows] = await pool.query(
    `
      SELECT l.id AS ${linkIdAlias}, d.template, d.content_json, d.updated_at
      FROM ${table} l
      INNER JOIN profiles p ON p.id = l.profile_id
      INNER JOIN documents d
        ON d.profile_id = p.id
        AND d.type = 'resume'
        AND d.slug = 'resume'
      WHERE l.token_hash = ?
        AND l.${inactiveColumn} IS NULL
        AND p.status = 'active'
      LIMIT 1
    `,
    [shareTokenHash(rawToken)]
  );

  return rows[0] || null;
}

function formatSharedResumeDocument(row) {
  return {
    meta: {
      template: row.template,
      updatedAt: row.updated_at
    },
    content: typeof row.content_json === 'string' ? JSON.parse(row.content_json) : row.content_json
  };
}

async function resolveSharedResumeDocument(token, linkType) {
  const row = await findActiveSharedResumeDocument(token, linkType);
  if (!row) return null;

  const pool = getDatabasePool();
  await pool.query(
    `UPDATE ${linkType.table} SET last_accessed_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [row[linkType.linkIdAlias]]
  );

  return formatSharedResumeDocument(row);
}

const resumeShareLinkType = {
  table: 'profile_resume_share_links',
  inactiveColumn: 'revoked_at',
  linkIdAlias: 'share_link_id'
};

export async function hasActiveSharedResume(token) {
  return Boolean(await findActiveSharedResumeDocument(token, resumeShareLinkType));
}

export async function resolveSharedResume(token) {
  return resolveSharedResumeDocument(token, resumeShareLinkType);
}

export async function readResumeQrLink(profileId) {
  const profile = await findShareLinkProfile(profileId);
  if (!profile) return null;

  const pool = getDatabasePool();
  const [rows] = await pool.query(
    `
      SELECT l.*, u.name AS created_by_name
      FROM profile_resume_qr_links l
      LEFT JOIN users u ON u.id = l.created_by_user_id
      WHERE l.profile_id = ?
      LIMIT 1
    `,
    [profile.id]
  );

  return {
    profile,
    link: sanitizeResumeQrLink(rows[0])
  };
}

export async function createOrRotateResumeQrLink(profileId, actorUserId = null) {
  const profile = await findShareLinkProfile(profileId);
  if (!profile) return null;

  const token = createShareToken();
  const tokenHash = shareTokenHash(token);
  const pool = getDatabasePool();

  await pool.query(
    `
      INSERT INTO profile_resume_qr_links (
        profile_id,
        token_hash,
        created_by_user_id
      )
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        token_hash = VALUES(token_hash),
        created_at = CURRENT_TIMESTAMP,
        disabled_at = NULL,
        last_accessed_at = NULL,
        created_by_user_id = VALUES(created_by_user_id)
    `,
    [profile.id, tokenHash, actorUserId]
  );

  const share = await readResumeQrLink(profile.id);

  return {
    ...share,
    token,
    publicToken: createResumeQrPublicToken(share.link.id, tokenHash)
  };
}

export async function disableResumeQrLink(profileId) {
  const profile = await findShareLinkProfile(profileId);
  if (!profile) return null;

  const pool = getDatabasePool();

  const [result] = await pool.query(
    `
      UPDATE profile_resume_qr_links
      SET disabled_at = CURRENT_TIMESTAMP
      WHERE profile_id = ?
        AND disabled_at IS NULL
    `,
    [profile.id]
  );

  return {
    profile,
    revoked: result.affectedRows > 0
  };
}

async function findActiveResumeQrLink(token) {
  if (!isDatabaseEnabled()) return null;

  const rawToken = normalizeResumeShareToken(token);
  const publicToken = parseResumeQrPublicToken(token);
  if (!rawToken && !publicToken) return null;

  const pool = getDatabasePool();
  const [rows] = await pool.query(
    `
      SELECT l.id AS qr_link_id, l.token_hash, p.slug
      FROM profile_resume_qr_links l
      INNER JOIN profiles p ON p.id = l.profile_id
      WHERE ${publicToken ? 'l.id = ?' : 'l.token_hash = ?'}
        AND l.disabled_at IS NULL
        AND p.status = 'active'
      LIMIT 1
    `,
    [publicToken ? publicToken.linkId : shareTokenHash(rawToken)]
  );

  const link = rows[0] || null;
  if (!link || (publicToken && !isValidResumeQrPublicToken(publicToken, link.token_hash))) return null;

  return link;
}

export async function resolveResumeQrLink(token) {
  const link = await findActiveResumeQrLink(token);
  if (!link) return null;

  const document = await readDocument('resume', link.slug);
  if (!document) return null;

  const pool = getDatabasePool();
  await pool.query(
    'UPDATE profile_resume_qr_links SET last_accessed_at = CURRENT_TIMESTAMP WHERE id = ?',
    [link.qr_link_id]
  );

  return document;
}

export async function resolveResumeQrProfile(token) {
  const link = await findActiveResumeQrLink(token);
  if (!link) return null;

  const payload = await readPublicProfile(link.slug, { includeReferences: false });
  if (!payload) return null;

  await pool.query(
    'UPDATE profile_resume_qr_links SET last_accessed_at = CURRENT_TIMESTAMP WHERE id = ?',
    [link.qr_link_id]
  );

  const { coverLetterLink, profileLink, ...safeProfile } = payload.profile;
  return {
    profile: {
      ...safeProfile,
      resumeLink: `/shared/profile/qr/${token}/resume`,
      referenceAccess: 'hidden'
    },
    portfolioItems: payload.portfolioItems,
    certifications: payload.certifications,
    references: []
  };
}

export async function hasActiveResumeQrLink(token) {
  return Boolean(await findActiveResumeQrLink(token));
}
