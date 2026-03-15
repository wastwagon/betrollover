import { IsNotEmpty, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class AppleUserDto {
  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsObject()
  name?: { firstName?: string; lastName?: string };
}

export class AppleLoginDto {
  @IsString()
  @IsNotEmpty()
  id_token: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AppleUserDto)
  user?: AppleUserDto;
}
