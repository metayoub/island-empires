import 'dotenv/config';

export function validateWorkerEnv(): void {
  const missing = ['DATABASE_URL', 'REDIS_URL'].filter((key) => !process.env[key]);
  if (process.env.NODE_ENV === 'production' && missing.length > 0) {
    throw new Error(`Missing required worker environment variables: ${missing.join(', ')}`);
  }
}

validateWorkerEnv();

export const workerEnv = {
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  databaseUrl:
    process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/island_empires',
} as const;

export function getRedisConnectionOptions() {
  const redisUrl = new URL(workerEnv.redisUrl);

  return {
    host: redisUrl.hostname,
    port: Number(redisUrl.port || 6379),
    username: redisUrl.username || undefined,
    password: redisUrl.password || undefined,
    db: redisUrl.pathname ? Number(redisUrl.pathname.slice(1) || 0) : 0,
    maxRetriesPerRequest: null,
  };
}
