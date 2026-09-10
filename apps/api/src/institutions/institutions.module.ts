import { Module } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { AuthorizationService } from '../auth/authorization.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { LocationsModule } from '../locations/locations.module';
import { PrismaService } from '../prisma.service';
import { InstitutionsController } from './institutions.controller';
import { InstitutionsService } from './institutions.service';

@Module({
  imports: [LocationsModule],
  controllers: [InstitutionsController],
  providers: [InstitutionsService, PrismaService, AuthorizationService, AuthService, AuthGuard, RolesGuard],
  exports: [InstitutionsService],
})
export class InstitutionsModule {}
