import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Optional JWT guard: validates token when present but does not reject when absent.
 * Use for routes that work for both authenticated and anonymous users.
 */
@Injectable()
export class OptionalJwtGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any) {
    if (err || !user) return null;
    return user;
  }
}
