import express from 'express';
import { getDataSource } from '../config/app.js';
import { getDatabasePool } from '../config/database.js';
import { destroySession, requireDraftEditor, requireMemberManager, sessionCookieName } from '../middleware/auth.js';
import { createMemberAccount, listMembers, updateMemberAccount } from '../repositories/adminRepository.js';
import { authenticateUser, createUserSession } from '../repositories/authRepository.js';
import { listProfiles, readDocument } from '../repositories/documentRepository.js';
import { deleteDraftBundle, readDraftBundle, saveDraftBundle } from '../repositories/draftRepository.js';
import { serializeCookie } from '../services/cookieStore.js';

export const apiRouter = express.Router();

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

apiRouter.get('/profiles', async (req, res, next) => {
  try {
    res.json({ profiles: await listProfiles() });
  } catch (error) {
    next(error);
  }
});

apiRouter.get('/auth/me', async (req, res) => {
  res.json({
    dataSource: getDataSource(),
    user: req.currentUser || null
  });
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

apiRouter.get('/documents/:type/:slug', async (req, res, next) => {
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
});

apiRouter.get('/drafts/resume/:slug', async (req, res, next) => {
  try {
    const sourceDocument = await readDocument('resume', req.params.slug);

    if (!sourceDocument) {
      res.status(404).json({ error: 'Source document not found' });
      return;
    }

    res.json(await readDraftBundle('resume', req.params.slug));
  } catch (error) {
    next(error);
  }
});

apiRouter.post('/drafts/resume/:slug', requireDraftEditor, async (req, res, next) => {
  try {
    const sourceDocument = await readDocument('resume', req.params.slug);

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
      type: 'resume',
      slug: req.params.slug,
      content,
      sourceUpdatedAt: sourceDocument.meta?.updatedAt || null
    });

    res.status(201).json(bundle);
  } catch (error) {
    next(error);
  }
});

apiRouter.delete('/drafts/resume/:slug', requireDraftEditor, async (req, res, next) => {
  try {
    await deleteDraftBundle('resume', req.params.slug);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

apiRouter.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: 'Unexpected server error' });
});
