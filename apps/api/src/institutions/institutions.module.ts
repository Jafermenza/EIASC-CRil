import { Module } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { AuthorizationService } from '../auth/authorization.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { LocationsModule } from '../locations/locations.module';
import { PaymentsModule } from '../payments/payments.module';
import { PrismaService } from '../prisma.service';
import { InstitutionDocumentsController } from './institution-documents.controller';
import { InstitutionDocumentsService } from './institution-documents.service';
import { InstitutionTypesAdminController } from './institution-types-admin.controller';
import { InstitutionsController } from './institutions.controller';
import { InstitutionsService } from './institutions.service';

@Module({
  imports: [LocationsModule, PaymentsModule],
  controllers: [InstitutionsController, InstitutionDocumentsController, InstitutionTypesAdminController],
  providers: [InstitutionsService, InstitutionDocumentsService, PrismaService, AuthorizationService, AuthService, AuthGuard, RolesGuard],
  exports: [InstitutionsService],
})
export class InstitutionsModule {}
