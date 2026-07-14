import IORedis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { workerEnv } from './config/env';
import { defaultQueue } from './queues/default.queue';
import {
  createDefaultProcessor,
  scanDueBuildingUpgrades,
  scanDuePveMovements,
  scanDuePvpMovements,
  scanDueResearchJobs,
  scanDueResourceTransports,
  scanDueScoutingJobs,
  scanDueUnitTrainingOrders,
} from './processors/default.processor';

async function bootstrap(): Promise<void> {
  const startedAt = new Date();
  console.log(
    JSON.stringify({
      timestamp: startedAt.toISOString(),
      level: 'info',
      service: 'worker',
      message: 'Worker starting',
    }),
  );

  const redis = new IORedis(workerEnv.redisUrl, {
    maxRetriesPerRequest: null,
  });
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: workerEnv.databaseUrl,
      },
    },
  });

  await redis.ping();
  await prisma.$connect();
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      service: 'worker',
      message: 'Redis and database connected',
    }),
  );

  const processor = createDefaultProcessor(prisma);
  processor.on('failed', (_job, error) => {
    console.error('Worker job failed', error);
  });

  await defaultQueue.waitUntilReady();
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      service: 'worker',
      message: 'Waiting for jobs',
    }),
  );

  const healthLogger = setInterval(() => {
    defaultQueue
      .getJobCounts('active', 'delayed', 'failed', 'waiting')
      .then((counts) => {
        console.log(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'info',
            service: 'worker',
            message: 'Worker health',
            metadata: {
              uptimeSeconds: Math.round((Date.now() - startedAt.getTime()) / 1000),
              queue: counts,
            },
          }),
        );
      })
      .catch((error) => {
        console.error('Worker health log failed', error);
      });
  }, 60_000);

  const scanner = setInterval(() => {
    scanDueBuildingUpgrades(prisma).catch((error) => {
      console.error('Building upgrade scanner failed', error);
    });
    scanDueResearchJobs(prisma).catch((error) => {
      console.error('Research job scanner failed', error);
    });
    scanDueResourceTransports(prisma).catch((error) => {
      console.error('Resource transport scanner failed', error);
    });
    scanDueUnitTrainingOrders(prisma).catch((error) => {
      console.error('Unit training scanner failed', error);
    });
    scanDuePveMovements(prisma).catch((error) => {
      console.error('PvE movement scanner failed', error);
    });
    scanDuePvpMovements(prisma).catch((error) => {
      console.error('PvP movement scanner failed', error);
    });
    scanDueScoutingJobs(prisma).catch((error) => {
      console.error('Scouting scanner failed', error);
    });
  }, 60_000);
  await scanDueBuildingUpgrades(prisma);
  await scanDueResearchJobs(prisma);
  await scanDueResourceTransports(prisma);
  await scanDueUnitTrainingOrders(prisma);
  await scanDuePveMovements(prisma);
  await scanDuePvpMovements(prisma);
  await scanDueScoutingJobs(prisma);

  const shutdown = async () => {
    clearInterval(scanner);
    clearInterval(healthLogger);
    await processor.close();
    await defaultQueue.close();
    await prisma.$disconnect();
    await redis.quit();
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void shutdown();
  });
  process.on('SIGTERM', () => {
    void shutdown();
  });
}

void bootstrap();
