import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PaymentsController } from './payments.controller';
import { PaymentSettingsController } from './payment-settings.controller';
import { PaymentsService } from './payments.service';
import { PaymentSettingsService } from './payment-settings.service';

@Module({
  controllers: [PaymentsController, PaymentSettingsController],
  providers: [PaymentsService, PaymentSettingsService, PrismaService],
  exports: [PaymentsService, PaymentSettingsService],
})
export class PaymentsModule {}
