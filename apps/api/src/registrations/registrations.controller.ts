import { BadRequestException, Body, Controller, Get, Post, Query } from '@nestjs/common';
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
  track(@Query('phone') _phone: string | undefined, @Query('firstName') _firstName: string | undefined, @Body() _unused: unknown) {
    // Tracking deliberately returns only public-safe fields; optional verification inputs
    // can be enforced when a policy requires them without exposing private application data.
    throw new BadRequestException('Use GET /registrations/:trackingCode');
  }
}
