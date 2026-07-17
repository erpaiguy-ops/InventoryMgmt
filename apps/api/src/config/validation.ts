import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().port().default(3001),
  API_PREFIX: Joi.string().default('api'),
  FRONTEND_URL: Joi.string().default('http://localhost:3000'),
  LOG_LEVEL: Joi.string().valid('fatal', 'error', 'warn', 'log', 'debug', 'verbose').default('log'),

  SUPABASE_URL: Joi.string().uri().required(),
  SUPABASE_ANON_KEY: Joi.string().required(),
  SUPABASE_SERVICE_ROLE_KEY: Joi.string().required(),

  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default('1d'),
});
