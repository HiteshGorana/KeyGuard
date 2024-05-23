import {
  Controller,
  Post,
  Body,
  Delete,
  Param,
  Get,
  Patch,
} from '@nestjs/common';
import { AccessKeyService } from '../services/access-key.service';
import { AccessKey } from '../schemas/access-key.schema';
import { CreateAccessKeyDto } from '../dto/create-access-key.dto';
import { UpdateAccessKeyDto } from '../dto/update-access-key.dto';

@Controller('admin/access-keys')
export class AccessKeyAdminController {
  constructor(private readonly accessKeyService: AccessKeyService) {}

  // Endpoint to create a new access key
  @Post()
  async createAccessKey(
    @Body() createAccessKeyDto: CreateAccessKeyDto,
  ): Promise<{ rateLimit: number; key: any; expiresAt: Date }> {
    return this.accessKeyService.createAccessKey(
      createAccessKeyDto.rateLimit,
      createAccessKeyDto.expiresInMs,
    );
  }

  // Endpoint to delete an existing access key
  @Delete(':key')
  async deleteAccessKey(
    @Param('key') key: string,
  ): Promise<{ deleted: boolean }> {
    return this.accessKeyService.deleteAccessKey(key);
  }

  // Endpoint to list all access keys
  @Get()
  async getAllAccessKeys(): Promise<AccessKey[]> {
    return this.accessKeyService.getAllAccessKeys();
  }

  // Endpoint to update an existing access key
  @Patch(':key')
  async updateAccessKey(
    @Param('key') key: string,
    @Body() updateAccessKeyDto: UpdateAccessKeyDto,
  ): Promise<{ updated: boolean }> {
    return this.accessKeyService.updateAccessKey(
      key,
      updateAccessKeyDto.rateLimit,
      updateAccessKeyDto.expiresInMs,
      updateAccessKeyDto.isDisabled,
    );
  }
}
