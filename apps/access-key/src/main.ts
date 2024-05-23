import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AccessKeyModule } from './access-key.module';
import * as dotenv from 'dotenv';
import * as path from 'path';

async function bootstrap() {
  // Create the NestJS application
  dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
  const app = await NestFactory.create(AccessKeyModule);

  // Get the ConfigService
  const configService = app.get(ConfigService);

  // Get the port from the environment variables
  const port = configService.get<number>('ACCESS_KEY_SERVICE_PORT') || 3000;

  // Start listening on the specified port
  await app.listen(port);
  console.log(`Access-Key service is running on http://localhost:${port}`);
}

bootstrap();
