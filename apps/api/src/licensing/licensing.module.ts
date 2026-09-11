import { Module } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { AuthorizationService } from '../auth/authorization.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../prisma.service';
import { LicensingController } from './licensing.controller';
import { LicensingService } from './licensing.service';

@Module({
  controllers: [LicensingController],
  providers: [LicensingService, PrismaService, AuthorizationService, AuthService, AuthGuard, RolesGuard],
  exports: [LicensingService],
})
export class LicensingModule {}
