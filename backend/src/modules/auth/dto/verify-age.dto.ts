import { IsDateString } from 'class-validator';

export class VerifyAgeDto {
  @IsDateString(undefined, { message: 'Date of birth required (YYYY-MM-DD)' })
  dateOfBirth: string;
}
