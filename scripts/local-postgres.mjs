// Starts/stops/checks a local, user-space PostgreSQL instance for development
// without requiring Docker or an admin-installed PostgreSQL server.
// Data is stored under .pgdata (gitignored) and is persistent across restarts.
import EmbeddedPostgres from 'embedded-postgres';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const databaseDir = path.join(__dirname, '..', '.pgdata');

const PORT = Number(process.env.LOCAL_PG_PORT ?? 5432);
const USER = process.env.LOCAL_PG_USER ?? 'postgres';
const PASSWORD = process.env.LOCAL_PG_PASSWORD ?? 'postgres';
const DB_NAME = process.env.LOCAL_PG_DB ?? 'cril';

const pg = new EmbeddedPostgres({
  databaseDir,
  user: USER,
  password: PASSWORD,
  port: PORT,
  persistent: true,
});

const command = process.argv[2];

async function start() {
  const alreadyInitialised = existsSync(path.join(databaseDir, 'PG_VERSION'));
  if (!alreadyInitialised) {
    console.log(`Initialising new PostgreSQL data directory at ${databaseDir} ...`);
    await pg.initialise();
  }
  console.log(`Starting PostgreSQL on 127.0.0.1:${PORT} ...`);
  await pg.start();

  try {
    await pg.createDatabase(DB_NAME);
    console.log(`Database "${DB_NAME}" created.`);
  } catch (error) {
    if (!/already exists/i.test(String(error?.message ?? error))) {
      throw error;
    }
    console.log(`Database "${DB_NAME}" already exists.`);
  }

  console.log('PostgreSQL is ready.');
  console.log(`DATABASE_URL="postgresql://${USER}:${PASSWORD}@127.0.0.1:${PORT}/${DB_NAME}?schema=public"`);
}

async function stop() {
  console.log('Stopping PostgreSQL ...');
  await pg.stop();
  console.log('Stopped.');
}

async function status() {
  try {
    await pg.start();
    console.log('PostgreSQL started (was not running).');
  } catch (error) {
    console.log(String(error?.message ?? error));
  }
}

try {
  if (command === 'start') await start();
  else if (command === 'stop') await stop();
  else if (command === 'status') await status();
  else {
    console.error('Usage: node scripts/local-postgres.mjs <start|stop|status>');
    process.exit(1);
  }
} catch (error) {
  console.error('ERROR:', error);
  process.exit(1);
}
