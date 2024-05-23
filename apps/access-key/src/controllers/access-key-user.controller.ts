import { Controller, Get, Param, Patch } from '@nestjs/common';
import { AccessKeyService } from '../services/access-key.service';
import { AccessKey } from '../schemas/access-key.schema';

@Controller('access-keys')
export class AccessKeyUserController {
  constructor(private readonly accessKeyService: AccessKeyService) {}

  // Endpoint to retrieve details of a specific access key
  @Get(':key')
  async getAccessKeyDetails(@Param('key') key: string): Promise<AccessKey> {
    return this.accessKeyService.getAccessKeyDetails(key);
  }

  // Endpoint to disable an access key
  @Patch(':key/disable')
  async disableAccessKey(@Param('key') key: string): Promise<{ disabled: any }> {
    return this.accessKeyService.disableAccessKey(key);
  }
}
