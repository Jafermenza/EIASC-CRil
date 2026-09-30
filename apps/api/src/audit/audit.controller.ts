import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../prisma.service';

@Controller('audit')
@UseGuards(AuthGuard, RolesGuard)
@Roles(RoleCode.SUPER_ADMIN)
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('logs')
  async logs(@Req() request: AuthenticatedRequest, @Query('action') action?: string, @Query('entityType') entityType?: string, @Query('limit') limit?: string) {
    const take = Math.min(200, Math.max(1, Number(limit ?? 100)));
    return this.prisma.auditLog.findMany({
      where: {
        action: action?.trim() ? { contains: action.trim(), mode: 'insensitive' } : undefined,
        entityType: entityType?.trim() ? { contains: entityType.trim(), mode: 'insensitive' } : undefined,
      },
      orderBy: { createdAt: 'desc' },
      take,
      include: { actor: { select: { id: true, email: true, phone: true } } },
    });
  }
}
