const express = require('express');
const session = require('express-session');
const crypto = require('node:crypto');
const path = require('node:path');
const { openDatabase } = require('./db/connection');
const { runMigrations } = require('./db/migrate');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { SQLiteSessionStore, SESSION_COOKIE_NAME, SESSION_IDLE_TIMEOUT_MS } =
  require('./services/sqliteSessionStore');
const createRoutes = require('./routes');

function resolveSessionSecret(configuredSecret) {
  const secret = configuredSecret || process.env.SESSION_SECRET;

  if (secret) {
    if (Buffer.byteLength(secret) < 32) {
      throw new Error('SESSION_SECRET deve conter pelo menos 32 bytes.');
    }
    return secret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET é obrigatória em produção.');
  }

  console.warn(
    'SESSION_SECRET ausente; sessões locais serão invalidadas ao reiniciar o processo.'
  );
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Cria a instância base da aplicação Express, conectando parsing JSON,
 * roteador da API (`/api`) e arquivos estáticos do front-end (RNF17, RNF18).
 *
 * @param {{ database?: import('node:sqlite').DatabaseSync, sessionSecret?: string }} [options]
 * @returns {import('express').Express}
 */
function createApp(options = {}) {
  const app = express();
  const sessionSecret = resolveSessionSecret(options.sessionSecret);
  const database = options.database || openDatabase(':memory:');
  runMigrations(database);

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(session({
    name: SESSION_COOKIE_NAME,
    store: new SQLiteSessionStore(database),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      maxAge: SESSION_IDLE_TIMEOUT_MS,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    },
  }));
  app.use('/api', createRoutes({ database }));
  if (process.env.NODE_ENV === 'test') {
    const { createTestSupportRouter } = require('./routes/testSupportRoutes');
    app.use('/api/test', createTestSupportRouter({ database }));
  }
  app.use('/api', notFoundHandler);
  app.use(express.static(path.join(__dirname, '..', '..', 'frontend')));
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
