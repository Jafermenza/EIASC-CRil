import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaModule } from './prisma.module';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { AuthGuard } from './auth/auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { AuthorizationService } from './auth/authorization.service';
import { LocationsModule } from './locations/locations.module';
import { RegistrationsModule } from './registrations/registrations.module';
import { InstitutionsModule } from './institutions/institutions.module';
import { UsersModule } from './users/users.module';
import { LicensingModule } from './licensing/licensing.module';
import { CredentialsModule } from './credentials/credentials.module';
import { MembershipModule } from './membership/membership.module';
import { ReportingModule } from './reporting/reporting.module';
import { AllocationModule } from './allocation/allocation.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [PrismaModule, LocationsModule, PaymentsModule, RegistrationsModule, InstitutionsModule, UsersModule, LicensingModule, CredentialsModule, MembershipModule, ReportingModule, AllocationModule, NotificationsModule],
  controllers: [HealthController, AuthController],
  providers: [AuthService, AuthGuard, RolesGuard, AuthorizationService],
  exports: [PrismaModule, AuthService, AuthGuard, RolesGuard, AuthorizationService],
})
export class AppModule {}
