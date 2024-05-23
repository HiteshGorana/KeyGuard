import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AccessKey } from '../schemas/access-key.schema';

@Injectable()
export class LoggingService implements OnModuleInit {
  private readonly logger = new Logger(LoggingService.name);

  constructor(
    @InjectRedis() private readonly redisClient: Redis,
    @InjectModel(AccessKey.name)
    private readonly accessKeyModel: Model<AccessKey>,
  ) {}

  onModuleInit() {
    this.redisClient.subscribe('token-requests', (err, count) => {
      if (err) {
        this.logger.error('Failed to subscribe: ' + err.message);
      } else {
        this.logger.log(
          `Subscribed successfully! This client is currently subscribed to ${count} channels.`,
        );
      }
    });

    this.redisClient.on('message', async (channel, message) => {
      if (channel === 'token-requests') {
        this.logger.log(`Received message from channel ${channel}: ${message}`);
        const event = JSON.parse(message);
        this.logger.debug(`Parsed event: ${JSON.stringify(event, null, 2)}`);

        try {
          switch (event.action) {
            case 'create':
              const newKey = new this.accessKeyModel({
                key: event.key.key,
                rateLimit: event.key.rateLimit,
                expiresAt: new Date(event.key.expiresAt),
                isDisabled: event.key.isDisabled ?? false,
              });
              await newKey.save();
              this.logger.log(`Access key created: ${newKey.key}`);
              break;
            case 'update':
              await this.accessKeyModel
                .updateOne(
                  { key: event.key.key },
                  {
                    key: event.key.key,
                    rateLimit: event.key.rateLimit,
                    expiresAt: new Date(event.key.expiresAt),
                    isDisabled: event.key.isDisabled ?? false,
                  },
                  { upsert: true },
                )
                .exec();
              this.logger.log(`Access key updated: ${event.key.key}`);
              break;
            case 'disable':
              const accessKey = await this.accessKeyModel
                .findOne({ key: event.key.key })
                .exec();
              accessKey.isDisabled = true;
              await accessKey.save();
              this.logger.log(`Access key disabled: ${event.key.key}`);
              break;
            case 'delete':
              await this.accessKeyModel
                .deleteOne({ key: event.key.key })
                .exec();
              this.logger.log(`Access key deleted: ${event.key.key}`);
              break;
            default:
              this.logger.warn(`Unknown action: ${event.action}`);
          }
        } catch (error) {
          this.logger.error(
            `Failed to process event: ${error.message}`,
            error.stack,
          );
        }
      }
    });
  }
}
