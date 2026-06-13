import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDatabasePool } from '../config/database.js';
import { coverLetters, profiles } from '../data/profiles.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const seedDir = path.resolve(__dirname, '..', 'data', 'seeds');
const isDryRun = process.argv.includes('--dry-run');
const defaultAdminEmail = process.env.ADMIN_EMAIL || '';
const defaultAdminPassword = process.env.ADMIN_PASSWORD || '';
const defaultAdminName = process.env.ADMIN_NAME || 'Household Admin';

const profileSeeds = [
  {
    profile: profiles.jareth,
    headline: 'Operations, Warehouse Logistics & Skilled Trades Professional',
    documents: [
      { type: 'resume', slug: 'resume', title: 'Professional Resume', meta: profiles.jareth },
      { type: 'cover_letter', slug: 'general', title: 'General Cover Letter', meta: coverLetters.jareth }
    ]
  },
  {
    profile: profiles.angel,
    headline: 'Construction, Logistics & Office Administration Professional',
    documents: [
      { type: 'resume', slug: 'resume', title: 'Professional Resume', meta: profiles.angel },
      { type: 'cover_letter', slug: 'general', title: 'General Cover Letter', meta: coverLetters.angel }
    ]
  }
];

async function readSeedJson(seedFile) {
  const raw = await fs.readFile(path.join(seedDir, seedFile), 'utf8');

  return JSON.parse(raw);
}

async function upsertProfile(connection, seed) {
  await connection.query(
    `
      INSERT INTO profiles (
        slug, display_name, headline, status,
        show_documents, show_portfolio, show_certifications, show_references
      )
      VALUES (:slug, :displayName, :headline, 'active', :showDocuments, :showPortfolio, :showCertifications, :showReferences)
      ON DUPLICATE KEY UPDATE
        display_name = VALUES(display_name),
        headline = VALUES(headline),
        show_documents = VALUES(show_documents),
        show_portfolio = VALUES(show_portfolio),
        show_certifications = VALUES(show_certifications),
        show_references = VALUES(show_references),
        status = VALUES(status)
    `,
    {
      slug: seed.profile.slug,
      displayName: seed.profile.name,
      headline: seed.headline,
      showDocuments: seed.profile.sectionVisibility?.documents ? 1 : 0,
      showPortfolio: seed.profile.sectionVisibility?.portfolio !== false ? 1 : 0,
      showCertifications: seed.profile.sectionVisibility?.certifications ? 1 : 0,
      showReferences: seed.profile.sectionVisibility?.references ? 1 : 0
    }
  );

  const [rows] = await connection.query('SELECT id FROM profiles WHERE slug = ?', [seed.profile.slug]);

  return rows[0].id;
}

async function upsertDocument(connection, profileId, documentSeed) {
  const content = await readSeedJson(documentSeed.meta.seedFile);

  await connection.query(
    `
      INSERT INTO documents (profile_id, type, slug, title, template, content_json, visibility)
      VALUES (:profileId, :type, :slug, :title, :template, :contentJson, 'private')
      ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        template = VALUES(template),
        content_json = VALUES(content_json)
    `,
    {
      profileId,
      type: documentSeed.type,
      slug: documentSeed.slug,
      title: documentSeed.title,
      template: documentSeed.meta.template,
      contentJson: JSON.stringify(content)
    }
  );
}

async function upsertAdminUser(connection) {
  if (!defaultAdminEmail || !defaultAdminPassword) {
    return null;
  }

  const passwordHash = await bcrypt.hash(defaultAdminPassword, 12);

  await connection.query(
    `
      INSERT INTO users (name, email, password_hash, role)
      VALUES (?, ?, ?, 'owner')
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        password_hash = VALUES(password_hash),
        role = VALUES(role)
    `,
    [defaultAdminName, defaultAdminEmail.trim().toLowerCase(), passwordHash]
  );

  const [rows] = await connection.query('SELECT id FROM users WHERE email = ?', [defaultAdminEmail.trim().toLowerCase()]);
  return rows[0]?.id || null;
}

async function upsertProfileOwnerRole(connection, userId, profileId) {
  if (!userId) return;

  await connection.query(
    `
      UPDATE profiles
      SET owner_user_id = ?
      WHERE id = ?
    `,
    [userId, profileId]
  );

  await connection.query(
    `
      INSERT INTO profile_user_roles (profile_id, user_id, role)
      VALUES (?, ?, 'owner')
      ON DUPLICATE KEY UPDATE role = VALUES(role)
    `,
    [profileId, userId]
  );
}

async function main() {
  if (isDryRun) {
    console.log('Seed profiles/documents:');
    for (const seed of profileSeeds) {
      console.log(`- ${seed.profile.slug}: ${seed.profile.name}`);
      seed.documents.forEach(document => console.log(`  - ${document.type}:${document.slug} from ${document.meta.seedFile}`));
    }
    console.log(defaultAdminEmail && defaultAdminPassword ? `- admin user: ${defaultAdminEmail}` : '- admin user: skipped (set ADMIN_EMAIL and ADMIN_PASSWORD)');
    return;
  }

  const pool = getDatabasePool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const seededAdminUserId = await upsertAdminUser(connection);

    for (const seed of profileSeeds) {
      const profileId = await upsertProfile(connection, seed);
      await upsertProfileOwnerRole(connection, seededAdminUserId, profileId);

      for (const documentSeed of seed.documents) {
        await upsertDocument(connection, profileId, documentSeed);
      }
    }

    await connection.commit();
    console.log(`Seeded ${profileSeeds.length} profile(s).`);
    if (seededAdminUserId) {
      console.log(`Seeded admin user ${defaultAdminEmail.trim().toLowerCase()}.`);
    } else {
      console.log('Skipped admin user seed. Set ADMIN_EMAIL and ADMIN_PASSWORD to create one.');
    }
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
