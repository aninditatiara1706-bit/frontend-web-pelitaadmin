import 'dotenv/config';
import { app } from './app.js';
import { prisma } from './config/db.js';

const port = Number(process.env.PORT ?? 4000);
const server = app.listen(port, () => console.info(`PELITA API listening on http://localhost:${port}`));

async function shutdown(signal: string) {
  console.info(`${signal} received; shutting down API`);
  server.close(async (error) => {
    if (error) {
      console.error('HTTP server shutdown failed:', error);
      process.exitCode = 1;
    }
    await prisma.$disconnect();
    process.exit();
  });
}
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
