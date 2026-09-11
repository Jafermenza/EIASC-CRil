import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';
import { GeographyAdminController } from './geography-admin.controller';
import { GeographyAdminService } from './geography-admin.service';

@Module({
  controllers: [LocationsController, GeographyAdminController],
  providers: [LocationsService, GeographyAdminService, PrismaService],
  exports: [LocationsService, GeographyAdminService],
})
export class LocationsModule {}
