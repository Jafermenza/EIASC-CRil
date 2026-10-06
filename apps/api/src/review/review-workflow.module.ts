import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuthorizationService } from '../auth/authorization.service';
import { AuthService } from '../auth/auth.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { PaymentsModule } from '../payments/payments.module';
import { RegistrationsModule } from '../registrations/registrations.module';
import { InstitutionsModule } from '../institutions/institutions.module';
import { ReviewWorkflowController } from './review-workflow.controller';
import { ReviewWorkflowService } from './review-workflow.service';

@Module({
  imports: [PaymentsModule, RegistrationsModule, InstitutionsModule],
  controllers: [ReviewWorkflowController],
  providers: [ReviewWorkflowService, PrismaService, AuthorizationService, AuthService, AuthGuard, RolesGuard],
})
export class ReviewWorkflowModule {}
