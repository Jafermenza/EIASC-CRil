import { Module } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AuthService } from '../auth/auth.service';
import { RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../prisma.service';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';

@Module({
  controllers: [LocationsController],
  providers: [LocationsService, PrismaService, AuthService, AuthGuard, RolesGuard],
  exports: [LocationsService],
})
export class LocationsModule {}
