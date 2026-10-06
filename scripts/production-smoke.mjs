const webUrl = (process.env.PRODUCTION_WEB_URL || '').replace(/\/$/, '');

if (!webUrl) {
  console.error('PRODUCTION_WEB_URL is required.');
  process.exit(2);
}

const appUrl = /\/CRil$/i.test(webUrl) ? webUrl : `${webUrl}/CRil`;

async function check(name, url, expectedStatuses = [200]) {
  const started = Date.now();
  const response = await fetch(url, { redirect: 'manual' });
  const elapsed = Date.now() - started;
  if (!expectedStatuses.includes(response.status)) {
    throw new Error(`${name}: HTTP ${response.status} from ${url}`);
  }
  console.log(`${name}: PASS (${response.status}, ${elapsed}ms)`);
}

await check('Public web', `${appUrl}/`);
await check('Public login', `${appUrl}/login`);
await check('Public API health', `${appUrl}/api/v1/health`);
console.log(`Production smoke test passed for ${appUrl}.`);
