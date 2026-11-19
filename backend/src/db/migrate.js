const fs = require('node:fs');
const path = require('node:path');
const { runInTransaction } = require('./connection');

const migrationsDirectory = path.join(__dirname, 'migrations');

/**
 * Executa em ordem alfabética as migrações SQL pendentes de forma transacional,
 * registrando cada versão aplicada em `schema_migrations`.
 *
 * Rastreabilidade:
 * - RNF02 (confiabilidade e integridade estrutural após reinício)
 * - RNF18 (DDL restrita à infraestrutura de banco)
 * - CT17, CT26
 *
 * @param {import('node:sqlite').DatabaseSync} database
 * @returns {string[]} Lista das migrações aplicadas nesta execução
 */
function runMigrations(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const migrations = fs.readdirSync(migrationsDirectory)
    .filter((filename) => filename.endsWith('.sql'))
    .sort();

  const findMigration = database.prepare(
    'SELECT version FROM schema_migrations WHERE version = ?'
  );
  const registerMigration = database.prepare(
    'INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)'
  );

  const applied = [];

  for (const version of migrations) {
    if (findMigration.get(version)) {
      continue;
    }

    const sql = fs.readFileSync(
      path.join(migrationsDirectory, version),
      'utf8'
    );

    runInTransaction(database, () => {
      database.exec(sql);
      registerMigration.run(version, new Date().toISOString());
    });
    applied.push(version);
  }

  return applied;
}

module.exports = { runMigrations };
