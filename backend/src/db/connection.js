const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

/**
 * Infraestrutura de conexão SQLite nativa (`node:sqlite`).
 *
 * Rastreabilidade:
 * - RNF02 (integridade e persistência), RN30 (SQLite sem ORM)
 * - RNF18 (isolamento de camadas)
 * - CT17, CT26
 */

/**
 * Executa uma operação atômica dentro de uma transação SQLite imediata.
 *
 * @template T
 * @param {import('node:sqlite').DatabaseSync} database
 * @param {() => T} operation
 * @returns {T}
 */
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

/**
 * Abre a conexão SQLite para o caminho informado ou ambiente atual,
 * garantindo ativação obrigatória de chaves estrangeiras e busy_timeout (RNF02).
 *
 * @param {string} [filename]
 * @returns {import('node:sqlite').DatabaseSync}
 */
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
