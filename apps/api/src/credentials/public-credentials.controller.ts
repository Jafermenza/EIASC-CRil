import { Controller, Get, Param } from '@nestjs/common';
import { CredentialsService } from './credentials.service';

@Controller('credentials/verify')
export class PublicCredentialsController {
  constructor(private readonly credentials: CredentialsService) {}
  @Get(':token')
  verify(@Param('token') token: string) { return this.credentials.verify(token); }
}
