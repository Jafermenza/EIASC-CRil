import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';

describe('MVP foundation', () => {
  it('compiles the API module without a live database', async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({ $connect: jest.fn(), $disconnect: jest.fn(), $queryRaw: jest.fn() })
      .compile();
    expect(module).toBeDefined();
  });
});
