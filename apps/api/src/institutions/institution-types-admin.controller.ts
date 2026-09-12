import { BadRequestException, Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../prisma.service';

@UseGuards(AuthGuard, RolesGuard)
@Roles(RoleCode.SUPER_ADMIN)
@Controller('admin/institution-types')
export class InstitutionTypesAdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() { return this.prisma.institutionType.findMany({ orderBy: { name: 'asc' } }); }

  @Post()
  create(@Body() body: Record<string, unknown>) {
    const code = this.required(body.code, 'code').toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    const name = this.required(body.name, 'name');
    const description = this.optional(body.description);
    return this.prisma.institutionType.create({ data: { code, name, description, active: body.active === undefined ? true : Boolean(body.active) } });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    const data: { code?: string; name?: string; description?: string | null; active?: boolean } = {};
    if (body.code !== undefined) data.code = this.required(body.code, 'code').toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    if (body.name !== undefined) data.name = this.required(body.name, 'name');
    if (body.description !== undefined) data.description = this.optional(body.description) ?? null;
    if (body.active !== undefined) data.active = Boolean(body.active);
    if (!Object.keys(data).length) throw new BadRequestException('At least one field is required');
    return this.prisma.institutionType.update({ where: { id }, data });
  }

  private optional(value: unknown) { if (value === undefined || value === null || value === '') return undefined; if (typeof value !== 'string') throw new BadRequestException('Expected a string value'); const v = value.trim(); if (!v) return undefined; if (v.length > 500) throw new BadRequestException('Text is too long'); if (/<\/?[a-z][\s\S]*>/i.test(v)) throw new BadRequestException('HTML is not allowed'); return v; }
  private required(value: unknown, field: string) { const valueText = this.optional(value); if (!valueText) throw new BadRequestException(`${field} is required`); return valueText; }
}
