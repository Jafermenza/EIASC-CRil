import { Module } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { AuthGuard } from '../auth/auth.guard';
import { AuthorizationService } from '../auth/authorization.service';
import { PrismaService } from '../prisma.service';
import { MembershipController } from './membership.controller';
import { MembershipService } from './membership.service';

@Module({
  controllers: [MembershipController],
  providers: [
    MembershipService,
    PrismaService,
    AuthService,
    AuthGuard,
    AuthorizationService,
  ],
  exports: [MembershipService],
})
export class MembershipModule {}
