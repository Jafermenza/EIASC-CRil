import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';

@Module({
  controllers: [LocationsController],
  providers: [LocationsService, PrismaService],
  exports: [LocationsService],
})
export class LocationsModule {}
