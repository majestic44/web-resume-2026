import { isDatabaseEnabled } from '../config/app.js';
import { getDatabasePool } from '../config/database.js';
import { deleteDraft as deleteFileDraft, readDraft as readFileDraft, readDraftHistory as readFileDraftHistory, saveDraft as saveFileDraft } from '../services/draftStore.js';

function documentTypeForDatabase(type) {
  return type === 'cover-letter' ? 'cover_letter' : type;
}

function documentSlugForType(type) {
  return type === 'cover-letter' ? 'general' : 'resume';
}

function normalizeHistory(history) {
  return history.map(entry => ({
    versionId: entry.versionId,
    savedAt: entry.savedAt,
    sourceUpdatedAt: entry.sourceUpdatedAt,
    savedById: entry.savedById || null,
    savedByName: entry.savedByName || '',
    content: entry.content || null
  }));
}

function createVersionId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function isDraftAuthorColumnError(error) {
  return error?.code === 'ER_BAD_FIELD_ERROR' && /saved_by/i.test(String(error?.message || ''));
}

async function findDocumentRecord(type, profileSlug) {
  const pool = getDatabasePool();
  const [rows] = await pool.query(
    `
      SELECT d.id, d.updated_at
      FROM documents d
      INNER JOIN profiles p ON p.id = d.profile_id
      WHERE p.slug = :profileSlug
        AND p.status = 'active'
        AND d.type = :type
        AND d.slug = :documentSlug
      LIMIT 1
    `,
    {
      profileSlug,
      type: documentTypeForDatabase(type),
      documentSlug: documentSlugForType(type)
    }
  );

  return rows[0] || null;
}

async function readDatabaseDraft(type, slug) {
  const document = await findDocumentRecord(type, slug);
  if (!document) return { draft: null, history: [] };

  const pool = getDatabasePool();
  try {
    const [[draftRow], [historyRows]] = await Promise.all([
      pool.query(
        `
          SELECT d.version_id, d.content_json, d.source_updated_at, d.saved_at, d.saved_by, u.name AS saved_by_name
          FROM document_drafts d
          LEFT JOIN users u ON u.id = d.saved_by
          WHERE d.document_id = ?
          LIMIT 1
        `,
        [document.id]
      ),
      pool.query(
        `
          SELECT dv.version_id, dv.content_json, dv.source_updated_at, dv.saved_at, dv.saved_by, u.name AS saved_by_name
          FROM document_draft_versions dv
          LEFT JOIN users u ON u.id = dv.saved_by
          WHERE dv.document_id = ?
          ORDER BY dv.saved_at DESC, dv.id DESC
          LIMIT 25
        `,
        [document.id]
      )
    ]);

    return {
      draft: draftRow
        ? {
            type,
            slug,
            content: typeof draftRow.content_json === 'string' ? JSON.parse(draftRow.content_json) : draftRow.content_json,
            sourceUpdatedAt: draftRow.source_updated_at,
            savedAt: draftRow.saved_at,
            versionId: draftRow.version_id,
            savedById: draftRow.saved_by || null,
            savedByName: draftRow.saved_by_name || ''
          }
        : null,
      history: normalizeHistory(
        historyRows.map(row => ({
          versionId: row.version_id,
          savedAt: row.saved_at,
          sourceUpdatedAt: row.source_updated_at,
          savedById: row.saved_by || null,
          savedByName: row.saved_by_name || '',
          content: typeof row.content_json === 'string' ? JSON.parse(row.content_json) : row.content_json
        }))
      )
    };
  } catch (error) {
    if (!isDraftAuthorColumnError(error)) {
      throw error;
    }

    const [[draftRow], [historyRows]] = await Promise.all([
      pool.query(
        `
          SELECT version_id, content_json, source_updated_at, saved_at
          FROM document_drafts
          WHERE document_id = ?
          LIMIT 1
        `,
        [document.id]
      ),
      pool.query(
        `
          SELECT version_id, content_json, source_updated_at, saved_at
          FROM document_draft_versions
          WHERE document_id = ?
          ORDER BY saved_at DESC, id DESC
          LIMIT 25
        `,
        [document.id]
      )
    ]);

    return {
      draft: draftRow
        ? {
            type,
            slug,
            content: typeof draftRow.content_json === 'string' ? JSON.parse(draftRow.content_json) : draftRow.content_json,
            sourceUpdatedAt: draftRow.source_updated_at,
            savedAt: draftRow.saved_at,
            versionId: draftRow.version_id,
            savedById: null,
            savedByName: ''
          }
        : null,
      history: normalizeHistory(
        historyRows.map(row => ({
          versionId: row.version_id,
          savedAt: row.saved_at,
          sourceUpdatedAt: row.source_updated_at,
          savedById: null,
          savedByName: '',
          content: typeof row.content_json === 'string' ? JSON.parse(row.content_json) : row.content_json
        }))
      )
    };
  }
}

async function saveDatabaseDraft({ type, slug, content, sourceUpdatedAt = null, savedById = null }) {
  const document = await findDocumentRecord(type, slug);
  if (!document) return null;

  const pool = getDatabasePool();
  const connection = await pool.getConnection();
  const versionId = createVersionId();
  const savedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');

  try {
    await connection.beginTransaction();
    try {
      await connection.query(
        `
          INSERT INTO document_drafts (document_id, content_json, source_updated_at, saved_at, version_id, saved_by)
          VALUES (?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            content_json = VALUES(content_json),
            source_updated_at = VALUES(source_updated_at),
            saved_at = VALUES(saved_at),
            version_id = VALUES(version_id),
            saved_by = VALUES(saved_by)
        `,
        [document.id, JSON.stringify(content), sourceUpdatedAt, savedAt, versionId, savedById]
      );

      await connection.query(
        `
          INSERT INTO document_draft_versions (document_id, version_id, content_json, source_updated_at, saved_at, saved_by)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        [document.id, versionId, JSON.stringify(content), sourceUpdatedAt, savedAt, savedById]
      );
    } catch (error) {
      if (!isDraftAuthorColumnError(error)) {
        throw error;
      }

      await connection.query(
        `
          INSERT INTO document_drafts (document_id, content_json, source_updated_at, saved_at, version_id)
          VALUES (?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            content_json = VALUES(content_json),
            source_updated_at = VALUES(source_updated_at),
            saved_at = VALUES(saved_at),
            version_id = VALUES(version_id)
        `,
        [document.id, JSON.stringify(content), sourceUpdatedAt, savedAt, versionId]
      );

      await connection.query(
        `
          INSERT INTO document_draft_versions (document_id, version_id, content_json, source_updated_at, saved_at)
          VALUES (?, ?, ?, ?, ?)
        `,
        [document.id, versionId, JSON.stringify(content), sourceUpdatedAt, savedAt]
      );
    }

    await connection.query(
      `
        DELETE dv FROM document_draft_versions dv
        INNER JOIN (
          SELECT id
          FROM document_draft_versions
          WHERE document_id = ?
          ORDER BY saved_at DESC, id DESC
          LIMIT 18446744073709551615 OFFSET 25
        ) old_versions ON old_versions.id = dv.id
      `,
      [document.id]
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return readDatabaseDraft(type, slug);
}

async function restoreDatabaseDraft(type, slug, versionId, actorUserId = null) {
  const document = await findDocumentRecord(type, slug);
  if (!document) return { status: 'missing_document' };

  const pool = getDatabasePool();
  const [[historyRow]] = await pool.query(
    `
      SELECT content_json, source_updated_at
      FROM document_draft_versions
      WHERE document_id = ?
        AND version_id = ?
      LIMIT 1
    `,
    [document.id, versionId]
  );

  if (!historyRow) {
    return { status: 'missing_version' };
  }

  const content = typeof historyRow.content_json === 'string'
    ? JSON.parse(historyRow.content_json)
    : historyRow.content_json;

  return {
    status: 'restored',
    ...(await saveDatabaseDraft({
      type,
      slug,
      content,
      sourceUpdatedAt: historyRow.source_updated_at,
      savedById: actorUserId
    }))
  };
}

async function deleteDatabaseDraft(type, slug) {
  const document = await findDocumentRecord(type, slug);
  if (!document) return;

  const pool = getDatabasePool();
  await pool.query('DELETE FROM document_drafts WHERE document_id = ?', [document.id]);
  await pool.query('DELETE FROM document_draft_versions WHERE document_id = ?', [document.id]);
}

async function publishDatabaseDraft(type, slug, actorUserId = null) {
  const document = await findDocumentRecord(type, slug);
  if (!document) return null;

  const pool = getDatabasePool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [[draftRow]] = await connection.query(
      `
        SELECT content_json, saved_at, version_id
        FROM document_drafts
        WHERE document_id = ?
        LIMIT 1
      `,
      [document.id]
    );

    if (!draftRow) {
      await connection.rollback();
      return { status: 'missing_draft' };
    }

    const [[documentRow]] = await connection.query(
      `
        SELECT title, template
        FROM documents
        WHERE id = ?
        LIMIT 1
      `,
      [document.id]
    );

    const [[versionRow]] = await connection.query(
      `
        SELECT COALESCE(MAX(version_number), 0) + 1 AS next_version
        FROM document_versions
        WHERE document_id = ?
      `,
      [document.id]
    );

    const content = typeof draftRow.content_json === 'string'
      ? JSON.parse(draftRow.content_json)
      : draftRow.content_json;
    const nextTemplate = String(content?.template || documentRow.template || 'modern').trim() || 'modern';

    await connection.query(
      `
        INSERT INTO document_versions (document_id, version_number, title, template, content_json, change_note, changed_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        document.id,
        versionRow.next_version,
        documentRow.title,
        nextTemplate,
        JSON.stringify(content),
        `Published from draft ${draftRow.version_id}`,
        actorUserId
      ]
    );

    await connection.query(
      `
        UPDATE documents
        SET content_json = ?, template = ?, updated_by = ?, updated_at = NOW()
        WHERE id = ?
      `,
      [JSON.stringify(content), nextTemplate, actorUserId, document.id]
    );

    await connection.query('DELETE FROM document_drafts WHERE document_id = ?', [document.id]);

    await connection.commit();

    return {
      status: 'published',
      publishedAt: draftRow.saved_at
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function readDraftBundle(type, slug) {
  if (!isDatabaseEnabled()) {
    const draft = await readFileDraft(type, slug);
    const history = await readFileDraftHistory(type, slug);
    return {
      draft: draft ? {
        ...draft,
        savedById: draft.savedById || null,
        savedByName: draft.savedByName || ''
      } : null,
      history: normalizeHistory(history)
    };
  }

  return readDatabaseDraft(type, slug);
}

export async function saveDraftBundle({ type, slug, content, sourceUpdatedAt = null, savedById = null, savedByName = '' }) {
  if (!isDatabaseEnabled()) {
    const draft = await saveFileDraft({ type, slug, content, sourceUpdatedAt, savedById, savedByName });
    const history = await readFileDraftHistory(type, slug);
    return {
      draft: {
        ...draft,
        savedById: draft.savedById || null,
        savedByName: draft.savedByName || ''
      },
      history: normalizeHistory(history)
    };
  }

  return saveDatabaseDraft({ type, slug, content, sourceUpdatedAt, savedById });
}

export async function deleteDraftBundle(type, slug) {
  if (!isDatabaseEnabled()) {
    await deleteFileDraft(type, slug);
    return;
  }

  await deleteDatabaseDraft(type, slug);
}

export async function publishDraftBundle(type, slug, actorUserId = null) {
  if (!isDatabaseEnabled()) {
    return { status: 'unsupported' };
  }

  return publishDatabaseDraft(type, slug, actorUserId);
}

export async function restoreDraftBundle(type, slug, versionId, actorUserId = null, actorUserName = '') {
  if (!isDatabaseEnabled()) {
    const history = await readFileDraftHistory(type, slug);
    const entry = history.find(item => item.versionId === versionId);
    if (!entry?.content) {
      return { status: 'missing_version' };
    }

    return {
      status: 'restored',
      ...(await saveDraftBundle({
        type,
        slug,
        content: entry.content,
        sourceUpdatedAt: entry.sourceUpdatedAt || null,
        savedById: actorUserId,
        savedByName: actorUserName
      }))
    };
  }

  return restoreDatabaseDraft(type, slug, versionId, actorUserId);
}
