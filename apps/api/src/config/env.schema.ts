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
  MEDIA_STORAGE_PROVIDER: Joi.string()
    .valid('LOCAL', 'CLOUDINARY')
    .default('LOCAL'),
  MEDIA_STORAGE_LOCAL_DIR: Joi.string().default('./storage'),
  MEDIA_STORAGE_LOCAL_PUBLIC_URL: Joi.string().default('/media'),
});
