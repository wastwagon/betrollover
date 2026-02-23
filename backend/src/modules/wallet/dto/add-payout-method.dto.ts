import { IsString, IsOptional, IsIn, MinLength } from 'class-validator';

export class AddPayoutMethodDto {
  @IsIn(['mobile_money', 'bank', 'manual', 'crypto'])
  type: 'mobile_money' | 'bank' | 'manual' | 'crypto';

  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @IsString()
  bankCode?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsIn(['mobile_money', 'bank'])
  manualMethod?: 'mobile_money' | 'bank';

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  walletAddress?: string;

  @IsOptional()
  @IsString()
  cryptoCurrency?: string;
}
