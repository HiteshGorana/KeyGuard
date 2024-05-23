import {
  BadRequestException,
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AccessKey } from '../schemas/access-key.schema';
import { v4 as uuidv4 } from 'uuid';
import { Redis } from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';

@Injectable()
export class AccessKeyService {
  private publisherClient: Redis;

  constructor(
    @InjectModel(AccessKey.name)
    private readonly accessKeyModel: Model<AccessKey>,
    @InjectRedis() private readonly redisClient: Redis,
  ) {
    this.publisherClient = new Redis();
  }

  async createAccessKey(
    rateLimit: number,
    expiresInMs: number,
  ): Promise<{ rateLimit: number; key: any; expiresAt: Date }> {
    if (rateLimit <= 0 || expiresInMs <= 0) {
      throw new BadRequestException(
        'Rate limit and expiration time must be greater than zero',
      );
    }

    const key = uuidv4();
    const expiresAt = new Date(Date.now() + expiresInMs);
    const accessKeyData = { key, rateLimit, expiresAt, isDisabled: false };

    try {
      // Save to Redis
      await this.publisherClient.set(
        `access-key:${key}`,
        JSON.stringify(accessKeyData),
      );
      // Publish the event using the publisher client
      await this.publisherClient.publish(
        'token-requests',
        JSON.stringify({
          action: 'create',
          key: accessKeyData,
        }),
      );

      return accessKeyData;
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to create access key',
        error.message,
      );
    }
  }

  async deleteAccessKey(key: string): Promise<{ deleted: boolean }> {
    try {
      // Check if the key exists in Redis
      const exists = await this.publisherClient.exists(`access-key:${key}`);
      if (!exists) {
        throw new NotFoundException(`Access key ${key} not found`);
      }

      // Delete from Redis
      await this.publisherClient.del(`access-key:${key}`);

      // Publish the event using the publisher client
      await this.publisherClient.publish(
        'token-requests',
        JSON.stringify({
          action: 'delete',
          key: { key },
        }),
      );
      return { deleted: true };
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to delete access key from Redis',
        error.message,
      );
    }
  }

  async getAllAccessKeys(): Promise<AccessKey[]> {
    return this.accessKeyModel.find().exec();
  }

  async updateAccessKey(
    key: string,
    rateLimit?: number,
    expiresInMs?: number,
    isDisabled?: boolean,
  ): Promise<{ updated: boolean }> {
    try {
      // Check if the key exists in Redis
      const cachedKey = await this.publisherClient.get(`access-key:${key}`);
      if (!cachedKey) {
        throw new NotFoundException(`Access key ${key} not found`);
      }

      const accessKey = JSON.parse(cachedKey);

      if (rateLimit !== undefined && rateLimit > 0) {
        accessKey.rateLimit = rateLimit;
      } else if (rateLimit !== undefined) {
        throw new BadRequestException('Rate limit must be greater than zero');
      }

      if (expiresInMs !== undefined && expiresInMs > 0) {
        accessKey.expiresAt = new Date(Date.now() + expiresInMs).toISOString();
      } else if (expiresInMs !== undefined) {
        throw new BadRequestException(
          'Expiration time must be greater than zero',
        );
      }

      if (isDisabled !== undefined) {
        accessKey.isDisabled = isDisabled;
      }

      // Update in Redis
      await this.publisherClient.set(
        `access-key:${key}`,
        JSON.stringify(accessKey),
      );

      // Publish the event using the publisher client
      await this.publisherClient.publish(
        'token-requests',
        JSON.stringify({
          action: 'update',
          key: accessKey,
        }),
      );
      return { updated: true };
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to update access key in Redis',
        error.message,
      );
    }
  }

  async getAccessKeyDetails(key: string): Promise<AccessKey> {
    // First, try to get the access key from Redis
    const cachedKey = await this.publisherClient.get(`access-key:${key}`);
    if (cachedKey) {
      return JSON.parse(cachedKey);
    }

    // If not found in Redis, get from MongoDB
    const accessKey = await this.accessKeyModel.findOne({ key }).exec();
    if (!accessKey) {
      throw new NotFoundException(`Access key ${key} not found`);
    }

    // Save the access key to Redis for future queries
    await this.publisherClient.set(
      `access-key:${key}`,
      JSON.stringify(accessKey),
    );

    return accessKey;
  }

  async disableAccessKey(key: string): Promise<{ disabled: any }> {
    try {
      // Attempt to get the access key from Redis
      let accessKeyData = await this.publisherClient.get(`access-key:${key}`);

      if (accessKeyData) {
        // If found in Redis, parse the data
        const accessKey = JSON.parse(accessKeyData);
        accessKey.isDisabled = true;

        // Update the Redis cache
        await this.publisherClient.set(
          `access-key:${key}`,
          JSON.stringify(accessKey),
        );
      } else {
        // If not found in Redis, retrieve from MongoDB
        const accessKey = await this.accessKeyModel.findOne({ key }).exec();
        if (!accessKey) {
          throw new NotFoundException(`Access key ${key} not found`);
        }
        accessKey.isDisabled = true;
        await accessKey.save();

        // Update Redis cache with the new state
        accessKeyData = JSON.stringify(accessKey);
        await this.publisherClient.set(`access-key:${key}`, accessKeyData);
      }

      // Publish the update event
      await this.publisherClient.publish(
        'token-requests',
        JSON.stringify({
          action: 'disable',
          key: JSON.parse(accessKeyData),
        }),
      );
      return { disabled: true };
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to disable access key',
        error.message,
      );
    }
  }
}
