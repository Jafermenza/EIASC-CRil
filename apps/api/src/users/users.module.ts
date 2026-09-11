import { Module } from '@nestjs/common';
import { AuthorizationService } from '../auth/authorization.service';
import { PrismaModule } from '../prisma.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [UsersService, AuthorizationService],
})
export class UsersModule {}
