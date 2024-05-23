import { IsNumber, IsOptional, IsBoolean, IsPositive } from 'class-validator';

export class UpdateAccessKeyDto {
  @IsNumber()
  @IsOptional()
  @IsPositive()
  rateLimit?: number;

  @IsNumber()
  @IsOptional()
  @IsPositive()
  expiresInMs?: number;

  @IsBoolean()
  @IsOptional()
  isDisabled?: boolean;
}
