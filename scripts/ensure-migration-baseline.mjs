import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = process.cwd();
const baselineDir = join(repoRoot, 'prisma', 'migrations', '20260909000000_baseline');
const migrationFile = join(baselineDir, 'migration.sql');
const historicalCommit = '538c45041b285c2542a8b51d250a276e92357f9f';
const historicalSchema = join(repoRoot, '.generated-baseline-schema.prisma');

if (existsSync(migrationFile)) process.exit(0);

try {
  mkdirSync(baselineDir, { recursive: true });
  const schema = execFileSync('git', ['show', `${historicalCommit}:prisma/schema.prisma`], { cwd: repoRoot, encoding: 'utf8' });
  writeFileSync(historicalSchema, schema, 'utf8');
  const sql = execFileSync('npx', ['prisma', 'migrate', 'diff', '--from-empty', `--to-schema-datamodel=${historicalSchema}`, '--script'], { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
  writeFileSync(migrationFile, `-- Deterministic foundational schema reconstructed from ${historicalCommit}.\n-- This file restores the missing pre-M1 baseline; later migrations remain unchanged.\n${sql}`, 'utf8');
} finally {
  try { execFileSync('node', ['-e', `require('node:fs').unlinkSync(${JSON.stringify(historicalSchema)})`], { cwd: repoRoot, stdio: 'ignore' }); } catch {}
}
