import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationDispatcherService } from './notification-dispatcher.service';
import { PrismaModule } from '../prisma.module';
import { AuthService } from '../auth/auth.service';
import { AuthGuard } from '../auth/auth.guard';

@Module({
  imports: [PrismaModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationDispatcherService, AuthService, AuthGuard],
  exports: [NotificationsService],
})
export class NotificationsModule {}
