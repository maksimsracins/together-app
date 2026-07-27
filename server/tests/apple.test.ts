import { generateKeyPairSync } from 'crypto';
import jwt from 'jsonwebtoken';

let publicKey: string;
let privateKey: string;

// Swap the JWKS network fetch for a local keypair -- verifyAppleIdentityToken's
// actual jwt.verify() logic (signature, aud, iss) still runs for real, we just
// never hit appleid.apple.com/auth/keys.
jest.mock('jwks-rsa', () => {
  return jest.fn(() => ({
    getSigningKey: (_kid: string, cb: (err: unknown, key?: { getPublicKey: () => string }) => void) => {
      cb(null, { getPublicKey: () => publicKey });
    },
  }));
});

import { verifyAppleIdentityToken } from '../src/apple';

const APPLE_ISSUER = 'https://appleid.apple.com';
const APPLE_BUNDLE_ID = 'com.maksims.together';

function makeKeyPair() {
  return generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
}

function signAppleToken(payload: Record<string, unknown>, key: string = privateKey) {
  return jwt.sign(payload, key, { algorithm: 'RS256', keyid: 'test-kid', expiresIn: '5m' });
}

beforeAll(() => {
  const pair = makeKeyPair();
  publicKey = pair.publicKey;
  privateKey = pair.privateKey;
});

describe('verifyAppleIdentityToken', () => {
  it('verifies a valid Apple identity token and returns sub + email', async () => {
    const token = signAppleToken({
      iss: APPLE_ISSUER,
      aud: APPLE_BUNDLE_ID,
      sub: 'apple-user-123',
      email: 'person@example.com',
    });
    await expect(verifyAppleIdentityToken(token)).resolves.toEqual({
      sub: 'apple-user-123',
      email: 'person@example.com',
    });
  });

  it('resolves without an email when Apple omits it, as happens on repeat sign-ins', async () => {
    const token = signAppleToken({ iss: APPLE_ISSUER, aud: APPLE_BUNDLE_ID, sub: 'apple-user-456' });
    await expect(verifyAppleIdentityToken(token)).resolves.toEqual({
      sub: 'apple-user-456',
      email: undefined,
    });
  });

  it('rejects a token issued for a different app', async () => {
    const token = signAppleToken({ iss: APPLE_ISSUER, aud: 'com.someone.else', sub: 'x' });
    await expect(verifyAppleIdentityToken(token)).rejects.toBeTruthy();
  });

  it('rejects a token from an issuer other than Apple', async () => {
    const token = signAppleToken({ iss: 'https://evil.example.com', aud: APPLE_BUNDLE_ID, sub: 'x' });
    await expect(verifyAppleIdentityToken(token)).rejects.toBeTruthy();
  });

  it('rejects an expired token', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = jwt.sign(
      { iss: APPLE_ISSUER, aud: APPLE_BUNDLE_ID, sub: 'x', iat: now - 3600, exp: now - 1800 },
      privateKey,
      { algorithm: 'RS256', keyid: 'test-kid' }
    );
    await expect(verifyAppleIdentityToken(token)).rejects.toBeTruthy();
  });

  it('rejects a token signed with a key other than the one JWKS vouches for', async () => {
    const other = makeKeyPair();
    const token = signAppleToken({ iss: APPLE_ISSUER, aud: APPLE_BUNDLE_ID, sub: 'x' }, other.privateKey);
    await expect(verifyAppleIdentityToken(token)).rejects.toBeTruthy();
  });

  it('rejects a malformed token', async () => {
    await expect(verifyAppleIdentityToken('not-a-jwt')).rejects.toBeTruthy();
  });
});
