import * as Joi from 'joi';

export function validateEnvironment(configuration: Record<string, unknown>) {
  const { error, value } = envValidationSchema.validate(configuration, {
    abortEarly: false,
    allowUnknown: true,
  });
  // Raw Joi errors keep the entire environment, including credentials, in _original.
  if (error)
    throw new Error(
      `Invalid environment configuration: ${error.details.map((detail) => `${detail.path.join('.')} (${detail.type})`).join(', ')}`,
    );
  return value as Record<string, unknown>;
}

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().default(4000),
  API_PREFIX: Joi.string().default('api/v1'),
  SWAGGER_ENABLED: Joi.string()
    .valid('true', 'false')
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.string().default('false'),
      otherwise: Joi.string().default('true'),
    }),
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgres', 'postgresql'] })
    .default('postgresql://postgres:postgres@localhost:5432/vrompt'),
  REDIS_URL: Joi.string()
    .uri({ scheme: ['redis'] })
    .default('redis://localhost:6379'),
  ORACLE_HOST: Joi.string().allow('').default(''),
  ORACLE_PORT: Joi.number().port().default(22),
  VROMPT_DOMAIN: Joi.string().hostname().allow('').default(''),
  VROMPT_PUBLIC_URL: Joi.string().uri().allow('').default(''),
  WEB_ORIGIN: Joi.string().uri().default('http://localhost:3000'),
  JWT_ACCESS_SECRET: Joi.string()
    .min(32)
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.string()
        .required()
        .invalid('local-development-access-secret-change-me'),
      otherwise: Joi.string().default(
        'local-development-access-secret-change-me',
      ),
    }),
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
  GITHUB_CLIENT_ID: Joi.string().allow('').default(''),
  GITHUB_CLIENT_SECRET: Joi.string().allow('').default(''),
  GITHUB_CALLBACK_URL: Joi.string()
    .uri()
    .default('http://localhost:4000/api/v1/auth/github/callback'),
  OPENAI_API_KEY: Joi.string().allow('').default(''),
  GOOGLE_AI_API_KEY: Joi.string().allow('').default(''),
  ANTHROPIC_API_KEY: Joi.string().allow('').default(''),
  MISTRAL_API_KEY: Joi.string().allow('').default(''),
  CHAT_STORAGE_DIR: Joi.string().default('./private-chat-files'),
  ADMIN_BOOTSTRAP_EMAIL: Joi.string().email().allow('').default(''),
  ADMIN_BOOTSTRAP_USERNAME: Joi.string().min(3).max(32).allow('').default(''),
  ADMIN_BOOTSTRAP_PASSWORD: Joi.string().min(12).allow('').default(''),
  MODERATOR_BOOTSTRAP_EMAIL: Joi.string().email().allow('').default(''),
  MODERATOR_BOOTSTRAP_USERNAME: Joi.string()
    .min(3)
    .max(32)
    .allow('')
    .default(''),
  MODERATOR_BOOTSTRAP_PASSWORD: Joi.string().min(12).allow('').default(''),
  AUTH_COOKIE_SECURE: Joi.boolean().when('NODE_ENV', {
    is: 'production',
    then: Joi.boolean().valid(true).default(true),
    otherwise: Joi.boolean().default(false),
  }),
  AUTH_COOKIE_SAME_SITE: Joi.string()
    .valid('lax', 'strict', 'none')
    .default('lax'),
  MEDIA_STORAGE_PROVIDER: Joi.string()
    .valid('LOCAL', 'CLOUDINARY')
    .default('LOCAL'),
  MEDIA_STORAGE_DRIVER: Joi.string().valid('local', 'cloudinary').optional(),
  MEDIA_STORAGE_LOCAL_DIR: Joi.string().default('./storage'),
  MEDIA_STORAGE_LOCAL_PUBLIC_URL: Joi.string().default('/media'),
  LOCAL_MEDIA_ROOT: Joi.string().optional(),
  CLOUDINARY_CLOUD_NAME: Joi.string()
    .allow('')
    .default('')
    .when('MEDIA_STORAGE_DRIVER', {
      is: 'cloudinary',
      then: Joi.string().min(1).required(),
    }),
  CLOUDINARY_API_KEY: Joi.string()
    .allow('')
    .default('')
    .when('MEDIA_STORAGE_DRIVER', {
      is: 'cloudinary',
      then: Joi.string().min(1).required(),
    }),
  CLOUDINARY_API_SECRET: Joi.string()
    .allow('')
    .default('')
    .when('MEDIA_STORAGE_DRIVER', {
      is: 'cloudinary',
      then: Joi.string().min(1).required(),
    }),
  PAYMONGO_API_BASE_URL: Joi.string()
    .uri({ scheme: ['https'] })
    .default('https://api.paymongo.com'),
  PAYMONGO_SECRET_KEY: Joi.string()
    .allow('')
    .default('')
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.string().min(1).required(),
    }),
  PAYMONGO_WEBHOOK_SECRET: Joi.string()
    .allow('')
    .default('')
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.string().min(1).required(),
    }),
  PAYMONGO_MODE: Joi.string().valid('test', 'live').default('test'),
  PAYMONGO_PAYMENT_METHODS: Joi.string().default('card,gcash,qrph'),
  PAYMONGO_PRO_PRICE_CENTAVOS: Joi.number().integer().min(100).default(599),
  PAYMONGO_PRO_PERIOD_DAYS: Joi.number().integer().min(1).max(366).default(30),
  PAYMONGO_CHECKOUT_EXPIRY_HOURS: Joi.number()
    .integer()
    .min(1)
    .max(168)
    .default(24),
  PAYMONGO_CHECKOUT_RATE_LIMIT_PER_HOUR: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(5),
});
