import { Module } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { AuthorizationService } from '../auth/authorization.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../prisma.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { MembershipController } from './membership.controller';
import { MembershipService } from './membership.service';

@Module({
  imports: [NotificationsModule],
  controllers: [MembershipController],
  providers: [MembershipService, PrismaService, AuthorizationService, AuthService, AuthGuard, RolesGuard],
})
export class MembershipModule {}
