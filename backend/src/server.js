import app from './app.js';
import { env } from './config/env.js';

const server = app.listen(env.PORT, () => {
  console.log(`[IVIP Mini Backend] Server listening on http://localhost:${env.PORT}`);
  console.log(`[IVIP Mini Backend] Health check available at http://localhost:${env.PORT}/health`);
});

const gracefulShutdown = (signal) => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  server.close(() => {
    console.log('[IVIP Mini Backend] HTTP server closed.');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('[IVIP Mini Backend] Forcing shutdown after timeout.');
    process.exit(1);
  }, 5000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
