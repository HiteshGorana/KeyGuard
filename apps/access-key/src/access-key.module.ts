import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AccessKeyService } from './services/access-key.service';
import { AccessKeyAdminController } from './controllers/access-key-admin.controller';
import { AccessKeyUserController } from './controllers/access-key-user.controller';
import { RedisModule } from '@nestjs-modules/ioredis';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AccessKey, AccessKeySchema } from './schemas/access-key.schema';
import { LoggingService } from './services/logging.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forFeature([
      { name: AccessKey.name, schema: AccessKeySchema },
    ]),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'single',
        url: configService.get<string>('REDIS_URL'),
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [AccessKeyService, LoggingService],
  controllers: [AccessKeyAdminController, AccessKeyUserController],
})
export class AccessKeyModule {}
