const express = require('express');
const path = require('node:path');
const routes = require('./routes');

/**
 * Cria a instância base da aplicação Express, conectando parsing JSON,
 * roteador da API (`/api`) e arquivos estáticos do front-end (RNF17, RNF18).
 *
 * @returns {import('express').Express}
 */
function createApp() {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use('/api', routes);
  app.use(express.static(path.join(__dirname, '..', '..', 'frontend')));

  return app;
}

module.exports = createApp;
