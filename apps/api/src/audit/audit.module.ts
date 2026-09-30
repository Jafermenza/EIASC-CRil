import { Module } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AuthService } from '../auth/auth.service';
import { RolesGuard } from '../auth/roles.guard';
import { AuditController } from './audit.controller';

@Module({ controllers: [AuditController], providers: [AuthService, AuthGuard, RolesGuard] })
export class AuditModule {}
