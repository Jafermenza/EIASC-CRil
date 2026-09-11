import { Controller, Get, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}
  @Get()
  list(@Req() req: AuthenticatedRequest, @Query('unreadOnly') unreadOnly?: string) { return this.notifications.list(req.user!, unreadOnly === 'true'); }
  @Patch(':id/read')
  read(@Req() req: AuthenticatedRequest, @Param('id') id: string) { return this.notifications.markRead(req.user!, id); }
}
