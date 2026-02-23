import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/** Date format YYYY-MM-DD */
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

@ValidatorConstraint({ name: 'MatchPassword', async: false })
class MatchPasswordConstraint implements ValidatorConstraintInterface {
  validate(confirmPassword: string, args: ValidationArguments) {
    const obj = args.object as { password?: string };
    return obj.password === confirmPassword;
  }
  defaultMessage() {
    return 'Passwords do not match';
  }
}

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(3, { message: 'Username must be at least 3 characters' })
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9_]+$/, { message: 'Username can only contain letters, numbers, and underscores' })
  username: string;

  @IsString()
  @MinLength(2, { message: 'Display name must be at least 2 characters' })
  @MaxLength(100)
  @Matches(/^[a-zA-Z\s'-]+$/, { message: 'Use your real full name (letters, spaces, hyphens only)' })
  displayName: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/, {
    message: 'Password must include uppercase, lowercase, number and special character (@$!%*?&)',
  })
  password: string;

  @IsString()
  @MinLength(8, { message: 'Password confirmation required' })
  @Validate(MatchPasswordConstraint)
  confirmPassword: string;

  @IsString()
  @MinLength(4, { message: 'Verification code required' })
  @MaxLength(10)
  otpCode: string;

  @IsString()
  @Matches(DATE_REGEX, { message: 'Date of birth must be in YYYY-MM-DD format' })
  dateOfBirth: string;
}
