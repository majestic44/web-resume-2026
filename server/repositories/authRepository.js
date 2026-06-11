import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { getDatabasePool } from '../config/database.js';

const sessionDurationSeconds = Number(process.env.SESSION_DURATION_SECONDS || 60 * 60 * 24 * 14);

function tokenHash(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function createSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

function expiresAtDate() {
  return new Date(Date.now() + sessionDurationSeconds * 1000);
}

function mysqlDateTime(date) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function sanitizeUser(row) {
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role
  };
}

function isElevatedRole(role) {
  return ['owner', 'admin'].includes(role);
}

export async function authenticateUser(email, password) {
  const pool = getDatabasePool();
  const [rows] = await pool.query(
    'SELECT id, name, email, role, password_hash FROM users WHERE email = ? LIMIT 1',
    [String(email).trim().toLowerCase()]
  );

  const user = rows[0];
  if (!user) return null;

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) return null;

  return sanitizeUser(user);
}

export async function createUserSession(userId) {
  const pool = getDatabasePool();
  const token = createSessionToken();
  const expiresAt = expiresAtDate();

  await pool.query(
    `
      INSERT INTO user_sessions (user_id, token_hash, expires_at, last_seen_at)
      VALUES (?, ?, ?, NOW())
    `,
    [userId, tokenHash(token), mysqlDateTime(expiresAt)]
  );

  return {
    token,
    expiresAt
  };
}

export async function getUserBySessionToken(token) {
  if (!token) return null;

  const pool = getDatabasePool();
  const [rows] = await pool.query(
    `
      SELECT u.id, u.name, u.email, u.role
      FROM user_sessions s
      INNER JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ?
        AND s.expires_at > NOW()
      LIMIT 1
    `,
    [tokenHash(token)]
  );

  const user = sanitizeUser(rows[0]);
  if (!user) return null;

  return {
    ...user,
    editableProfiles: await getEditableProfileSlugs(user)
  };
}

export async function touchUserSession(token) {
  if (!token) return;
  const pool = getDatabasePool();
  await pool.query(
    'UPDATE user_sessions SET last_seen_at = NOW() WHERE token_hash = ?',
    [tokenHash(token)]
  );
}

export async function deleteUserSession(token) {
  if (!token) return;
  const pool = getDatabasePool();
  await pool.query('DELETE FROM user_sessions WHERE token_hash = ?', [tokenHash(token)]);
}

export function canEditDrafts(user) {
  return Boolean(user && ['owner', 'admin', 'editor'].includes(user.role));
}

export function canManageMembers(user) {
  return Boolean(user && ['owner', 'admin'].includes(user.role));
}

export async function getEditableProfileSlugs(user) {
  if (!user) return [];
  if (isElevatedRole(user.role)) return ['*'];

  const pool = getDatabasePool();
  const [rows] = await pool.query(
    `
      SELECT p.slug
      FROM profile_user_roles pur
      INNER JOIN profiles p ON p.id = pur.profile_id
      WHERE pur.user_id = ?
        AND pur.role IN ('owner', 'editor')
        AND p.status = 'active'
    `,
    [user.id]
  );

  return rows.map(row => row.slug);
}

export function canEditProfile(user, profileSlug) {
  if (!canEditDrafts(user)) return false;
  if (isElevatedRole(user.role)) return true;
  return Array.isArray(user.editableProfiles) && user.editableProfiles.includes(profileSlug);
}
