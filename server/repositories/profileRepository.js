import { getDatabasePool } from '../config/database.js';

function defaultSectionTitles() {
  return {
    summary: 'Professional Summary',
    strengths: 'Selected Strengths',
    skills: 'Core Skills',
    work: 'Professional Experience',
    education: 'Education',
    volunteer: 'Volunteer Work'
  };
}

function defaultSectionVisibility() {
  return {
    documents: true,
    portfolio: true,
    certifications: false,
    references: false
  };
}

function normalizeTemplate(template) {
  const value = String(template || 'modern').trim().toLowerCase();
  return value || 'modern';
}

function normalizeBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1' || value === 'true' || value === 'on') return true;
  if (value === 0 || value === '0' || value === 'false' || value === 'off') return false;
  return fallback;
}

function normalizeSectionVisibility(input = {}) {
  const defaults = defaultSectionVisibility();

  return {
    documents: normalizeBoolean(input.documents, defaults.documents),
    portfolio: normalizeBoolean(input.portfolio, defaults.portfolio),
    certifications: normalizeBoolean(input.certifications, defaults.certifications),
    references: normalizeBoolean(input.references, defaults.references)
  };
}

function sectionVisibilityFromRow(row) {
  return normalizeSectionVisibility({
    documents: row.show_documents,
    portfolio: row.show_portfolio,
    certifications: row.show_certifications,
    references: row.show_references
  });
}

export function normalizeProfileSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

function createDefaultResumeContent({ displayName, headline, template }) {
  return {
    template,
    name: displayName,
    title: headline,
    location: '',
    address: '',
    phone: '',
    email: '',
    linkedin: '',
    summary: '',
    sectionTitles: defaultSectionTitles(),
    selectedStrengths: [],
    skills: [
      {
        name: 'Core Skills',
        keywords: []
      }
    ],
    experience: [],
    education: [],
    volunteer: []
  };
}

function createDefaultCoverLetterContent({ displayName, headline, template }) {
  return {
    template,
    name: displayName,
    title: headline,
    address: '',
    phone: '',
    email: '',
    linkedin: '',
    location: '',
    recipient: {
      name: 'Hiring Manager',
      company: '',
      addressLines: []
    },
    greeting: 'Dear Hiring Manager,',
    opening: '',
    body: [
      'I am writing to express my interest in the position with your organization.',
      'My experience has prepared me to contribute strong communication, reliable follow-through, and practical problem-solving.',
      'Thank you for your time and consideration.'
    ],
    closing: 'I would welcome the opportunity to discuss how my background can support your team.',
    signature: 'Sincerely,'
  };
}

function sanitizeManagedProfile(row) {
  return {
    id: row.id,
    slug: row.slug,
    displayName: row.display_name,
    headline: row.headline || '',
    template: row.template || 'modern',
    sectionVisibility: sectionVisibilityFromRow(row),
    status: row.status,
    updatedAt: row.updated_at
  };
}

function validateProfileInput({ displayName, slug, headline }) {
  const cleanDisplayName = String(displayName || '').trim();
  const cleanHeadline = String(headline || '').trim();
  const cleanSlug = normalizeProfileSlug(slug);

  if (!cleanDisplayName || !cleanSlug || !cleanHeadline) {
    throw new Error('Display name, slug, and headline are required.');
  }

  return {
    displayName: cleanDisplayName,
    slug: cleanSlug,
    headline: cleanHeadline
  };
}

export async function listManagedProfiles() {
  const pool = getDatabasePool();
  const [rows] = await pool.query(
    `
      SELECT p.id, p.slug, p.display_name, p.headline, p.status, p.updated_at,
             p.show_documents, p.show_portfolio, p.show_certifications, p.show_references,
             d.template
      FROM profiles p
      LEFT JOIN documents d
        ON d.profile_id = p.id
        AND d.type = 'resume'
        AND d.slug = 'resume'
      ORDER BY FIELD(p.status, 'active', 'archived'), p.display_name ASC
    `
  );

  return rows.map(sanitizeManagedProfile);
}

export async function createProfile({ displayName, slug, headline, template = 'modern', sectionVisibility }, actorUserId = null) {
  const values = validateProfileInput({ displayName, slug, headline });
  const nextTemplate = normalizeTemplate(template);
  const nextSectionVisibility = normalizeSectionVisibility(sectionVisibility);
  const pool = getDatabasePool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [profileResult] = await connection.query(
      `
        INSERT INTO profiles (
          slug, display_name, headline, status,
          show_documents, show_portfolio, show_certifications, show_references,
          created_by, updated_by
        )
        VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?, ?)
      `,
      [
        values.slug,
        values.displayName,
        values.headline,
        nextSectionVisibility.documents ? 1 : 0,
        nextSectionVisibility.portfolio ? 1 : 0,
        nextSectionVisibility.certifications ? 1 : 0,
        nextSectionVisibility.references ? 1 : 0,
        actorUserId,
        actorUserId
      ]
    );

    const profileId = profileResult.insertId;
    const resumeContent = createDefaultResumeContent({
      displayName: values.displayName,
      headline: values.headline,
      template: nextTemplate
    });
    const letterContent = createDefaultCoverLetterContent({
      displayName: values.displayName,
      headline: values.headline,
      template: nextTemplate
    });

    await connection.query(
      `
        INSERT INTO documents (profile_id, type, slug, title, template, content_json, visibility, created_by, updated_by)
        VALUES
          (?, 'resume', 'resume', 'Professional Resume', ?, ?, 'private', ?, ?),
          (?, 'cover_letter', 'general', 'General Cover Letter', ?, ?, 'private', ?, ?)
      `,
      [
        profileId, nextTemplate, JSON.stringify(resumeContent), actorUserId, actorUserId,
        profileId, nextTemplate, JSON.stringify(letterContent), actorUserId, actorUserId
      ]
    );

    await connection.commit();

    const profiles = await listManagedProfiles();
    return profiles.find(profile => profile.id === profileId) || null;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateProfile(profileId, { displayName, slug, headline, template, status, sectionVisibility }, actorUserId = null) {
  const nextProfileId = Number(profileId);
  if (!Number.isInteger(nextProfileId) || nextProfileId <= 0) {
    throw new Error('A valid profile id is required.');
  }

  const nextTemplate = normalizeTemplate(template);
  const nextStatus = ['active', 'archived'].includes(status) ? status : 'active';
  const values = validateProfileInput({ displayName, slug, headline });
  const nextSectionVisibility = normalizeSectionVisibility(sectionVisibility);
  const pool = getDatabasePool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [existingRows] = await connection.query(
      'SELECT id FROM profiles WHERE id = ? LIMIT 1',
      [nextProfileId]
    );

    if (!existingRows[0]) {
      await connection.rollback();
      return null;
    }

    await connection.query(
      `
        UPDATE profiles
        SET slug = ?, display_name = ?, headline = ?, status = ?,
            show_documents = ?, show_portfolio = ?, show_certifications = ?, show_references = ?,
            updated_by = ?, updated_at = NOW()
        WHERE id = ?
      `,
      [
        values.slug,
        values.displayName,
        values.headline,
        nextStatus,
        nextSectionVisibility.documents ? 1 : 0,
        nextSectionVisibility.portfolio ? 1 : 0,
        nextSectionVisibility.certifications ? 1 : 0,
        nextSectionVisibility.references ? 1 : 0,
        actorUserId,
        nextProfileId
      ]
    );

    const [documents] = await connection.query(
      `
        SELECT id, type, content_json
        FROM documents
        WHERE profile_id = ?
          AND type IN ('resume', 'cover_letter')
      `,
      [nextProfileId]
    );

    for (const document of documents) {
      const content = typeof document.content_json === 'string'
        ? JSON.parse(document.content_json)
        : document.content_json;

      const nextContent = {
        ...content,
        template: nextTemplate,
        name: values.displayName,
        title: values.headline
      };

      await connection.query(
        `
          UPDATE documents
          SET template = ?, content_json = ?, updated_by = ?, updated_at = NOW()
          WHERE id = ?
        `,
        [nextTemplate, JSON.stringify(nextContent), actorUserId, document.id]
      );
    }

    await connection.commit();

    const profiles = await listManagedProfiles();
    return profiles.find(profile => profile.id === nextProfileId) || null;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
