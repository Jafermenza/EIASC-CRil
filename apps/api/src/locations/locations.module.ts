import { Module } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../prisma.service';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';
import { GeographyAdminController } from './geography-admin.controller';
import { GeographyAdminService } from './geography-admin.service';

@Module({
  controllers: [LocationsController, GeographyAdminController],
  providers: [
    LocationsService,
    GeographyAdminService,
    PrismaService,
    AuthService,
    AuthGuard,
    RolesGuard,
  ],
  exports: [LocationsService, GeographyAdminService],
})
export class LocationsModule {}
