import { envValidationSchema, validateEnvironment } from './env.schema';

describe('environment validation', () => {
  it('does not retain secrets in startup validation errors', () => {
    try {
      validateEnvironment({
        ADMIN_BOOTSTRAP_EMAIL: 'invalid',
        GOOGLE_CLIENT_SECRET: 'private-test-credential',
      });
      throw new Error('Expected validation to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain('ADMIN_BOOTSTRAP_EMAIL');
      expect((error as Error).message).not.toContain('private-test-credential');
      expect(error).not.toHaveProperty('_original');
    }
  });
  it('rejects the development JWT secret in production', () => {
    const result = envValidationSchema.validate({
      NODE_ENV: 'production',
      AUTH_COOKIE_SECURE: true,
      JWT_ACCESS_SECRET: 'local-development-access-secret-change-me',
    });

    expect(result.error?.message).toContain('JWT_ACCESS_SECRET');
  });

  it('requires secure authentication cookies in production', () => {
    const result = envValidationSchema.validate({
      NODE_ENV: 'production',
      AUTH_COOKIE_SECURE: false,
      JWT_ACCESS_SECRET: 'a-unique-production-secret-at-least-32-characters',
    });

    expect(result.error?.message).toContain('AUTH_COOKIE_SECURE');
  });

  it('keeps development defaults available locally', () => {
    const result = envValidationSchema.validate({ NODE_ENV: 'development' });

    expect(result.error).toBeUndefined();
    expect(result.value.JWT_ACCESS_SECRET).toBe(
      'local-development-access-secret-change-me',
    );
    expect(result.value.AUTH_COOKIE_SECURE).toBe(false);
    expect(result.value.SWAGGER_ENABLED).toBe('true');
  });

  it('requires PayMongo server credentials in production', () => {
    const result = envValidationSchema.validate(
      {
        NODE_ENV: 'production',
        AUTH_COOKIE_SECURE: true,
        JWT_ACCESS_SECRET: 'a-unique-production-secret-at-least-32-characters',
      },
      { abortEarly: false },
    );

    expect(result.error?.message).toContain('PAYMONGO_SECRET_KEY');
    expect(result.error?.message).toContain('PAYMONGO_WEBHOOK_SECRET');
  });
});
