import { validateEnv } from './env.js';

describe('validateEnv', () => {
  const DATABASE_URL = 'postgresql://u:p@localhost:5432/db';

  it('applies defaults and coerces PORT', () => {
    expect(validateEnv({ DATABASE_URL, PORT: '4100' })).toMatchObject({
      NODE_ENV: 'development',
      PORT: 4100,
      WEB_ORIGIN: 'http://localhost:3000',
    });
  });

  it('fails fast when DATABASE_URL is missing', () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL/);
  });
});
