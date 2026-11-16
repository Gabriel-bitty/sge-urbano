const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

function openDatabase(filename) {
  const databasePath = filename || (
    process.env.NODE_ENV === 'test'
      ? ':memory:'
      : path.join(__dirname, '..', '..', 'data', 'sge-urbano.sqlite')
  );

  if (databasePath !== ':memory:') {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  }

  return new DatabaseSync(databasePath);
}

module.exports = { openDatabase };
