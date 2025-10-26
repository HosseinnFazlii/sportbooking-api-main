import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
// after app creation:
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { cors: true });

  // Prefix all API routes (optional)
  app.setGlobalPrefix('api');

  // DTO validation + auto-transform
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      forbidUnknownValues: false,
    }),
  );
  
  // Config
  const cfg = app.get(ConfigService);
  const uploadDir = cfg.get<string>('UPLOAD_DIR') || 'uploads';
  app.useStaticAssets(join(process.cwd(), uploadDir), { prefix: `/${uploadDir}/` });

  // Swagger (docs at /docs)
  const config = new DocumentBuilder()
    .setTitle('Rismun SportBooking API Documents')
    .setDescription('REST API for facilities, bookings, courses, tournaments, teachers, and RBAC.')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Paste your JWT access token',
      },
    )
    .build();
  const doc = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, doc);

  const port = parseInt(cfg.get<string>('PORT') ?? '3000', 10);
  await app.listen(port, '0.0.0.0');
}
bootstrap();
