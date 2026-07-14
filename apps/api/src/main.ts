import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('api.port', 3000);
  const allowedOrigins = configService.get<string[]>('api.corsAllowedOrigins', [
    'http://localhost:5173',
    'http://localhost:5174',
  ]);

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });
  app.use((req: Request, res: Response, next: NextFunction) => {
    const requestId = req.headers['x-request-id']?.toString() ?? randomUUID();
    const startedAt = Date.now();
    res.setHeader('X-Request-Id', requestId);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'none'");
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (configService.get<string>('app.nodeEnv') === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    res.on('finish', () => {
      if (configService.get<string>('app.nodeEnv') === 'production') {
        console.log(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            level: res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
            service: 'api',
            requestId,
            message: 'Request completed',
            metadata: {
              method: req.method,
              route: req.originalUrl,
              statusCode: res.statusCode,
              durationMs: Date.now() - startedAt,
            },
          }),
        );
      }
    });
    next();
  });
  app.use((req: Request, res: Response, next: NextFunction) => {
    const maintenanceMode = configService.get<boolean>('app.maintenanceMode', false);
    const path = req.path;
    const allowed =
      path.startsWith('/api/health') ||
      path === '/api/version' ||
      path === '/api/support/contact' ||
      path.startsWith('/api/admin');
    if (maintenanceMode && !allowed) {
      res.status(503).json({
        message: 'Island Empires is currently under maintenance. Please come back soon.',
        code: 'MAINTENANCE_MODE',
      });
      return;
    }
    next();
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  await app.listen(port);
}

void bootstrap();
