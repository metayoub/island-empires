const optionalNumber = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const optionalList = (value: string | undefined, fallback: string[]): string[] => {
  if (!value) {
    return fallback;
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const requiredInProduction = [
  'APP_BASE_URL',
  'API_BASE_URL',
  'DATABASE_URL',
  'REDIS_URL',
  'SESSION_SECRET',
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
] as const;

export function validateProductionEnv(): void {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  const missing = requiredInProduction.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required production environment variables: ${missing.join(', ')}`);
  }

  if (process.env.AUTH_DEV_MODE === 'true') {
    throw new Error('AUTH_DEV_MODE must be false in production');
  }

  if (process.env.AUTH_COOKIE_SECURE !== 'true') {
    throw new Error('AUTH_COOKIE_SECURE must be true in production');
  }
}

validateProductionEnv();

export const envConfig = () => ({
  app: {
    name: process.env.APP_NAME ?? 'Island Empires',
    url: process.env.APP_BASE_URL ?? process.env.APP_URL ?? 'http://localhost:5173',
    adminUrl: process.env.ADMIN_BASE_URL ?? process.env.ADMIN_URL ?? 'http://localhost:5174',
    nodeEnv: process.env.NODE_ENV ?? 'development',
    version: process.env.APP_VERSION ?? process.env.npm_package_version ?? '0.0.1',
    commitSha: process.env.COMMIT_SHA ?? process.env.GITHUB_SHA ?? 'local',
    maintenanceMode: process.env.MAINTENANCE_MODE === 'true',
  },
  api: {
    port: optionalNumber(process.env.API_PORT, 3000),
    url: process.env.API_BASE_URL ?? process.env.API_URL ?? 'http://localhost:3000',
    corsAllowedOrigins: optionalList(process.env.CORS_ALLOWED_ORIGINS, [
      process.env.APP_BASE_URL ?? process.env.APP_URL ?? 'http://localhost:5173',
      process.env.ADMIN_BASE_URL ?? process.env.ADMIN_URL ?? 'http://localhost:5174',
    ]),
  },
  auth: {
    sessionSecret: process.env.SESSION_SECRET ?? process.env.AUTH_SESSION_SECRET ?? '',
    sessionCookieName:
      process.env.SESSION_COOKIE_NAME ??
      process.env.AUTH_SESSION_COOKIE_NAME ??
      'island_empires_session',
    sessionDays: optionalNumber(process.env.AUTH_SESSION_DAYS, 30),
    cookieSecure: process.env.AUTH_COOKIE_SECURE === 'true',
    devMode: process.env.AUTH_DEV_MODE === 'true',
  },
  mail: {
    host: process.env.MAIL_HOST ?? 'localhost',
    port: optionalNumber(process.env.MAIL_PORT, 1025),
    user: process.env.MAIL_USER ?? '',
    password: process.env.MAIL_PASSWORD ?? '',
    from: process.env.MAIL_FROM ?? 'Island Empires <no-reply@islandempires.local>',
  },
  push: {
    publicKey:
      process.env.WEB_PUSH_PUBLIC_KEY ??
      process.env.PUSH_PUBLIC_KEY ??
      process.env.VITE_PUSH_PUBLIC_KEY ??
      '',
    privateKey: process.env.WEB_PUSH_PRIVATE_KEY ?? process.env.PUSH_PRIVATE_KEY ?? '',
    subject:
      process.env.WEB_PUSH_SUBJECT ??
      process.env.PUSH_SUBJECT ??
      'mailto:no-reply@islandempires.local',
  },
  payments: {
    provider: process.env.PAYMENT_PROVIDER ?? process.env.PAYMENTS_PROVIDER ?? 'mock_provider',
    secretKey: process.env.PAYMENT_SECRET_KEY ?? process.env.PAYMENTS_SECRET_KEY ?? '',
    webhookSecret:
      process.env.PAYMENT_WEBHOOK_SECRET ??
      process.env.PAYMENTS_WEBHOOK_SECRET ??
      'dev-webhook-secret',
    mockCheckoutBaseUrl:
      process.env.PAYMENTS_MOCK_CHECKOUT_BASE_URL ??
      'https://payment-provider.example/checkout',
  },
  database: {
    url:
      process.env.DATABASE_URL ??
      'postgresql://postgres:postgres@localhost:5432/island_empires',
  },
  redis: {
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
  },
  objectStorage: {
    endpoint:
      process.env.OBJECT_STORAGE_ENDPOINT ??
      process.env.S3_ENDPOINT ??
      'http://localhost:9000',
    bucket: process.env.OBJECT_STORAGE_BUCKET ?? process.env.S3_BUCKET ?? 'island-empires',
    accessKey: process.env.OBJECT_STORAGE_ACCESS_KEY ?? process.env.S3_ACCESS_KEY ?? '',
    secretKey: process.env.OBJECT_STORAGE_SECRET_KEY ?? process.env.S3_SECRET_KEY ?? '',
  },
  observability: {
    errorTrackingDsn: process.env.ERROR_TRACKING_DSN ?? '',
    logLevel: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  },
  support: {
    email: process.env.SUPPORT_EMAIL ?? 'support@islandempires.local',
  },
});
