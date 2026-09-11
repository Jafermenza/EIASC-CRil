import { Controller, Get, Param } from '@nestjs/common';
import { LicensingService } from './licensing.service';

@Controller('licenses')
export class PublicLicensingController {
  constructor(private readonly licensing: LicensingService) {}

  @Get('verify/:licenseNumber')
  verify(@Param('licenseNumber') licenseNumber: string) {
    return this.licensing.verifyPublic(licenseNumber);
  }
}
