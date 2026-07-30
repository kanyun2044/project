import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';


async function bootstrap() {

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(cookieParser());
  app.useStaticAssets(join(process.cwd(),'public'),{
  prefix:'/',
  });
  
  app.enableCors({
  origin: 'http://localhost:3000',
  credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe()
  );


  const config = new DocumentBuilder()
    .setTitle('User Auth API')
    .setDescription('User authentication system API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();


  const document =SwaggerModule.createDocument(app,config);


  SwaggerModule.setup('api',app,document);


  await app.listen(3001);
}

bootstrap();
