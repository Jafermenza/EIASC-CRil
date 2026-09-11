import { Module } from '@nestjs/common';
import { AllocationController } from './allocation.controller';
import { AllocationService } from './allocation.service';
import { PrismaModule } from '../prisma.module';
import { AuthService } from '../auth/auth.service';
import { AuthGuard } from '../auth/auth.guard';
import { AuthorizationService } from '../auth/authorization.service';
import { PrismaService } from '../prisma.service';

@Module({
  imports: [PrismaModule],
  controllers: [AllocationController],
  providers: [AllocationService, PrismaService, AuthService, AuthGuard, AuthorizationService],
})
export class AllocationModule {}
