import { Module } from '@nestjs/common';
import { AllocationController } from './allocation.controller';
import { AllocationService } from './allocation.service';
import { PrismaModule } from '../prisma.module';
import { AuthService } from '../auth/auth.service';
import { AuthGuard } from '../auth/auth.guard';

@Module({ imports: [PrismaModule], controllers: [AllocationController], providers: [AllocationService, AuthService, AuthGuard] })
export class AllocationModule {}
