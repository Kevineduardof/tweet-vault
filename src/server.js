import { app } from './app.js';
import { logger } from './utils/logger.js';

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  logger.info(`TweetVault rodando em http://localhost:${PORT} (${process.env.NODE_ENV || 'development'})`);
});

function shutdown(signal) {
  logger.info(`${signal} recebido, encerrando...`);
  server.close(() => process.exit(0));

  // se alguma conexão ficar presa, mata depois de 10s
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
