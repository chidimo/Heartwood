import { setDefaultResultOrder } from 'node:dns';
import { createServer } from 'node:http';
import { getDb } from '@heartwood/database';
import { createApp } from './app';

// Managed Postgres hosts are dual-stack, and some platforms can't reach IPv6 outbound;
// the connection then hangs for tens of seconds before falling back. Prefer IPv4.
setDefaultResultOrder('ipv4first');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

const db = getDb();
const app = createApp({ db });
const server = createServer(app);
const port = Number(process.env.PORT ?? 4300);

server.listen(port, '0.0.0.0', () => {
  console.log(`\x1b[32mHeartwood API running on :${port}\x1b[0m`);
});

let isShuttingDown = false;
const shutdown = async (signal: NodeJS.Signals) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`Received ${signal}, shutting down...`);
  await db.destroy();
  server.close(() => process.exit(0));
};
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
