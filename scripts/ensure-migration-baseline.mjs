import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = process.cwd();
const baselineDir = join(repoRoot, 'prisma', 'migrations', '20260909000000_baseline');
const migrationFile = join(baselineDir, 'migration.sql');
const baselineSchema = join(repoRoot, 'prisma', 'baseline-schema.prisma');

if (existsSync(migrationFile)) process.exit(0);

if (!existsSync(baselineSchema)) {
  throw new Error(`Missing committed Prisma baseline schema: ${baselineSchema}`);
}

mkdirSync(baselineDir, { recursive: true });

const sql = execFileSync(
  'npx',
  ['prisma', 'migrate', 'diff', '--from-empty', `--to-schema-datamodel=${baselineSchema}`, '--script'],
  { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] },
);

writeFileSync(
  migrationFile,
  '-- Deterministic foundational schema reconstructed from the committed pre-M1 baseline schema.\n' +
    '-- The application prisma/schema.prisma remains the active development schema.\n' +
    '-- Later migrations remain unchanged.\n' +
    sql,
  'utf8',
);
