import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PrismaModule } from '../prisma.module';
import { AuthService } from '../auth/auth.service';
import { AuthGuard } from '../auth/auth.guard';

@Module({ imports: [PrismaModule], controllers: [NotificationsController], providers: [NotificationsService, AuthService, AuthGuard], exports: [NotificationsService] })
export class NotificationsModule {}
