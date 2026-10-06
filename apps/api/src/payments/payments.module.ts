import { Module } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AuthService } from '../auth/auth.service';
import { AuthorizationService } from '../auth/authorization.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../prisma.service';
import { PaymentsController } from './payments.controller';
import { PaymentSettingsController } from './payment-settings.controller';
import { PaymentsService } from './payments.service';
import { PaymentSettingsService } from './payment-settings.service';

@Module({
  controllers: [PaymentsController, PaymentSettingsController],
  providers: [
    PaymentsService,
    PaymentSettingsService,
    PrismaService,
    AuthService,
    AuthorizationService,
    NotificationsService,
    AuthGuard,
    RolesGuard,
  ],
  exports: [PaymentsService, PaymentSettingsService],
})
export class PaymentsModule {}
