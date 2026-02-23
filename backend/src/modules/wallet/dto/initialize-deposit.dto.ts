import { IsNumber, Min } from 'class-validator';

export class InitializeDepositDto {
  @IsNumber()
  @Min(1, { message: 'Amount must be at least 1' })
  amount: number;
}
