import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

const MANAGE_ROLES = ['SUPER_ADMIN'];

type BankInput = { id?: string; bankName: string; accountName: string; accountNumber: string; branch?: string; active?: boolean };
type PaymentSettingsInput = { individualFee?: number | null; institutionFee?: number | null; banks?: BankInput[] };

@Injectable()
export class PaymentSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  private async setting(key: string): Promise<string | null> {
    const rows = await this.prisma.$queryRaw<Array<{ value: string | null }>>`SELECT "value" FROM "PlatformSetting" WHERE "key"=${key} LIMIT 1`;
    return rows[0]?.value ?? null;
  }

  private async setSetting(key: string, value: string | null) {
    await this.prisma.$executeRaw`
      INSERT INTO "PlatformSetting" ("key","value","updatedAt") VALUES (${key},${value},CURRENT_TIMESTAMP)
      ON CONFLICT ("key") DO UPDATE SET "value"=EXCLUDED."value", "updatedAt"=CURRENT_TIMESTAMP
    `;
  }

  async getPublic() {
    const individual = await this.setting('REGISTRATION_INDIVIDUAL_FEE_ETB');
    const institution = await this.setting('REGISTRATION_INSTITUTION_FEE_ETB');
    const banks = await this.prisma.$queryRaw<Array<{ id: string; bankName: string; accountName: string; accountNumber: string; branch: string | null }>>`
      SELECT "id","bankName","accountName","accountNumber","branch"
      FROM "RegistrationBank"
      WHERE "active"=TRUE
      ORDER BY "displayOrder","bankName"
    `;
    return {
      individual: Number(individual ?? process.env.REGISTRATION_INDIVIDUAL_FEE_ETB ?? 100),
      institution: Number(institution ?? process.env.REGISTRATION_INSTITUTION_FEE_ETB ?? 500),
      banks,
    };
  }

  async getAdmin(roles: string[]) {
    if (!roles.some((role) => MANAGE_ROLES.includes(role))) throw new ForbiddenException('Super Admin permission required');
    const publicConfig = await this.getPublic();
    const telebirr = {
      accountName: process.env.REGISTRATION_TELEBIRR_NAME ?? '',
      accountNumber: process.env.REGISTRATION_TELEBIRR_NUMBER ?? '',
      configured: Boolean(process.env.TELEBIRR_APP_SECRET),
    };
    return { ...publicConfig, telebirr };
  }

  async update(roles: string[], input: PaymentSettingsInput) {
    if (!roles.some((role) => MANAGE_ROLES.includes(role))) throw new ForbiddenException('Super Admin permission required');
    if (input.individualFee !== undefined && input.individualFee !== null && (!Number.isFinite(input.individualFee) || input.individualFee < 0)) throw new BadRequestException('Individual fee must be a non-negative amount');
    if (input.institutionFee !== undefined && input.institutionFee !== null && (!Number.isFinite(input.institutionFee) || input.institutionFee < 0)) throw new BadRequestException('Institution fee must be a non-negative amount');
    if (input.individualFee !== undefined) await this.setSetting('REGISTRATION_INDIVIDUAL_FEE_ETB', input.individualFee === null ? null : String(input.individualFee));
    if (input.institutionFee !== undefined) await this.setSetting('REGISTRATION_INSTITUTION_FEE_ETB', input.institutionFee === null ? null : String(input.institutionFee));

    const banks = input.banks;
    if (banks !== undefined) {
      await this.prisma.$transaction(async (tx) => {
        const ids = banks.filter((b) => b.id).map((b) => b.id as string);
        if (ids.length) await tx.$executeRawUnsafe(`UPDATE "RegistrationBank" SET "active"=FALSE,"updatedAt"=CURRENT_TIMESTAMP WHERE "id" NOT IN (${ids.map((id) => `'${id.replace(/'/g, "''")}'`).join(',')})`);
        else await tx.$executeRaw`UPDATE "RegistrationBank" SET "active"=FALSE,"updatedAt"=CURRENT_TIMESTAMP`;
        for (let index = 0; index < banks.length; index += 1) {
          const bank = banks[index];
          if (!bank.bankName?.trim() || !bank.accountName?.trim() || !bank.accountNumber?.trim()) throw new BadRequestException('Each bank requires bank name, account name and account number');
          if (bank.id) {
            await tx.$executeRaw`UPDATE "RegistrationBank" SET "bankName"=${bank.bankName.trim()},"accountName"=${bank.accountName.trim()},"accountNumber"=${bank.accountNumber.trim()},"branch"=${bank.branch?.trim() || null},"active"=${bank.active !== false},"displayOrder"=${index},"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=${bank.id}::uuid`;
          } else {
            await tx.$executeRaw`INSERT INTO "RegistrationBank" ("bankName","accountName","accountNumber","branch","active","displayOrder","updatedAt") VALUES (${bank.bankName.trim()},${bank.accountName.trim()},${bank.accountNumber.trim()},${bank.branch?.trim() || null},${bank.active !== false},${index},CURRENT_TIMESTAMP)`;
          }
        }
      });
    }
    return this.getAdmin(roles);
  }
}
