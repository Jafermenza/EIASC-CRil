import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RoleCode, UserStatus } from '@prisma/client';
import { createOpaqueToken, hashPassword, hashToken, signJwt, verifyJwt, verifyPassword } from './crypto';
import { AccessTokenPayload, AuthenticatedUser, RefreshTokenPayload } from './auth.types';

const ACCESS_TTL_SECONDS = 15 * 60;
const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60;
const RESET_TTL_SECONDS = 30 * 60;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly issuer = process.env.JWT_ISSUER ?? 'eiasc-cril';
  private readonly secret = process.env.JWT_SECRET;

  constructor(private readonly prisma: PrismaService) {
    if (!this.secret || this.secret.length < 32) {
      throw new Error('JWT_SECRET must be configured with at least 32 characters');
    }
  }

  async login(identifier: string, password: string, requestId?: string) {
    const normalized = identifier.trim();
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ email: normalized.toLowerCase() }, { phone: normalized }] },
      include: { roles: { include: { role: true } } },
    });

    if (!user || user.status !== UserStatus.ACTIVE || !(await verifyPassword(password, user.passwordHash))) {
      await this.audit(null, 'LOGIN_FAILED', 'User', null, requestId, { identifierType: normalized.includes('@') ? 'email' : 'phone' });
      throw new UnauthorizedException('Invalid credentials');
    }

    const roles = user.roles.map((item) => item.role.code);
    const accessToken = this.issueAccessToken(user.id);
    const refreshToken = await this.issueRefreshToken(user.id);

    await this.audit(user.id, 'LOGIN_SUCCESS', 'User', user.id, requestId, { roles });
    return { accessToken, refreshToken, expiresIn: ACCESS_TTL_SECONDS, user: this.toAuthUser(user.id, user.email, user.phone, user.status, roles, user.jurisdictionLevel, user.jurisdictionId, user.institutionId) };
  }

  async refresh(token: string, requestId?: string) {
    let payload: RefreshTokenPayload;
    try {
      payload = verifyJwt<RefreshTokenPayload>(token, this.secret!);
      if (payload.type !== 'refresh') throw new Error('Wrong token type');
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: { include: { roles: { include: { role: true } } } } } });
    if (!stored || stored.revokedAt || stored.expiresAt <= new Date() || stored.user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
    const roles = stored.user.roles.map((item) => item.role.code);
    const accessToken = this.issueAccessToken(stored.user.id);
    const refreshToken = await this.issueRefreshToken(stored.user.id);
    await this.audit(stored.user.id, 'TOKEN_REFRESH', 'User', stored.user.id, requestId);

    return { accessToken, refreshToken, expiresIn: ACCESS_TTL_SECONDS, user: this.toAuthUser(stored.user.id, stored.user.email, stored.user.phone, stored.user.status, roles, stored.user.jurisdictionLevel, stored.user.jurisdictionId, stored.user.institutionId) };
  }

  async logout(token: string, requestId?: string) {
    const tokenHash = hashToken(token);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (stored && !stored.revokedAt) {
      await this.prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
      await this.audit(stored.userId, 'LOGOUT', 'User', stored.userId, requestId);
    }
    return { success: true };
  }

  async me(userId: string): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { roles: { include: { role: true } } } });
    if (!user || user.status !== UserStatus.ACTIVE) throw new UnauthorizedException('Account unavailable');
    const roles = user.roles.map((item) => item.role.code);
    return this.toAuthUser(user.id, user.email, user.phone, user.status, roles, user.jurisdictionLevel, user.jurisdictionId, user.institutionId);
  }

  async forgotPassword(identifier: string, requestId?: string) {
    const normalized = identifier.trim();
    const user = await this.prisma.user.findFirst({ where: { OR: [{ email: normalized.toLowerCase() }, { phone: normalized }] } });
    if (user) {
      const rawToken = createOpaqueToken();
      await this.prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
      await this.prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash: hashToken(rawToken), expiresAt: new Date(Date.now() + RESET_TTL_SECONDS * 1000) } });
      await this.audit(user.id, 'PASSWORD_RESET_REQUESTED', 'User', user.id, requestId);
      // Delivery is intentionally delegated to the notification module in a later MVP milestone.
      this.logger.log(`Password reset requested for user ${user.id}`);
    }
    return { success: true, message: 'If the account exists, password reset instructions will be sent.' };
  }

  async resetPassword(token: string, newPassword: string, requestId?: string) {
    if (newPassword.length < 10) throw new BadRequestException('Password must be at least 10 characters');
    const stored = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
    if (!stored || stored.usedAt || stored.expiresAt <= new Date()) throw new BadRequestException('Invalid or expired reset token');

    const passwordHash = await hashPassword(newPassword);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: stored.userId }, data: { passwordHash } }),
      this.prisma.passwordResetToken.update({ where: { id: stored.id }, data: { usedAt: new Date() } }),
      this.prisma.refreshToken.updateMany({ where: { userId: stored.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
    await this.audit(stored.userId, 'PASSWORD_RESET_COMPLETED', 'User', stored.userId, requestId);
    return { success: true };
  }

  issueAccessToken(userId: string): string {
    const now = Math.floor(Date.now() / 1000);
    const payload: AccessTokenPayload = { sub: userId, type: 'access', iss: this.issuer, iat: now, exp: now + ACCESS_TTL_SECONDS };
    return signJwt(payload, this.secret!);
  }

  private async issueRefreshToken(userId: string): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const jti = createOpaqueToken(18);
    const token = signJwt({ sub: userId, type: 'refresh', jti, iss: this.issuer, iat: now, exp: now + REFRESH_TTL_SECONDS }, this.secret!);
    await this.prisma.refreshToken.create({ data: { userId, tokenHash: hashToken(token), expiresAt: new Date((now + REFRESH_TTL_SECONDS) * 1000) } });
    return token;
  }

  private toAuthUser(id: string, email: string | null, phone: string | null, status: UserStatus, roles: RoleCode[], jurisdictionLevel: AuthenticatedUser['jurisdictionLevel'], jurisdictionId: string | null, institutionId: string | null): AuthenticatedUser {
    return { id, email, phone, status, roles, jurisdictionLevel, jurisdictionId, institutionId };
  }

  private async audit(actorUserId: string | null, action: string, entityType: string, entityId: string | null, requestId?: string, metadata?: Record<string, unknown>) {
    await this.prisma.auditLog.create({ data: { actorUserId, action, entityType, entityId, requestId, metadata } });
  }
}
