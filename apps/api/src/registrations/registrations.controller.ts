import { BadRequestException, Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { IndividualRegistrationInput } from './registration.types';
import { RegistrationsService } from './registrations.service';

@Controller('registrations')
export class RegistrationsController {
  constructor(private readonly registrations: RegistrationsService) {}

  @Post('individual')
  individual(@Body() body: IndividualRegistrationInput) {
    if (!body || typeof body !== 'object') throw new BadRequestException('Registration payload is required');
    return this.registrations.createIndividual(body);
  }

  @Get(':trackingCode')
  track(@Param('trackingCode') trackingCode: string, @Query('phone') _phone?: string, @Query('firstName') _firstName?: string) {
    return this.registrations.track(trackingCode);
  }
}
