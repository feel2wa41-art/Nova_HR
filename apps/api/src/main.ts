import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
const cookieParser = require('cookie-parser');

import { AppModule } from './app.module';
import { PrismaService } from './shared/services/prisma.service';
import { createSecurityConfig, validateSecurityConfig } from './config/security.config';
import { createHelmetConfig } from './config/helmet.config';
import { SecurityHeadersMiddleware, RequestLoggingMiddleware } from './middleware/security.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Load and validate security configuration
  const securityConfig = createSecurityConfig(configService);
  validateSecurityConfig(securityConfig);

  // Configure body parser for large payloads (screenshots)
  const express = require('express');
  app.use('/api/v1/attitude/screenshot', express.json({ limit: '10mb' }));
  app.use('/api/v1/attitude/screenshot', express.urlencoded({ limit: '10mb', extended: true }));
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ limit: '2mb', extended: true }));

  // Cookie parser for session management
  app.use(cookieParser(securityConfig.encryption.cookieSecret));

  // Security middleware
  app.use(new SecurityHeadersMiddleware().use);
  app.use(new RequestLoggingMiddleware().use);

  // Helmet security headers
  app.use(helmet(createHelmetConfig(configService)));
  
  // Compression
  app.use(compression());

  // CORS - Use security config
  app.enableCors(securityConfig.cors);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  // API versioning - disabled since we use global prefix with version
  // app.enableVersioning({
  //   type: VersioningType.URI,
  //   defaultVersion: '1',
  // });

  // Global prefix
  const apiPrefix = configService.get('API_PREFIX', 'api/v1');
  app.setGlobalPrefix(apiPrefix);

  // Swagger documentation
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Nova HR API')
      .setDescription('Nova HR Management System API Documentation')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Access token',
        },
        'access-token'
      )
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Refresh token',
        },
        'refresh-token'
      )
      .addTag('Auth', 'Authentication endpoints')
      .addTag('Users', 'User management')
      .addTag('Attendance', 'Attendance tracking')
      .addTag('Leave', 'Leave management')
      .addTag('Approval', 'Electronic approval system')
      .addTag('Company', 'Company and organization management')
      .addTag('Reports', 'Reports and analytics')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup(`${apiPrefix}/docs`, app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  // Prisma enableShutdownHooks
  const prismaService = app.get(PrismaService);
  await prismaService.enableShutdownHooks(app);

  // Start server
  const port = configService.get('PORT', 3333);
  await app.listen(port);

  console.log(`🚀 Nova HR API is running on: http://localhost:${port}/${apiPrefix}`);
  console.log(`📚 Swagger docs: http://localhost:${port}/${apiPrefix}/docs`);
}

bootstrap();