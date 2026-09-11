const webUrl = (process.env.PRODUCTION_WEB_URL || '').replace(/\/$/, '');
const apiUrl = (process.env.PRODUCTION_API_URL || '').replace(/\/$/, '');

if (!webUrl || !apiUrl) {
  console.error('PRODUCTION_WEB_URL and PRODUCTION_API_URL are required.');
  process.exit(2);
}

async function check(name, url, expectedStatuses = [200]) {
  const started = Date.now();
  const response = await fetch(url, { redirect: 'manual' });
  const elapsed = Date.now() - started;
  if (!expectedStatuses.includes(response.status)) throw new Error(`${name}: HTTP ${response.status} from ${url}`);
  console.log(`${name}: PASS (${response.status}, ${elapsed}ms)`);
}

await check('Public web', `${webUrl}/`);
await check('API health', `${apiUrl}/health`);
await check('Public verification route', `${webUrl}/verify`, [200, 308]);
console.log('Production smoke test passed.');
