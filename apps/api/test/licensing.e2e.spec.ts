import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { jest } from '@jest/globals';
import { LicensingController } from '../src/licensing/licensing.controller';
import { LicensingService } from '../src/licensing/licensing.service';
import { AuthGuard } from '../src/auth/auth.guard';
import { RolesGuard } from '../src/auth/roles.guard';

describe('Licensing API workflow (e2e)', () => {
  let app: INestApplication;
  const service = {
    approve: jest.fn().mockResolvedValue({ id: 'license-1', applicationStatus: 'APPROVED' }),
    reject: jest.fn(),
    resubmit: jest.fn(),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [LicensingController],
      providers: [{ provide: LicensingService, useValue: service }],
    })
      .overrideGuard(AuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();
    app = module.createNestApplication();
    await app.init();
    await app.listen(0);
  });

  afterAll(async () => {
    await app.close();
  });

  it('exposes the approval action through the HTTP route', async () => {
    const response = await fetch(`${await app.getUrl()}/licenses/license-1/approve`, { method: 'POST' });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: 'license-1', applicationStatus: 'APPROVED' });
    expect(service.approve).toHaveBeenCalledWith(undefined, 'license-1');
  });
});
