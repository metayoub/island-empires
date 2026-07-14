import { readFileSync } from 'node:fs';

const productionRequired = [
  'NODE_ENV',
  'APP_BASE_URL',
  'API_BASE_URL',
  'DATABASE_URL',
  'REDIS_URL',
  'SESSION_SECRET',
  'SESSION_COOKIE_NAME',
  'CORS_ALLOWED_ORIGINS',
  'MAIL_HOST',
  'MAIL_PORT',
  'MAIL_FROM',
  'WEB_PUSH_PUBLIC_KEY',
  'WEB_PUSH_PRIVATE_KEY',
  'WEB_PUSH_SUBJECT',
  'PAYMENT_PROVIDER',
  'PAYMENT_SECRET_KEY',
  'PAYMENT_WEBHOOK_SECRET',
  'OBJECT_STORAGE_ENDPOINT',
  'OBJECT_STORAGE_BUCKET',
  'OBJECT_STORAGE_ACCESS_KEY',
  'OBJECT_STORAGE_SECRET_KEY',
  'ERROR_TRACKING_DSN',
];

const example = readFileSync('.env.example', 'utf8');
const missingFromExample = productionRequired.filter(
  (key) => !new RegExp(`^${key}=`, 'm').test(example),
);

if (missingFromExample.length > 0) {
  console.error(`.env.example is missing: ${missingFromExample.join(', ')}`);
  process.exit(1);
}

console.log('Environment template includes required production variables.');
