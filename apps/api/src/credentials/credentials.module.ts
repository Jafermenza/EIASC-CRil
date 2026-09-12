import { Module } from '@nestjs/common';
import { CredentialsController } from './credentials.controller';
import { PublicCredentialsController } from './public-credentials.controller';
import { CredentialConfigurationController } from './credential-configuration.controller';
import { CredentialsService } from './credentials.service';
import { CredentialConfigurationService } from './credential-configuration.service';
import { PrismaModule } from '../prisma.module';
import { AuthorizationService } from '../auth/authorization.service';
import { AuthService } from '../auth/auth.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [CredentialsController, PublicCredentialsController, CredentialConfigurationController],
  providers: [CredentialsService, CredentialConfigurationService, AuthorizationService, AuthService, AuthGuard, RolesGuard],
  exports: [CredentialsService, CredentialConfigurationService],
})
export class CredentialsModule {}
