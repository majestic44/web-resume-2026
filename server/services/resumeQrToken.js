import crypto from 'node:crypto';

const publicTokenPattern = /^(\d+)\.([A-Za-z0-9_-]{43})$/;

export function createResumeQrPublicToken(linkId, tokenHash) {
  const signature = crypto
    .createHmac('sha256', String(tokenHash))
    .update(`resume-qr:${linkId}`)
    .digest('base64url');

  return `${linkId}.${signature}`;
}

export function parseResumeQrPublicToken(value) {
  const match = String(value || '').trim().match(publicTokenPattern);
  if (!match) return null;

  const linkId = Number(match[1]);
  if (!Number.isSafeInteger(linkId) || linkId <= 0) return null;

  return { linkId, signature: match[2] };
}

export function isValidResumeQrPublicToken({ linkId, signature }, tokenHash) {
  const expected = createResumeQrPublicToken(linkId, tokenHash).split('.')[1];
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (signatureBuffer.length !== expectedBuffer.length) return false;

  return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
}
