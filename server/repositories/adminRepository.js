import bcrypt from 'bcryptjs';
import { getDatabasePool } from '../config/database.js';

const allowedUserRoles = ['owner', 'admin', 'editor', 'viewer'];

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function sanitizeMember(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    editableProfiles: row.editableProfiles || []
  };
}

export async function listMembers() {
  const pool = getDatabasePool();
  const [users] = await pool.query(
    `
      SELECT id, name, email, role
      FROM users
      ORDER BY FIELD(role, 'owner', 'admin', 'editor', 'viewer'), name ASC, email ASC
    `
  );

  const [assignments] = await pool.query(
    `
      SELECT pur.user_id, p.slug
      FROM profile_user_roles pur
      INNER JOIN profiles p ON p.id = pur.profile_id
      WHERE pur.role IN ('owner', 'editor')
        AND p.status = 'active'
      ORDER BY p.display_name ASC
    `
  );

  const assignmentsByUser = assignments.reduce((map, row) => {
    const current = map.get(row.user_id) || [];
    current.push(row.slug);
    map.set(row.user_id, current);
    return map;
  }, new Map());

  return users.map(user => sanitizeMember({
    ...user,
    editableProfiles: ['owner', 'admin'].includes(user.role) ? ['*'] : (assignmentsByUser.get(user.id) || [])
  }));
}

export async function createMemberAccount({ name, email, password, role = 'viewer' }) {
  const nextRole = allowedUserRoles.includes(role) ? role : 'viewer';
  const trimmedName = String(name || '').trim();
  const normalizedEmail = normalizeEmail(email);

  if (!trimmedName || !normalizedEmail || !password) {
    throw new Error('Name, email, and password are required.');
  }

  const passwordHash = await bcrypt.hash(String(password), 12);
  const pool = getDatabasePool();
  const [result] = await pool.query(
    `
      INSERT INTO users (name, email, password_hash, role)
      VALUES (?, ?, ?, ?)
    `,
    [trimmedName, normalizedEmail, passwordHash, nextRole]
  );

  return {
    id: result.insertId,
    name: trimmedName,
    email: normalizedEmail,
    role: nextRole,
    editableProfiles: ['owner', 'admin'].includes(nextRole) ? ['*'] : []
  };
}

export async function updateMemberAccount(memberId, { role, editableProfiles = [] }) {
  const nextRole = allowedUserRoles.includes(role) ? role : null;
  if (!nextRole) {
    throw new Error('A valid role is required.');
  }

  const requestedSlugs = Array.isArray(editableProfiles)
    ? [...new Set(editableProfiles.map(slug => String(slug).trim()).filter(Boolean))]
    : [];

  const pool = getDatabasePool();
  const [existingRows] = await pool.query('SELECT id FROM users WHERE id = ? LIMIT 1', [memberId]);
  if (!existingRows[0]) {
    return null;
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await connection.query('UPDATE users SET role = ? WHERE id = ?', [nextRole, memberId]);
    await connection.query('DELETE FROM profile_user_roles WHERE user_id = ? AND role = ?', [memberId, 'editor']);

    if (!['owner', 'admin'].includes(nextRole) && requestedSlugs.length > 0) {
      const [profiles] = await connection.query(
        `
          SELECT id, slug
          FROM profiles
          WHERE status = 'active'
            AND slug IN (?)
        `,
        [requestedSlugs]
      );

      for (const profile of profiles) {
        await connection.query(
          `
            INSERT INTO profile_user_roles (profile_id, user_id, role)
            VALUES (?, ?, 'editor')
            ON DUPLICATE KEY UPDATE role = VALUES(role)
          `,
          [profile.id, memberId]
        );
      }
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  const members = await listMembers();
  return members.find(member => member.id === memberId) || null;
}
