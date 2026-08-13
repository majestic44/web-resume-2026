import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const draftsRootDir = path.resolve(__dirname, '..', 'data', 'drafts');
const historyLimit = 25;

function typeDirectory(type) {
  return type.replace(/[^a-z0-9_-]/gi, '-');
}

function draftDirectory(type) {
  return path.join(draftsRootDir, typeDirectory(type));
}

function draftFilePath(type, slug) {
  return path.join(draftDirectory(type), `${slug}.json`);
}

function historyFilePath(type, slug) {
  return path.join(draftDirectory(type), `${slug}.history.json`);
}

async function ensureDraftDirectory(type) {
  await fs.mkdir(draftDirectory(type), { recursive: true });
}

async function readJsonFile(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }

    throw error;
  }
}

function createVersionId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function readDraft(type, slug) {
  return readJsonFile(draftFilePath(type, slug));
}

export async function readDraftHistory(type, slug) {
  const history = await readJsonFile(historyFilePath(type, slug));
  return Array.isArray(history) ? history : [];
}

export async function saveDraft({ type, slug, content, sourceUpdatedAt = null, savedById = null, savedByName = '' }) {
  await ensureDraftDirectory(type);

  const now = new Date().toISOString();
  const nextDraft = {
    type,
    slug,
    content,
    sourceUpdatedAt,
    savedAt: now,
    versionId: createVersionId(),
    savedById,
    savedByName: String(savedByName || '').trim()
  };

  await fs.writeFile(draftFilePath(type, slug), JSON.stringify(nextDraft, null, 2));

  const history = await readDraftHistory(type, slug);
  const nextHistory = [
    {
      versionId: nextDraft.versionId,
      savedAt: nextDraft.savedAt,
      sourceUpdatedAt: nextDraft.sourceUpdatedAt,
      content,
      savedById: nextDraft.savedById,
      savedByName: nextDraft.savedByName
    },
    ...history
  ].slice(0, historyLimit);

  await fs.writeFile(historyFilePath(type, slug), JSON.stringify(nextHistory, null, 2));

  return nextDraft;
}

export async function deleteDraft(type, slug) {
  const files = [draftFilePath(type, slug), historyFilePath(type, slug)];

  await Promise.all(
    files.map(async filePath => {
      try {
        await fs.unlink(filePath);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }
    })
  );
}

