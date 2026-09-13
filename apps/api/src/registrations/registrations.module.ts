import { Module } from '@nestjs/common';
import { LocationsModule } from '../locations/locations.module';
import { PaymentsModule } from '../payments/payments.module';
import { AuthorizationService } from '../auth/authorization.service';
import { AuthService } from '../auth/auth.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../prisma.service';
import { RegistrationsController } from './registrations.controller';
import { RegistrationsService } from './registrations.service';

@Module({
  imports: [LocationsModule, PaymentsModule],
  controllers: [RegistrationsController],
  providers: [RegistrationsService, PrismaService, AuthorizationService, AuthService, AuthGuard, RolesGuard],
  exports: [RegistrationsService],
})
export class RegistrationsModule {}
