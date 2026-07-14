import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  getHealth() {
    return {
      status: 'ok',
      service: 'api',
      version: this.configService.get<string>('app.version', '0.0.1'),
      timestamp: new Date().toISOString(),
    } as const;
  }

  async getDeepHealth() {
    const redisUrl = this.configService.get<string>('redis.url', 'redis://localhost:6379');
    const redis = new IORedis(redisUrl, { maxRetriesPerRequest: 1, lazyConnect: true });
    const queue = this.createQueue(redisUrl);
    const checks: Record<string, 'ok' | 'degraded'> = {
      database: 'degraded',
      redis: 'degraded',
      queue: 'degraded',
      objectStorage: 'ok',
    };

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = 'ok';
    } catch {
      checks.database = 'degraded';
    }

    try {
      await redis.connect();
      await redis.ping();
      checks.redis = 'ok';
    } catch {
      checks.redis = 'degraded';
    } finally {
      redis.disconnect();
    }

    try {
      await queue.getJobCounts('active', 'delayed', 'failed', 'waiting');
      checks.queue = 'ok';
    } catch {
      checks.queue = 'degraded';
    } finally {
      await queue.close();
    }

    return {
      status: Object.values(checks).every((status) => status === 'ok') ? 'ok' : 'degraded',
      service: 'api',
      checks,
      timestamp: new Date().toISOString(),
    } as const;
  }

  async getMetrics(): Promise<string> {
    const memory = process.memoryUsage();
    const redisUrl = this.configService.get<string>('redis.url', 'redis://localhost:6379');
    const queue = this.createQueue(redisUrl);
    const queueCounts = await queue
      .getJobCounts('active', 'delayed', 'failed', 'waiting')
      .catch(() => ({ active: 0, delayed: 0, failed: 0, waiting: 0 }));
    await queue.close().catch(() => undefined);
    const lines = [
      '# HELP island_empires_process_uptime_seconds Process uptime in seconds.',
      '# TYPE island_empires_process_uptime_seconds gauge',
      `island_empires_process_uptime_seconds ${Math.round(process.uptime())}`,
      '# HELP island_empires_process_memory_rss_bytes Resident memory in bytes.',
      '# TYPE island_empires_process_memory_rss_bytes gauge',
      `island_empires_process_memory_rss_bytes ${memory.rss}`,
      '# HELP island_empires_process_memory_heap_used_bytes Heap memory used in bytes.',
      '# TYPE island_empires_process_memory_heap_used_bytes gauge',
      `island_empires_process_memory_heap_used_bytes ${memory.heapUsed}`,
      '# HELP island_empires_queue_jobs Number of queue jobs by state.',
      '# TYPE island_empires_queue_jobs gauge',
      `island_empires_queue_jobs{state="active"} ${queueCounts.active ?? 0}`,
      `island_empires_queue_jobs{state="delayed"} ${queueCounts.delayed ?? 0}`,
      `island_empires_queue_jobs{state="failed"} ${queueCounts.failed ?? 0}`,
      `island_empires_queue_jobs{state="waiting"} ${queueCounts.waiting ?? 0}`,
    ];

    return `${lines.join('\n')}\n`;
  }

  private createQueue(redisUrl: string): Queue {
    const parsed = new URL(redisUrl);
    return new Queue('island-empires-default', {
      connection: {
        host: parsed.hostname,
        port: Number(parsed.port || 6379),
        username: parsed.username || undefined,
        password: parsed.password || undefined,
        db: parsed.pathname ? Number(parsed.pathname.slice(1) || 0) : 0,
        maxRetriesPerRequest: null,
      },
    });
  }
}
