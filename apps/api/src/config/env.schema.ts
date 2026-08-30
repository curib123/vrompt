import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().default(4000),
  API_PREFIX: Joi.string().default('api/v1'),
  SWAGGER_ENABLED: Joi.string().valid('true', 'false').default('true'),
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgres', 'postgresql'] })
    .default('postgresql://postgres:postgres@localhost:5432/vrompt'),
  REDIS_URL: Joi.string()
    .uri({ scheme: ['redis'] })
    .default('redis://localhost:6379'),
  WEB_ORIGIN: Joi.string().uri().default('http://localhost:3000'),
  JWT_ACCESS_SECRET: Joi.string()
    .min(32)
    .default('local-development-access-secret-change-me'),
  JWT_ACCESS_TTL_SECONDS: Joi.number().integer().min(60).default(900),
  JWT_REFRESH_TTL_SECONDS: Joi.number()
    .integer()
    .min(300)
    .default(60 * 60 * 24 * 7),
  GOOGLE_CLIENT_ID: Joi.string().allow('').default(''),
  GOOGLE_CLIENT_SECRET: Joi.string().allow('').default(''),
  GOOGLE_CALLBACK_URL: Joi.string()
    .uri()
    .default('http://localhost:4000/api/v1/auth/google/callback'),
  AUTH_COOKIE_SECURE: Joi.boolean().default(false),
  AUTH_COOKIE_SAME_SITE: Joi.string()
    .valid('lax', 'strict', 'none')
    .default('lax'),
  MEDIA_STORAGE_PROVIDER: Joi.string()
    .valid('LOCAL', 'CLOUDINARY')
    .default('LOCAL'),
  MEDIA_STORAGE_LOCAL_DIR: Joi.string().default('./storage'),
  MEDIA_STORAGE_LOCAL_PUBLIC_URL: Joi.string().default('/media'),
});
