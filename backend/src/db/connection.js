const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

function runInTransaction(database, operation) {
  database.exec('BEGIN IMMEDIATE TRANSACTION;');

  try {
    const result = operation();
    database.exec('COMMIT;');
    return result;
  } catch (error) {
    database.exec('ROLLBACK;');
    throw error;
  }
}

function openDatabase(filename) {
  const databasePath = filename || (
    process.env.NODE_ENV === 'test'
      ? ':memory:'
      : path.join(__dirname, '..', '..', 'data', 'sge-urbano.sqlite')
  );

  if (databasePath !== ':memory:') {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  }

  const database = new DatabaseSync(databasePath);

  try {
    database.exec('PRAGMA foreign_keys = ON;');
    database.exec('PRAGMA busy_timeout = 5000;');
    return database;
  } catch (error) {
    database.close();
    throw error;
  }
}

module.exports = { openDatabase, runInTransaction };
