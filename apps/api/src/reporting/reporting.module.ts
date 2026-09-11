import { Module } from '@nestjs/common';
import { ReportingController } from './reporting.controller';
import { ReportingService } from './reporting.service';
import { PrismaModule } from '../prisma.module';
import { AuthorizationService } from '../auth/authorization.service';
import { AuthService } from '../auth/auth.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';

@Module({ imports: [PrismaModule], controllers: [ReportingController], providers: [ReportingService, AuthorizationService, AuthService, AuthGuard, RolesGuard] })
export class ReportingModule {}
