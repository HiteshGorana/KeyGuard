import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Redis } from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AccessKey } from '../schemas/access-key.schema';

@Injectable()
export class TokenService {
  constructor(
    @InjectRedis() private readonly redisClient: Redis,
    @InjectModel(AccessKey.name)
    private readonly accessKeyModel: Model<AccessKey>,
  ) {}

  async getTokenInfo(key: string): Promise<any> {
    let accessKey: AccessKey;

    // Fetch from Redis
    const accessKeyFromRedis = await this.redisClient.get(`access-key:${key}`);
    if (accessKeyFromRedis) {
      accessKey = JSON.parse(accessKeyFromRedis) as AccessKey;
    } else {
      // Fetch from MongoDB
      const accessKeyFromDb = await this.accessKeyModel.findOne({ key }).exec();
      if (!accessKeyFromDb) {
        throw new NotFoundException('Invalid access key');
      }
      accessKey = accessKeyFromDb.toObject();

      // Cache in Redis
      await this.redisClient.set(
        `access-key:${key}`,
        JSON.stringify(accessKey),
      );
    }

    console.log(`\n===== Token Info Request =====`);
    console.log(`Access Key: ${JSON.stringify(accessKey, null, 2)}`);
    console.log(`Current Date: ${new Date().toISOString()}`);
    console.log(
      `Expires At: ${
        accessKey ? new Date(accessKey.expiresAt).toISOString() : 'N/A'
      }`,
    );
    console.log(`Is Disabled: ${accessKey ? accessKey.isDisabled : 'N/A'}`);
    console.log(`==============================\n`);

    if (accessKey.isDisabled || new Date() > new Date(accessKey.expiresAt)) {
      throw new ForbiddenException('Access key is disabled or expired');
    }

    const rateLimitKey = `rate-limit:${key}`;
    const requests = await this.redisClient.get(rateLimitKey);
    console.log(`\n===== Rate Limit Check =====`);
    console.log(`Rate Limit Key: ${rateLimitKey}`);
    console.log(`Requests: ${requests}`);
    console.log(`Rate Limit: ${accessKey.rateLimit}`);
    console.log(`============================\n`);
    if (requests && Number(requests) >= accessKey.rateLimit) {
      console.log(`\n===== Rate Limit Exceeded =====`);
      console.log(`Key: ${key}`);
      console.log(`Requests: ${requests}`);
      console.log(`Rate Limit: ${accessKey.rateLimit}`);
      console.log(`===============================\n`);
      throw new ForbiddenException('Rate limit exceeded');
    }

    const result = await this.redisClient
      .multi()
      .incr(rateLimitKey)
      .expire(rateLimitKey, 60) // Reset the count every minute
      .exec();
    const newRequestCount = result[0][1];

    // Return mock token information
    const tokenInfo = {
      userId: 'user123',
      email: 'user@example.com',
      roles: ['user'],
      permissions: ['read', 'write'],
    };

    // Log the request
    await this.redisClient.publish(
      'token-requests',
      JSON.stringify({
        action: 'TokenInfo',
        key: key,
        timestamp: new Date().toISOString(),
        success: true,
        requestCount: newRequestCount,
      }),
    );

    return tokenInfo;
  }
}
