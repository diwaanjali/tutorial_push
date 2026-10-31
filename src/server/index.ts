import { app } from './app.ts';
import { config } from './config.ts';

const server = app.listen(config.PORT, () => {
  console.log(`🚀 Campus Pulse server listening on port ${config.PORT} (${config.NODE_ENV})`);
});

function gracefulShutdown(signal: string) {
  console.log(`Received ${signal}. Gracefully shutting down...`);
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

