import jwt, { JwtHeader, SigningKeyCallback } from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const APPLE_ISSUER = 'https://appleid.apple.com';
const APPLE_BUNDLE_ID = 'com.maksims.together';

const client = jwksClient({
  jwksUri: `${APPLE_ISSUER}/auth/keys`,
  cache: true,
  rateLimit: true,
});

function getSigningKey(header: JwtHeader, callback: SigningKeyCallback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
      return;
    }
    callback(null, key?.getPublicKey());
  });
}

export interface AppleTokenPayload {
  sub: string;
  email?: string;
}

export function verifyAppleIdentityToken(identityToken: string): Promise<AppleTokenPayload> {
  return new Promise((resolve, reject) => {
    jwt.verify(
      identityToken,
      getSigningKey,
      { algorithms: ['RS256'], issuer: APPLE_ISSUER, audience: APPLE_BUNDLE_ID },
      (err, decoded) => {
        if (err || !decoded || typeof decoded === 'string') {
          reject(err || new Error('Invalid Apple identity token'));
          return;
        }
        const payload = decoded as jwt.JwtPayload;
        if (!payload.sub) {
          reject(new Error('Apple identity token missing sub'));
          return;
        }
        resolve({ sub: payload.sub, email: typeof payload.email === 'string' ? payload.email : undefined });
      }
    );
  });
}
