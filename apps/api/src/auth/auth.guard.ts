import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { verifyJwt } from './crypto';
import { AccessTokenPayload, AuthenticatedUser } from './auth.types';

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly secret = process.env.JWT_SECRET;

  constructor(private readonly authService: AuthService) {
    if (!this.secret || this.secret.length < 32) throw new Error('JWT_SECRET must be configured with at least 32 characters');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedException('Authentication required');

    try {
      const payload = verifyJwt<AccessTokenPayload>(header.slice(7).trim(), this.secret!);
      if (payload.type !== 'access' || !payload.sub) throw new Error('Invalid access token');
      request.user = await this.authService.me(payload.sub);
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }
}
