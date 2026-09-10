import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaService } from './prisma.service';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { AuthGuard } from './auth/auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { AuthorizationService } from './auth/authorization.service';
import { LocationsModule } from './locations/locations.module';
import { RegistrationsModule } from './registrations/registrations.module';
import { InstitutionsModule } from './institutions/institutions.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [LocationsModule, RegistrationsModule, InstitutionsModule, UsersModule],
  controllers: [HealthController, AuthController],
  providers: [PrismaService, AuthService, AuthGuard, RolesGuard, AuthorizationService],
  exports: [PrismaService, AuthService, AuthGuard, RolesGuard, AuthorizationService],
})
export class AppModule {}
