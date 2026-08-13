import { getDataSource } from '../config/app.js';
import { getCookieValue, serializeCookie } from '../services/cookieStore.js';
import { canEditProfile, canManageMembers, deleteUserSession, getUserBySessionToken, touchUserSession } from '../repositories/authRepository.js';

export const sessionCookieName = process.env.SESSION_COOKIE_NAME || 'household_resume_session';

export async function attachCurrentUser(req, res, next) {
  try {
    if (getDataSource() !== 'database') {
      req.currentUser = null;
      next();
      return;
    }

    const token = getCookieValue(req.headers.cookie, sessionCookieName);
    if (!token) {
      req.currentUser = null;
      next();
      return;
    }

    const user = await getUserBySessionToken(token);
    if (!user) {
      res.setHeader('Set-Cookie', serializeCookie(sessionCookieName, '', {
        path: '/',
        sameSite: 'Lax',
        httpOnly: true,
        maxAge: 0,
        expires: new Date(0)
      }));
      req.currentUser = null;
      next();
      return;
    }

    req.currentUser = user;
    req.sessionToken = token;
    await touchUserSession(token);
    next();
  } catch (error) {
    next(error);
  }
}

export function requireDraftEditor(req, res, next) {
  if (getDataSource() !== 'database') {
    next();
    return;
  }

  if (!canEditProfile(req.currentUser, req.params.slug)) {
    res.status(403).json({ error: 'You do not have permission to modify drafts.' });
    return;
  }

  next();
}

export function requireMemberManager(req, res, next) {
  if (getDataSource() !== 'database') {
    res.status(400).json({ error: 'Member management is only enabled when DATA_SOURCE=database.' });
    return;
  }

  if (!canManageMembers(req.currentUser)) {
    res.status(403).json({ error: 'You do not have permission to manage members.' });
    return;
  }

  next();
}

export function requireInternalUser(req, res, next) {
  if (getDataSource() !== 'database') {
    next();
    return;
  }

  if (!req.currentUser) {
    res.status(401).json({ error: 'Sign in is required.' });
    return;
  }

  next();
}

export function requireInternalProfileAccess(req, res, next) {
  if (getDataSource() !== 'database') {
    next();
    return;
  }

  if (!canEditProfile(req.currentUser, req.params.slug)) {
    res.status(403).json({ error: 'You do not have permission to view this profile.' });
    return;
  }

  next();
}

export async function destroySession(req, res) {
  if (req.sessionToken) {
    await deleteUserSession(req.sessionToken);
  }

  res.setHeader('Set-Cookie', serializeCookie(sessionCookieName, '', {
    path: '/',
    sameSite: 'Lax',
    httpOnly: true,
    maxAge: 0,
    expires: new Date(0)
  }));
}
