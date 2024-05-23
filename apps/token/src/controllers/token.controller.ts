import { Controller, Get, Query } from '@nestjs/common';
import { TokenService } from '../services/token.service';

@Controller('token')
export class TokenController {
  constructor(private readonly tokenService: TokenService) {}

  @Get('info')
  async getTokenInfo(@Query('key') key: string) {
    return this.tokenService.getTokenInfo(key);
  }
}
