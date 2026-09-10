import { createOpaqueToken, hashPassword, hashToken, signJwt, verifyJwt, verifyPassword } from './crypto';

describe('auth crypto', () => {
  it('hashes and verifies passwords without storing plaintext', async () => {
    const password = 'Correct Horse Battery Staple 2026';
    const encoded = await hashPassword(password);
    expect(encoded).not.toContain(password);
    await expect(verifyPassword(password, encoded)).resolves.toBe(true);
    await expect(verifyPassword('wrong password', encoded)).resolves.toBe(false);
  });

  it('creates opaque tokens and deterministic token hashes', () => {
    const token = createOpaqueToken();
    expect(token.length).toBeGreaterThan(30);
    expect(hashToken(token)).toBe(hashToken(token));
  });

  it('signs and verifies JWTs and rejects tampering', () => {
    const secret = 'a'.repeat(40);
    const now = Math.floor(Date.now() / 1000);
    const token = signJwt({ sub: 'user-1', type: 'access', iss: 'eiasc-cril', iat: now, exp: now + 60 }, secret);
    expect(verifyJwt(token, secret).sub).toBe('user-1');

    const parts = token.split('.');
    const originalSignature = parts[2];
    const replacement = originalSignature[0] === 'A' ? 'B' : 'A';
    parts[2] = `${replacement}${originalSignature.slice(1)}`;
    expect(() => verifyJwt(parts.join('.'), secret)).toThrow();
  });
});
