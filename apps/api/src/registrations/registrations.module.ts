import { Module } from '@nestjs/common';
import { LocationsModule } from '../locations/locations.module';
import { PrismaService } from '../prisma.service';
import { RegistrationsController } from './registrations.controller';
import { RegistrationsService } from './registrations.service';

@Module({
  imports: [LocationsModule],
  controllers: [RegistrationsController],
  providers: [RegistrationsService, PrismaService],
  exports: [RegistrationsService],
})
export class RegistrationsModule {}
