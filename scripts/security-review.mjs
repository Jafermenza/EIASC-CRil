import { spawnSync } from 'node:child_process';

const result = spawnSync('npm', ['audit', '--json'], { encoding: 'utf8' });
const output = result.stdout || result.stderr || '{}';
let report;
try { report = JSON.parse(output); } catch { console.error(output); process.exit(1); }
const vulnerabilities = report.metadata?.vulnerabilities || {};
console.log(JSON.stringify({ generatedAt: new Date().toISOString(), vulnerabilities }, null, 2));

const blocking = Number(vulnerabilities.critical || 0) + Number(vulnerabilities.high || 0);
if (blocking > 0) {
  console.error(`Security review failed: ${blocking} high/critical dependency vulnerabilities remain.`);
  process.exit(1);
}
console.log('Dependency security review passed: no high/critical vulnerabilities reported by npm audit.');
