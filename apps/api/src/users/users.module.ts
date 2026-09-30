import { Module } from '@nestjs/common';
import { AuthorizationService } from '../auth/authorization.service';
import { AuthGuard } from '../auth/auth.guard';
import { AuthService } from '../auth/auth.service';
import { RolesGuard } from '../auth/roles.guard';
import { CredentialProvisioningService } from '../auth/credential-provisioning.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaModule } from '../prisma.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [UsersService, AuthorizationService, AuthService, AuthGuard, RolesGuard, CredentialProvisioningService, NotificationsService],
})
export class UsersModule {}
