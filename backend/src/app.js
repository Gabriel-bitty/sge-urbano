const express = require('express');
const path = require('node:path');

function createApp() {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(express.static(path.join(__dirname, '..', '..', 'frontend')));

  return app;
}

module.exports = createApp;
