import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createResumeQrPublicToken,
  isValidResumeQrPublicToken,
  parseResumeQrPublicToken
} from './resumeQrToken.js';

const tokenHash = 'a4f3ce13a8d65be21c9c765c3f726cfd9d13185caaa57c43cb03b9e30fe09d3a';

test('validates a generated public resume QR token', () => {
  const token = createResumeQrPublicToken(42, tokenHash);
  const parsedToken = parseResumeQrPublicToken(token);

  assert.deepEqual(parsedToken?.linkId, 42);
  assert.equal(isValidResumeQrPublicToken(parsedToken, tokenHash), true);
});

test('rejects malformed or tampered public resume QR tokens', () => {
  assert.equal(parseResumeQrPublicToken('42.not-a-valid-signature'), null);
  assert.equal(parseResumeQrPublicToken('0.abc'), null);

  const token = createResumeQrPublicToken(42, tokenHash);
  const { linkId, signature } = parseResumeQrPublicToken(token);
  const replacementCharacter = signature.endsWith('A') ? 'B' : 'A';
  const tamperedToken = { linkId, signature: `${signature.slice(0, -1)}${replacementCharacter}` };

  assert.equal(isValidResumeQrPublicToken(tamperedToken, tokenHash), false);
});

test('rejects signatures with a different byte length without throwing', () => {
  assert.equal(
    isValidResumeQrPublicToken({ linkId: 42, signature: 'too-short' }, tokenHash),
    false
  );
});
