import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';

describe('MVP foundation', () => {
  it('compiles the API module without a live database', async () => {
    const originalSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'test-jwt-secret-for-unit-tests-2026-32chars';

    try {
      const module = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(PrismaService)
        .useValue({ $connect: jest.fn(), $disconnect: jest.fn(), $queryRaw: jest.fn() })
        .compile();
      expect(module).toBeDefined();
    } finally {
      if (originalSecret === undefined) delete process.env.JWT_SECRET;
      else process.env.JWT_SECRET = originalSecret;
    }
  });
});
