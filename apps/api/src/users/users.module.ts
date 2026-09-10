import { Module } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { AuthorizationService } from '../auth/authorization.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../prisma.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [
    UsersService,
    PrismaService,
    AuthorizationService,
    AuthService,
    AuthGuard,
    RolesGuard,
  ],
})
export class UsersModule {}
