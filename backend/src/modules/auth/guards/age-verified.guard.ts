import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { UserRole } from '../../users/entities/user.entity';
import { UsersService } from '../../users/users.service';

/**
 * Requires user to be age-verified (18+) before accessing real-money features.
 * Admins bypass this check. Use after JwtAuthGuard so user is authenticated.
 */
@Injectable()
export class AgeVerifiedGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user?.id) return false;

    if (user.role === UserRole.ADMIN) return true;

    const verified = await this.usersService.isAgeVerified(user.id);
    if (!verified) {
      throw new ForbiddenException({
        code: 'AGE_VERIFICATION_REQUIRED',
        message: 'You must verify you are 18 or older to access this feature',
      });
    }
    return true;
  }
}
