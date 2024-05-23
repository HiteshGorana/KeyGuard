import { IsNumber, IsPositive } from 'class-validator';

export class CreateAccessKeyDto {
  @IsNumber()
  @IsPositive()
  rateLimit: number;

  @IsNumber()
  @IsPositive()
  expiresInMs: number;
}
