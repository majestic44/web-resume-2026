import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { fileURLToPath } from 'node:url';
import { getDataSource } from '../config/app.js';
import { getDatabasePool } from '../config/database.js';
import { destroySession, requireDraftEditor, requireInternalProfileAccess, requireInternalUser, requireMemberManager, sessionCookieName } from '../middleware/auth.js';
import { createMemberAccount, listMembers, updateMemberAccount } from '../repositories/adminRepository.js';
import { authenticateUser, createUserSession } from '../repositories/authRepository.js';
import {
  createCertification,
  deleteCertification,
  listManagedCertifications,
  updateCertification
} from '../repositories/certificationRepository.js';
import { listProfiles, listProfilesForUser, readDocument } from '../repositories/documentRepository.js';
import { createProfileMedia, deleteProfileMedia, listProfileMedia, replaceProfileMedia } from '../repositories/mediaRepository.js';
import {
  createPortfolioItem,
  deletePortfolioItem,
  listManagedPortfolio,
  readPublicProfile,
  updatePortfolioItem
} from '../repositories/portfolioRepository.js';
import {
  createReference,
  deleteReference,
  listManagedReferences,
  updateReference
} from '../repositories/referenceRepository.js';
import { deleteDraftBundle, publishDraftBundle, readDraftBundle, restoreDraftBundle, saveDraftBundle } from '../repositories/draftRepository.js';
import { createProfile, listManagedProfiles, updateProfile } from '../repositories/profileRepository.js';
import { canEditProfile } from '../repositories/authRepository.js';
import {
  createOrRotateResumeQrLink,
  createOrRotateResumeShareLink,
  createOrRotateProfileShareLink,
  disableResumeQrLink,
  findShareLinkProfile,
  readProfileShareLink,
  readResumeQrLink,
  readResumeShareLink,
  resolveResumeQrLink,
  resolveResumeQrProfile,
  resolveSharedProfile,
  resolveSharedProfileReferences,
  resolveSharedProfileResume,
  resolveSharedResume,
  revokeProfileShareLink,
  revokeResumeShareLink
} from '../repositories/shareLinkRepository.js';
import { serializeCookie } from '../services/cookieStore.js';

export const apiRouter = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadTempDir = path.resolve(__dirname, '..', '..', '.tmp', 'uploads');
fs.mkdirSync(uploadTempDir, { recursive: true });

const uploadStorage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadTempDir);
  },
  filename(req, file, cb) {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const originalExtension = path.extname(String(file.originalname || '')).toLowerCase();
    cb(null, `upload-${uniqueSuffix}${originalExtension.slice(0, 12)}`);
  }
});

const upload = multer({
  storage: uploadStorage,
  limits: {
    fileSize: 8 * 1024 * 1024
  }
});

function isMissingSchemaError(error) {
  return ['ER_NO_SUCH_TABLE', 'ER_BAD_FIELD_ERROR'].includes(error?.code);
}

function respondIfMissingSchema(error, res, message) {
  if (!isMissingSchemaError(error)) {
    return false;
  }

  res.status(503).json({
    error: message
  });
  return true;
}

function shareUrlForRequest(req, token, { qr = false } = {}) {
  const configuredBaseUrl = String(process.env.APP_PUBLIC_URL || '').trim().replace(/\/$/, '');
  const baseUrl = configuredBaseUrl || `${req.protocol}://${req.get('host')}`;
  return `${baseUrl}/shared/resume/${qr ? 'qr/' : ''}${token}`;
}

function profileShareUrlForRequest(req, token, { qr = false } = {}) {
  const configuredBaseUrl = String(process.env.APP_PUBLIC_URL || '').trim().replace(/\/$/, '');
  const baseUrl = configuredBaseUrl || `${req.protocol}://${req.get('host')}`;
  return `${baseUrl}/shared/profile/${qr ? 'qr/' : ''}${token}`;
}

async function requireShareLinkManager(req, res, next) {
  try {
    if (getDataSource() !== 'database') {
      res.status(400).json({ error: 'Resume sharing requires DATA_SOURCE=database.' });
      return;
    }

    if (!req.currentUser) {
      res.status(403).json({ error: 'You do not have permission to manage resume sharing.' });
      return;
    }

    const profile = await findShareLinkProfile(req.params.profileId);
    if (!profile) {
      res.status(404).json({ error: 'Profile not found.' });
      return;
    }

    if (!canEditProfile(req.currentUser, profile.slug)) {
      res.status(403).json({ error: 'You do not have permission to manage resume sharing for this profile.' });
      return;
    }

    req.shareLinkProfile = profile;
    next();
  } catch (error) {
    if (error.message === 'A valid profile id is required.') {
      res.status(400).json({ error: error.message });
      return;
    }

    next(error);
  }
}

function registerDraftRoutes(type) {
  apiRouter.get(`/drafts/${type}/:slug`, requireInternalProfileAccess, async (req, res, next) => {
    try {
      const sourceDocument = await readDocument(type, req.params.slug);

      if (!sourceDocument) {
        res.status(404).json({ error: 'Source document not found' });
        return;
      }

      res.json(await readDraftBundle(type, req.params.slug));
    } catch (error) {
      next(error);
    }
  });

  apiRouter.post(`/drafts/${type}/:slug`, requireDraftEditor, async (req, res, next) => {
    try {
      const sourceDocument = await readDocument(type, req.params.slug);

      if (!sourceDocument) {
        res.status(404).json({ error: 'Source document not found' });
        return;
      }

      const content = req.body?.content;

      if (!content || typeof content !== 'object' || Array.isArray(content)) {
        res.status(400).json({ error: 'Draft content must be a JSON object' });
        return;
      }

      const bundle = await saveDraftBundle({
        type,
        slug: req.params.slug,
        content,
        sourceUpdatedAt: sourceDocument.meta?.updatedAt || null,
        savedById: req.currentUser?.id || null,
        savedByName: req.currentUser?.name || ''
      });

      res.status(201).json(bundle);
    } catch (error) {
      next(error);
    }
  });

  apiRouter.delete(`/drafts/${type}/:slug`, requireDraftEditor, async (req, res, next) => {
    try {
      await deleteDraftBundle(type, req.params.slug);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  apiRouter.post(`/drafts/${type}/:slug/publish`, requireDraftEditor, async (req, res, next) => {
    try {
      if (getDataSource() !== 'database') {
        res.status(400).json({ error: 'Publishing drafts requires DATA_SOURCE=database.' });
        return;
      }

      const sourceDocument = await readDocument(type, req.params.slug);
      if (!sourceDocument) {
        res.status(404).json({ error: 'Source document not found' });
        return;
      }

      const publishResult = await publishDraftBundle(type, req.params.slug, req.currentUser?.id || null);

      if (publishResult?.status === 'missing_draft') {
        res.status(400).json({ error: 'There is no saved draft to publish.' });
        return;
      }

      const [document, draftBundle] = await Promise.all([
        readDocument(type, req.params.slug),
        readDraftBundle(type, req.params.slug)
      ]);

      res.json({
        document,
        draft: draftBundle.draft,
        history: draftBundle.history || [],
        publishedAt: publishResult?.publishedAt || new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  });

  apiRouter.post(`/drafts/${type}/:slug/restore/:versionId`, requireDraftEditor, async (req, res, next) => {
    try {
      const sourceDocument = await readDocument(type, req.params.slug);

      if (!sourceDocument) {
        res.status(404).json({ error: 'Source document not found' });
        return;
      }

      const bundle = await restoreDraftBundle(
        type,
        req.params.slug,
        req.params.versionId,
        req.currentUser?.id || null,
        req.currentUser?.name || ''
      );

      if (bundle?.status === 'missing_version') {
        res.status(404).json({ error: 'Draft history version not found.' });
        return;
      }

      if (bundle?.status === 'missing_document') {
        res.status(404).json({ error: 'Source document not found' });
        return;
      }

      res.json(bundle);
    } catch (error) {
      next(error);
    }
  });
}

apiRouter.get('/health', async (req, res) => {
  const health = {
    ok: true,
    app: 'web-resume-2026',
    dataSource: getDataSource(),
    database: 'not_checked'
  };

  if (req.query.database === '1') {
    try {
      const pool = getDatabasePool();
      await pool.query('SELECT 1');
      health.database = 'ok';
    } catch (error) {
      health.ok = false;
      health.database = 'error';
      health.error = error.message;
    }
  }

  res.status(health.ok ? 200 : 503).json(health);
});

apiRouter.get('/profiles', (req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

apiRouter.get('/internal/profiles', requireInternalUser, async (req, res, next) => {
  try {
    res.json({ profiles: await listProfilesForUser(req.currentUser) });
  } catch (error) {
    next(error);
  }
});

apiRouter.get('/internal/profiles/:slug', requireInternalProfileAccess, async (req, res, next) => {
  try {
    const profile = await readPublicProfile(req.params.slug);

    if (!profile) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    res.json(profile);
  } catch (error) {
    if (respondIfMissingSchema(error, res, 'Public profile tables are not available yet. Run `npm.cmd run db:migrate` to apply the latest profile migrations.')) {
      return;
    }

    next(error);
  }
});

apiRouter.get('/auth/me', async (req, res) => {
  res.json({
    dataSource: getDataSource(),
    user: req.currentUser || null
  });
});

apiRouter.get('/shared/resume/qr/:token', async (req, res, next) => {
  try {
    res.set({
      'Cache-Control': 'no-store, private',
      'Referrer-Policy': 'no-referrer'
    });

    const document = await resolveResumeQrLink(req.params.token);

    if (!document) {
      res.status(404).json({ error: 'Shared resume QR link not found.' });
      return;
    }

    res.json(document);
  } catch (error) {
    if (respondIfMissingSchema(
      error,
      res,
      'Resume QR links are not available yet. Run `npm.cmd run db:migrate` to apply the latest QR migration.'
    )) {
      return;
    }

    next(error);
  }
});

apiRouter.get('/shared/resume/:token', async (req, res, next) => {
  try {
    res.set({
      'Cache-Control': 'no-store, private',
      'Referrer-Policy': 'no-referrer'
    });

    const document = await resolveSharedResume(req.params.token);

    if (!document) {
      res.status(404).json({ error: 'Shared resume not found.' });
      return;
    }

    res.json(document);
  } catch (error) {
    if (respondIfMissingSchema(error, res, 'Shared resume links are not available yet. Run `npm.cmd run db:migrate` to apply the latest sharing migration.')) {
      return;
    }

    next(error);
  }
});

apiRouter.get('/shared/profile/:token', async (req, res, next) => {
  try {
    res.set({ 'Cache-Control': 'no-store, private', 'Referrer-Policy': 'no-referrer' });
    const profile = await resolveSharedProfile(req.params.token);
    if (!profile) {
      res.status(404).json({ error: 'Shared profile not found.' });
      return;
    }

    res.json(profile);
  } catch (error) {
    if (respondIfMissingSchema(error, res, 'Shared profile links are not available yet. Run `npm.cmd run db:migrate` to apply the latest sharing migration.')) return;
    next(error);
  }
});

apiRouter.get('/shared/profile/qr/:token', async (req, res, next) => {
  try {
    res.set({ 'Cache-Control': 'no-store, private', 'Referrer-Policy': 'no-referrer' });
    const profile = await resolveResumeQrProfile(req.params.token);
    if (!profile) {
      res.status(404).json({ error: 'Shared profile QR link not found.' });
      return;
    }

    res.json(profile);
  } catch (error) {
    if (respondIfMissingSchema(error, res, 'Resume QR links are not available yet. Run `npm.cmd run db:migrate` to apply the latest QR migration.')) return;
    next(error);
  }
});

apiRouter.get('/shared/profile/:token/resume', async (req, res, next) => {
  try {
    res.set({ 'Cache-Control': 'no-store, private', 'Referrer-Policy': 'no-referrer' });
    const document = await resolveSharedProfileResume(req.params.token);
    if (!document) {
      res.status(404).json({ error: 'Shared profile not found.' });
      return;
    }

    res.json(document);
  } catch (error) {
    if (respondIfMissingSchema(error, res, 'Shared profile links are not available yet. Run `npm.cmd run db:migrate` to apply the latest sharing migration.')) return;
    next(error);
  }
});

apiRouter.get('/shared/profile/qr/:token/resume', async (req, res, next) => {
  try {
    res.set({ 'Cache-Control': 'no-store, private', 'Referrer-Policy': 'no-referrer' });
    const document = await resolveResumeQrLink(req.params.token);
    if (!document) {
      res.status(404).json({ error: 'Shared profile QR link not found.' });
      return;
    }

    res.json(document);
  } catch (error) {
    if (respondIfMissingSchema(error, res, 'Resume QR links are not available yet. Run `npm.cmd run db:migrate` to apply the latest QR migration.')) return;
    next(error);
  }
});

apiRouter.post('/shared/profile/:token/references', async (req, res, next) => {
  try {
    res.set({ 'Cache-Control': 'no-store, private', 'Referrer-Policy': 'no-referrer' });
    const result = await resolveSharedProfileReferences(req.params.token, req.body?.password);
    if (!result) {
      res.status(404).json({ error: 'Shared profile not found.' });
      return;
    }
    if (result.status === 'hidden') {
      res.status(404).json({ error: 'Shared profile not found.' });
      return;
    }
    if (result.status === 'invalid_password') {
      res.status(401).json({ error: 'The reference password is incorrect.' });
      return;
    }

    res.json({ references: result.references });
  } catch (error) {
    if (respondIfMissingSchema(error, res, 'Shared profile links are not available yet. Run `npm.cmd run db:migrate` to apply the latest sharing migration.')) return;
    next(error);
  }
});

apiRouter.post('/auth/login', async (req, res, next) => {
  try {
    if (getDataSource() !== 'database') {
      res.status(400).json({ error: 'Login is only enabled when DATA_SOURCE=database.' });
      return;
    }

    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const user = await authenticateUser(email, password);
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const session = await createUserSession(user.id);
    res.setHeader('Set-Cookie', serializeCookie(sessionCookieName, session.token, {
      path: '/',
      sameSite: 'Lax',
      httpOnly: true,
      secure: process.env.APP_ENV === 'production',
      maxAge: Number(process.env.SESSION_DURATION_SECONDS || 1209600),
      expires: session.expiresAt
    }));

    res.status(201).json({ user });
  } catch (error) {
    next(error);
  }
});

apiRouter.post('/auth/logout', async (req, res, next) => {
  try {
    await destroySession(req, res);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

apiRouter.get('/admin/members', requireMemberManager, async (req, res, next) => {
  try {
    const [members, profiles] = await Promise.all([listMembers(), listProfiles()]);
    res.json({ members, profiles });
  } catch (error) {
    next(error);
  }
});

apiRouter.get('/admin/profiles', requireMemberManager, async (req, res, next) => {
  try {
    res.json({ profiles: await listManagedProfiles() });
  } catch (error) {
    next(error);
  }
});

apiRouter.get('/admin/profiles/:profileId/share-link', requireShareLinkManager, async (req, res, next) => {
  try {
    const share = await readResumeShareLink(req.shareLinkProfile.id);
    res.json({ link: share?.link || null });
  } catch (error) {
    if (respondIfMissingSchema(error, res, 'Resume sharing tables are not available yet. Run `npm.cmd run db:migrate` to apply the latest sharing migration.')) {
      return;
    }

    next(error);
  }
});

apiRouter.post('/admin/profiles/:profileId/share-link', requireShareLinkManager, async (req, res, next) => {
  try {
    const share = await createOrRotateResumeShareLink(req.shareLinkProfile.id, req.currentUser?.id || null);
    if (!share) {
      res.status(404).json({ error: 'Profile not found.' });
      return;
    }

    res.status(201).json({
      link: share.link,
      shareUrl: shareUrlForRequest(req, share.token)
    });
  } catch (error) {
    if (respondIfMissingSchema(error, res, 'Resume sharing tables are not available yet. Run `npm.cmd run db:migrate` to apply the latest sharing migration.')) {
      return;
    }

    next(error);
  }
});

apiRouter.delete('/admin/profiles/:profileId/share-link', requireShareLinkManager, async (req, res, next) => {
  try {
    await revokeResumeShareLink(req.shareLinkProfile.id);
    res.status(204).end();
  } catch (error) {
    if (respondIfMissingSchema(error, res, 'Resume sharing tables are not available yet. Run `npm.cmd run db:migrate` to apply the latest sharing migration.')) {
      return;
    }

    next(error);
  }
});

apiRouter.get('/admin/profiles/:profileId/profile-share-link', requireShareLinkManager, async (req, res, next) => {
  try {
    const share = await readProfileShareLink(req.shareLinkProfile.id);
    res.json({ link: share?.link || null });
  } catch (error) {
    if (respondIfMissingSchema(error, res, 'Profile sharing tables are not available yet. Run `npm.cmd run db:migrate` to apply the latest sharing migration.')) return;
    next(error);
  }
});

apiRouter.post('/admin/profiles/:profileId/profile-share-link', requireShareLinkManager, async (req, res, next) => {
  try {
    const share = await createOrRotateProfileShareLink(req.shareLinkProfile.id, req.body?.referencesPassword, req.currentUser?.id || null);
    if (!share) {
      res.status(404).json({ error: 'Profile not found.' });
      return;
    }

    res.status(201).json({ link: share.link, shareUrl: profileShareUrlForRequest(req, share.token) });
  } catch (error) {
    if (respondIfMissingSchema(error, res, 'Profile sharing tables are not available yet. Run `npm.cmd run db:migrate` to apply the latest sharing migration.')) return;
    if (error.message === 'Choose a reference password with at least 12 characters.') {
      res.status(400).json({ error: error.message });
      return;
    }
    next(error);
  }
});

apiRouter.delete('/admin/profiles/:profileId/profile-share-link', requireShareLinkManager, async (req, res, next) => {
  try {
    await revokeProfileShareLink(req.shareLinkProfile.id);
    res.status(204).end();
  } catch (error) {
    if (respondIfMissingSchema(error, res, 'Profile sharing tables are not available yet. Run `npm.cmd run db:migrate` to apply the latest sharing migration.')) return;
    next(error);
  }
});

apiRouter.get('/admin/profiles/:profileId/resume-qr', requireShareLinkManager, async (req, res, next) => {
  try {
    const link = await readResumeQrLink(req.shareLinkProfile.id);

    res.json({
      link: link?.link || null
    });
  } catch (error) {
    if (respondIfMissingSchema(
      error,
      res,
      'Resume QR link tables are not available yet. Run `npm.cmd run db:migrate` to apply the latest QR migration.'
    )) {
      return;
    }

    next(error);
  }
});

apiRouter.post('/admin/profiles/:profileId/resume-qr', requireShareLinkManager, async (req, res, next) => {
  try {
    const result = await createOrRotateResumeQrLink(
      req.shareLinkProfile.id,
      req.currentUser?.id || null
    );

    if (!result) {
      res.status(404).json({ error: 'Profile not found.' });
      return;
    }

    res.status(201).json({
      link: result.link,
      shareUrl: profileShareUrlForRequest(req, result.token, { qr: true })
    });
  } catch (error) {
    if (respondIfMissingSchema(
      error,
      res,
      'Resume QR link tables are not available yet. Run `npm.cmd run db:migrate` to apply the latest QR migration.'
    )) {
      return;
    }

    next(error);
  }
});

apiRouter.delete('/admin/profiles/:profileId/resume-qr', requireShareLinkManager, async (req, res, next) => {
  try {
    const result = await disableResumeQrLink(req.shareLinkProfile.id);

    if (!result) {
      res.status(404).json({ error: 'Profile not found.' });
      return;
    }

    res.status(204).end();
  } catch (error) {
    if (respondIfMissingSchema(
      error,
      res,
      'Resume QR link tables are not available yet. Run `npm.cmd run db:migrate` to apply the latest QR migration.'
    )) {
      return;
    }

    next(error);
  }
});

apiRouter.post('/admin/profiles', requireMemberManager, async (req, res, next) => {
  try {
    const profile = await createProfile({
      displayName: req.body?.displayName,
      slug: req.body?.slug,
      headline: req.body?.headline,
      template: req.body?.template,
      sectionVisibility: req.body?.sectionVisibility
    }, req.currentUser?.id || null);

    res.status(201).json({ profile });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: 'That profile slug is already in use.' });
      return;
    }

    if (error.message === 'Display name, slug, and headline are required.') {
      res.status(400).json({ error: error.message });
      return;
    }

    next(error);
  }
});

apiRouter.patch('/admin/profiles/:profileId', requireMemberManager, async (req, res, next) => {
  try {
    const profileId = Number(req.params.profileId);
    if (!Number.isInteger(profileId) || profileId <= 0) {
      res.status(400).json({ error: 'A valid profile id is required.' });
      return;
    }

    const profile = await updateProfile(profileId, {
      displayName: req.body?.displayName,
      slug: req.body?.slug,
      headline: req.body?.headline,
      template: req.body?.template,
      status: req.body?.status,
      sectionVisibility: req.body?.sectionVisibility
    }, req.currentUser?.id || null);

    if (!profile) {
      res.status(404).json({ error: 'Profile not found.' });
      return;
    }

    res.json({ profile });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: 'That profile slug is already in use.' });
      return;
    }

    if (['Display name, slug, and headline are required.', 'A valid profile id is required.'].includes(error.message)) {
      res.status(400).json({ error: error.message });
      return;
    }

    next(error);
  }
});

apiRouter.post('/admin/members', requireMemberManager, async (req, res, next) => {
  try {
    const member = await createMemberAccount({
      name: req.body?.name,
      email: req.body?.email,
      password: req.body?.password,
      role: req.body?.role
    });

    res.status(201).json({ member });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: 'A member with that email already exists.' });
      return;
    }

    if (error.message === 'Name, email, and password are required.') {
      res.status(400).json({ error: error.message });
      return;
    }

    next(error);
  }
});

apiRouter.patch('/admin/members/:memberId', requireMemberManager, async (req, res, next) => {
  try {
    const memberId = Number(req.params.memberId);
    if (!Number.isInteger(memberId) || memberId <= 0) {
      res.status(400).json({ error: 'A valid member id is required.' });
      return;
    }

    if (req.currentUser?.id === memberId) {
      res.status(400).json({ error: 'Use another admin account to change your own access.' });
      return;
    }

    const member = await updateMemberAccount(memberId, {
      role: req.body?.role,
      editableProfiles: req.body?.editableProfiles
    });

    if (!member) {
      res.status(404).json({ error: 'Member not found.' });
      return;
    }

    res.json({ member });
  } catch (error) {
    if (error.message === 'A valid role is required.') {
      res.status(400).json({ error: error.message });
      return;
    }

    next(error);
  }
});

async function sendInternalDocument(req, res, next) {
  try {
    const document = await readDocument(req.params.type, req.params.slug);

    if (!document) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    res.json(document);
  } catch (error) {
    next(error);
  }
}

apiRouter.get('/internal/documents/:type/:slug', requireInternalProfileAccess, sendInternalDocument);
// Retire the former anonymous slug endpoint; public access must use a share token.
apiRouter.get('/documents/:type/:slug', (req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

apiRouter.get('/admin/profiles/:slug/portfolio', requireDraftEditor, async (req, res, next) => {
  try {
    res.json({ items: await listManagedPortfolio(req.params.slug) });
  } catch (error) {
    if (respondIfMissingSchema(error, res, 'Portfolio database tables are not available yet. Run `npm.cmd run db:migrate` to apply the latest portfolio migration.')) {
      return;
    }

    if (error.message === 'Portfolio item management requires DATA_SOURCE=database.') {
      res.status(400).json({ error: error.message });
      return;
    }

    next(error);
  }
});

apiRouter.get('/admin/profiles/:slug/certifications', requireDraftEditor, async (req, res, next) => {
  try {
    res.json({ items: await listManagedCertifications(req.params.slug) });
  } catch (error) {
    if (respondIfMissingSchema(error, res, 'Certification tables are not available yet. Run `npm.cmd run db:migrate` to apply the latest certification migration.')) {
      return;
    }

    if (error.message === 'Certification management requires DATA_SOURCE=database.') {
      res.status(400).json({ error: error.message });
      return;
    }

    next(error);
  }
});

apiRouter.post('/admin/profiles/:slug/certifications', requireDraftEditor, async (req, res, next) => {
  try {
    const item = await createCertification(req.params.slug, req.body || {}, req.currentUser?.id || null);

    if (!item) {
      res.status(404).json({ error: 'Profile not found.' });
      return;
    }

    res.status(201).json({ item });
  } catch (error) {
    if (respondIfMissingSchema(error, res, 'Certification tables are not available yet. Run `npm.cmd run db:migrate` to apply the latest certification migration.')) {
      return;
    }

    if (['Certification management requires DATA_SOURCE=database.', 'Certification title and issuer are required.'].includes(error.message)) {
      res.status(400).json({ error: error.message });
      return;
    }

    next(error);
  }
});

apiRouter.patch('/admin/profiles/:slug/certifications/:certificationId', requireDraftEditor, async (req, res, next) => {
  try {
    const item = await updateCertification(req.params.slug, req.params.certificationId, req.body || {}, req.currentUser?.id || null);

    if (!item) {
      res.status(404).json({ error: 'Certification not found.' });
      return;
    }

    res.json({ item });
  } catch (error) {
    if (respondIfMissingSchema(error, res, 'Certification tables are not available yet. Run `npm.cmd run db:migrate` to apply the latest certification migration.')) {
      return;
    }

    if ([
      'Certification management requires DATA_SOURCE=database.',
      'Certification title and issuer are required.',
      'A valid certification id is required.'
    ].includes(error.message)) {
      res.status(400).json({ error: error.message });
      return;
    }

    next(error);
  }
});

apiRouter.delete('/admin/profiles/:slug/certifications/:certificationId', requireDraftEditor, async (req, res, next) => {
  try {
    const deleted = await deleteCertification(req.params.slug, req.params.certificationId);

    if (!deleted) {
      res.status(404).json({ error: 'Certification not found.' });
      return;
    }

    res.status(204).end();
  } catch (error) {
    if (respondIfMissingSchema(error, res, 'Certification tables are not available yet. Run `npm.cmd run db:migrate` to apply the latest certification migration.')) {
      return;
    }

    if (['Certification management requires DATA_SOURCE=database.', 'A valid certification id is required.'].includes(error.message)) {
      res.status(400).json({ error: error.message });
      return;
    }

    next(error);
  }
});

apiRouter.get('/admin/profiles/:slug/references', requireDraftEditor, async (req, res, next) => {
  try {
    res.json({ items: await listManagedReferences(req.params.slug) });
  } catch (error) {
    if (respondIfMissingSchema(error, res, 'Reference tables are not available yet. Run `npm.cmd run db:migrate` to apply the latest reference migration.')) {
      return;
    }

    if (error.message === 'Reference management requires DATA_SOURCE=database.') {
      res.status(400).json({ error: error.message });
      return;
    }

    next(error);
  }
});

apiRouter.post('/admin/profiles/:slug/references', requireDraftEditor, async (req, res, next) => {
  try {
    const item = await createReference(req.params.slug, req.body || {}, req.currentUser?.id || null);

    if (!item) {
      res.status(404).json({ error: 'Profile not found.' });
      return;
    }

    res.status(201).json({ item });
  } catch (error) {
    if (respondIfMissingSchema(error, res, 'Reference tables are not available yet. Run `npm.cmd run db:migrate` to apply the latest reference migration.')) {
      return;
    }

    if (['Reference management requires DATA_SOURCE=database.', 'Reference name is required.'].includes(error.message)) {
      res.status(400).json({ error: error.message });
      return;
    }

    next(error);
  }
});

apiRouter.patch('/admin/profiles/:slug/references/:referenceId', requireDraftEditor, async (req, res, next) => {
  try {
    const item = await updateReference(req.params.slug, req.params.referenceId, req.body || {}, req.currentUser?.id || null);

    if (!item) {
      res.status(404).json({ error: 'Reference not found.' });
      return;
    }

    res.json({ item });
  } catch (error) {
    if (respondIfMissingSchema(error, res, 'Reference tables are not available yet. Run `npm.cmd run db:migrate` to apply the latest reference migration.')) {
      return;
    }

    if ([
      'Reference management requires DATA_SOURCE=database.',
      'Reference name is required.',
      'A valid reference id is required.'
    ].includes(error.message)) {
      res.status(400).json({ error: error.message });
      return;
    }

    next(error);
  }
});

apiRouter.delete('/admin/profiles/:slug/references/:referenceId', requireDraftEditor, async (req, res, next) => {
  try {
    const deleted = await deleteReference(req.params.slug, req.params.referenceId);

    if (!deleted) {
      res.status(404).json({ error: 'Reference not found.' });
      return;
    }

    res.status(204).end();
  } catch (error) {
    if (respondIfMissingSchema(error, res, 'Reference tables are not available yet. Run `npm.cmd run db:migrate` to apply the latest reference migration.')) {
      return;
    }

    if (['Reference management requires DATA_SOURCE=database.', 'A valid reference id is required.'].includes(error.message)) {
      res.status(400).json({ error: error.message });
      return;
    }

    next(error);
  }
});

apiRouter.post('/admin/profiles/:slug/portfolio', requireDraftEditor, async (req, res, next) => {
  try {
    const item = await createPortfolioItem(req.params.slug, req.body || {}, req.currentUser?.id || null);

    if (!item) {
      res.status(404).json({ error: 'Profile not found.' });
      return;
    }

    res.status(201).json({ item });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: 'That portfolio slug is already in use for this profile.' });
      return;
    }

    if (respondIfMissingSchema(error, res, 'Portfolio database tables are not available yet. Run `npm.cmd run db:migrate` to apply the latest portfolio migration.')) {
      return;
    }

    if (['Portfolio item management requires DATA_SOURCE=database.', 'Portfolio title is required.', 'Portfolio slug is required.'].includes(error.message)) {
      res.status(400).json({ error: error.message });
      return;
    }

    next(error);
  }
});

apiRouter.patch('/admin/profiles/:slug/portfolio/:itemId', requireDraftEditor, async (req, res, next) => {
  try {
    const item = await updatePortfolioItem(req.params.slug, req.params.itemId, req.body || {}, req.currentUser?.id || null);

    if (!item) {
      res.status(404).json({ error: 'Portfolio item not found.' });
      return;
    }

    res.json({ item });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: 'That portfolio slug is already in use for this profile.' });
      return;
    }

    if (respondIfMissingSchema(error, res, 'Portfolio database tables are not available yet. Run `npm.cmd run db:migrate` to apply the latest portfolio migration.')) {
      return;
    }

    if ([
      'Portfolio item management requires DATA_SOURCE=database.',
      'Portfolio title is required.',
      'Portfolio slug is required.',
      'A valid portfolio item id is required.'
    ].includes(error.message)) {
      res.status(400).json({ error: error.message });
      return;
    }

    next(error);
  }
});

apiRouter.delete('/admin/profiles/:slug/portfolio/:itemId', requireDraftEditor, async (req, res, next) => {
  try {
    const deleted = await deletePortfolioItem(req.params.slug, req.params.itemId);

    if (!deleted) {
      res.status(404).json({ error: 'Portfolio item not found.' });
      return;
    }

    res.status(204).end();
  } catch (error) {
    if (respondIfMissingSchema(error, res, 'Portfolio database tables are not available yet. Run `npm.cmd run db:migrate` to apply the latest portfolio migration.')) {
      return;
    }

    if (['Portfolio item management requires DATA_SOURCE=database.', 'A valid portfolio item id is required.'].includes(error.message)) {
      res.status(400).json({ error: error.message });
      return;
    }

    next(error);
  }
});

apiRouter.get('/admin/profiles/:slug/media', requireDraftEditor, async (req, res, next) => {
  try {
    res.json({ items: await listProfileMedia(req.params.slug) });
  } catch (error) {
    if (respondIfMissingSchema(error, res, 'Media library tables are not available yet. Run `npm.cmd run db:migrate` to apply the latest media-library migration.')) {
      return;
    }

    if (error.message === 'Media library management requires DATA_SOURCE=database.') {
      res.status(400).json({ error: error.message });
      return;
    }

    next(error);
  }
});

apiRouter.post('/admin/profiles/:slug/media', requireDraftEditor, upload.single('file'), async (req, res, next) => {
  try {
    const item = await createProfileMedia(req.params.slug, req.file, req.currentUser?.id || null);

    if (!item) {
      res.status(404).json({ error: 'Profile not found.' });
      return;
    }

    res.status(201).json({ item });
  } catch (error) {
    if (respondIfMissingSchema(error, res, 'Media library tables are not available yet. Run `npm.cmd run db:migrate` to apply the latest media-library migration.')) {
      return;
    }

    if ([
      'Media library management requires DATA_SOURCE=database.',
      'A file upload is required.',
      'Only image and PDF uploads are supported right now.'
    ].includes(error.message)) {
      res.status(400).json({ error: error.message });
      return;
    }

    next(error);
  }
});

apiRouter.post('/admin/profiles/:slug/media/:mediaId/replace', requireDraftEditor, upload.single('file'), async (req, res, next) => {
  try {
    const item = await replaceProfileMedia(req.params.slug, req.params.mediaId, req.file, req.currentUser?.id || null);

    if (!item) {
      res.status(404).json({ error: 'Media asset not found.' });
      return;
    }

    res.json({ item });
  } catch (error) {
    if (respondIfMissingSchema(error, res, 'Media library tables are not available yet. Run `npm.cmd run db:migrate` to apply the latest media-library migration.')) {
      return;
    }

    if ([
      'Media library management requires DATA_SOURCE=database.',
      'A file upload is required.',
      'Only image and PDF uploads are supported right now.',
      'A valid media asset id is required.'
    ].includes(error.message)) {
      res.status(400).json({ error: error.message });
      return;
    }

    next(error);
  }
});

apiRouter.delete('/admin/profiles/:slug/media/:mediaId', requireDraftEditor, async (req, res, next) => {
  try {
    const result = await deleteProfileMedia(req.params.slug, req.params.mediaId);

    if (result.status === 'missing_profile' || result.status === 'missing_media') {
      res.status(404).json({ error: 'Media asset not found.' });
      return;
    }

    res.status(204).end();
  } catch (error) {
    if (respondIfMissingSchema(error, res, 'Media library tables are not available yet. Run `npm.cmd run db:migrate` to apply the latest media-library migration.')) {
      return;
    }

    if ([
      'Media library management requires DATA_SOURCE=database.',
      'A valid media asset id is required.',
      'This media asset is currently in use. Replace it first or remove its references before deleting it.'
    ].includes(error.message)) {
      res.status(400).json({ error: error.message });
      return;
    }

    next(error);
  }
});

registerDraftRoutes('resume');
registerDraftRoutes('cover-letter');

apiRouter.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ error: 'Upload files must be 8MB or smaller.' });
      return;
    }

    res.status(400).json({ error: error.message || 'Upload failed.' });
    return;
  }

  console.error(error);
  res.status(500).json({ error: 'Unexpected server error' });
});
