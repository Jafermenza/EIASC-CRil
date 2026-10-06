import { Module } from '@nestjs/common';
import { LocationsModule } from '../locations/locations.module';
import { PaymentsModule } from '../payments/payments.module';
import { AuthorizationService } from '../auth/authorization.service';
import { AuthService } from '../auth/auth.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CredentialProvisioningService } from '../auth/credential-provisioning.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma.service';
import { RegistrationsController } from './registrations.controller';
import { RegistrationsService } from './registrations.service';
import { RegistrationDocumentsController } from './registration-documents.controller';
import { RegistrationDocumentsService } from './registration-documents.service';

@Module({
  imports: [LocationsModule, PaymentsModule],
  controllers: [RegistrationsController, RegistrationDocumentsController],
  providers: [RegistrationsService, RegistrationDocumentsService, PrismaService, AuthorizationService, AuthService, AuthGuard, RolesGuard, CredentialProvisioningService, NotificationsService],
  exports: [RegistrationsService],
})
export class RegistrationsModule {}
