import { base32Decode, base32Encode, openSecret, sealSecret, totp, verifyTotp } from './totp.js';

describe('TOTP', () => {
  // Vektor uji RFC 6238 (SHA1, rahasia "12345678901234567890"), 6 digit terakhir dari kode 8 digit.
  const secret = base32Encode(Buffer.from('12345678901234567890'));

  it('matches RFC 6238 test vectors', () => {
    expect(totp(secret, 59_000)).toBe('287082');
    expect(totp(secret, 1_111_111_109_000)).toBe('081804');
    expect(totp(secret, 2_000_000_000_000)).toBe('279037');
  });

  it('accepts one step of clock drift but not more', () => {
    const now = 1_700_000_000_000;
    expect(verifyTotp(secret, totp(secret, now - 30_000), now)).toBe(true);
    expect(verifyTotp(secret, totp(secret, now - 90_000), now)).toBe(false);
    expect(verifyTotp(secret, 'abcdef', now)).toBe(false);
  });

  it('round-trips base32 and sealed secrets', () => {
    expect(base32Decode(secret).toString()).toBe('12345678901234567890');
    const sealed = sealSecret(secret, 'x'.repeat(32));
    expect(sealed).not.toContain(secret);
    expect(openSecret(sealed, 'x'.repeat(32))).toBe(secret);
    expect(() => openSecret(sealed, 'y'.repeat(32))).toThrow();
  });
});
