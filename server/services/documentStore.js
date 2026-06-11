import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { coverLetters, profiles, publicDocumentMeta } from '../data/profiles.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const seedDir = path.resolve(__dirname, '..', 'data', 'seeds');

const documentMaps = {
  resume: profiles,
  'cover-letter': coverLetters
};

export async function readSeedDocument(type, slug) {
  const map = documentMaps[type];
  const documentMeta = map?.[slug];

  if (!documentMeta) {
    return null;
  }

  const filePath = path.join(seedDir, documentMeta.seedFile);
  const raw = await fs.readFile(filePath, 'utf8');

  return {
    meta: publicDocumentMeta(documentMeta),
    content: JSON.parse(raw)
  };
}
