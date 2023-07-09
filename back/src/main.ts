import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as cookieParser from 'cookie-parser';
import { AllExceptionsFilter } from './filters/all-exception.filter';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  console.log(process.env.MONGOURL);
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const configService = app.get(ConfigService);
  console.log(configService.get('MONGOURL'));

  // Definir el prefijo del backend en /api, necesario para la redirección del nginx
  app.setGlobalPrefix('api');

  // Servir los archivos dentro de la carpeta definida para ello
  app.useStaticAssets(join(__dirname, '..', '..', 'exterior'));

  app.use(cookieParser());

  const corsOptions = {};

  app.enableCors(corsOptions);

  // Pasa el filtro de validación a todas las peticiones con body
  // En caso de que exista un parámetro fuera de la whitelist, no se pasará
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Hace pasar todas las excepciones por un mismo filtro
  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapter));

  await app.listen(3001);
}
bootstrap();
