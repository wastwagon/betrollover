import { IsString, IsIn, IsOptional } from 'class-validator';

export class VerifyIapDto {
  @IsIn(['ios', 'android'])
  platform: 'ios' | 'android';

  @IsString()
  productId: string;

  @IsString()
  transactionId: string;

  @IsOptional()
  @IsString()
  receipt?: string;

  @IsOptional()
  @IsString()
  purchaseToken?: string;
}
