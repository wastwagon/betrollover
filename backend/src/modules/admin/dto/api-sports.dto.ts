import { IsString, IsOptional } from 'class-validator';

export class UpdateApiSportsKeyDto {
  @IsString({ message: 'API key must be a string' })
  apiKey: string;
}

export class TestApiSportsConnectionDto {
  @IsOptional()
  @IsString({ message: 'API key must be a string' })
  apiKey?: string;
}
