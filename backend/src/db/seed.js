const { openDatabase, runInTransaction } = require('./connection');
const { runMigrations } = require('./migrate');
const { hashPasswordSync } = require('../services/passwordService');
const {
  EQUIPMENTS,
  FIXED_TIMESTAMP,
  REGIONS,
} = require('./seeds/referenceSeedData');

const TEST_USERS = Object.freeze([
  {
    id: 1,
    name: 'Gestor de Teste',
    username: 'gestor.teste',
    role: 'Gestor',
    password: 'TesteSGE!2026',
  },
  {
    id: 2,
    name: 'Técnico de Teste 1',
    username: 'tecnico1.teste',
    role: 'Técnico',
    password: 'TesteSGE!2026',
  },
  {
    id: 3,
    name: 'Técnico de Teste 2',
    username: 'tecnico2.teste',
    role: 'Técnico',
    password: 'TesteSGE!2026',
  },
]);

/**
 * Carga sintética, parametrizada e reprodutível para ambiente de teste.
 *
 * Rastreabilidade:
 * - RF03, RF04, RF05; UC04; CA05.1–CA05.3
 * - RN02, RN03, RN04, RN05
 * - Volume de referência: 2 regiões, 15 postes e 5 prédios municipais
 *   (Seção 7.5 da 1ª entrega / Seção 2.2 da 2ª entrega)
 * - RNF02, RNF17 (dados simulados), RNF19 (SQL parametrizado), RNF20 (exclusivo NODE_ENV=test)
 * - CT04, CT17, CT24, CT26
 */

const RESETTABLES = Object.freeze([
  'work_orders',
  'audit_logs',
  'sessions',
  'alerts',
  'occurrences',
  'readings',
  'users',
  'equipments',
  'regions',
  'anomaly_parameters',
]);

const ANOMALY_PARAMETERS = Object.freeze([
  ['LIM_SUP', 10],
  ['LIM_INF', 10],
  ['TOL_ZERO', 0.5],
  ['FAIXA_BAIXA', 10],
  ['FAIXA_MEDIA', 20],
  ['FAIXA_ALTA', 50],
]);

/**
 * Garante que a seed seja executada somente em ambiente de teste (RNF20, CT26).
 */
function assertTestEnvironment() {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error(
      'A carga de seed sintética é permitida exclusivamente em NODE_ENV=test.'
    );
  }
}

/**
 * Remove residual de execuções anteriores e preserva os gatilhos ao restaurá-los
 * dentro da mesma transação.
 *
 * @param {import('node:sqlite').DatabaseSync} database
 */
function clearTestData(database) {
  const triggers = database.prepare(`
    SELECT name, sql
    FROM sqlite_master
    WHERE type = 'trigger' AND sql IS NOT NULL
  `).all();

  for (const trigger of triggers) {
    const escapedName = trigger.name.replaceAll('"', '""');
    database.exec(`DROP TRIGGER "${escapedName}";`);
  }

  for (const table of RESETTABLES) {
    database.exec(`DELETE FROM ${table};`);
  }

  const clearSequence = database.prepare(
    'DELETE FROM sqlite_sequence WHERE name = ?'
  );

  for (const table of RESETTABLES) {
    clearSequence.run(table);
  }

  for (const trigger of triggers) {
    database.exec(trigger.sql);
  }
}

/**
 * Insere a massa sintética usando SQL parametrizado (RNF19).
 *
 * @param {import('node:sqlite').DatabaseSync} database
 */
function insertReferenceSeed(database) {
  const insertParameter = database.prepare(`
    INSERT INTO anomaly_parameters (name, value) VALUES (?, ?)
  `);

  for (const [name, value] of ANOMALY_PARAMETERS) {
    insertParameter.run(name, value);
  }

  const insertRegion = database.prepare(`
    INSERT INTO regions (
      id, name, latitude, longitude, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'Ativo', ?, ?)
  `);

  for (const region of REGIONS) {
    insertRegion.run(
      region.id,
      region.name,
      region.latitude,
      region.longitude,
      FIXED_TIMESTAMP,
      FIXED_TIMESTAMP
    );
  }

  const insertEquipment = database.prepare(`
    INSERT INTO equipments (
      id, region_id, type, location, expected_consumption_kwh,
      latitude, longitude, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Ativo', ?, ?)
  `);

  for (const equipment of EQUIPMENTS) {
    insertEquipment.run(
      equipment.id,
      equipment.region_id,
      equipment.type,
      equipment.location,
      equipment.expected_consumption_kwh,
      equipment.latitude,
      equipment.longitude,
      FIXED_TIMESTAMP,
      FIXED_TIMESTAMP
    );
  }

  const insertUser = database.prepare(`
    INSERT INTO users (
      id, name, username, password_hash, role, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 'Ativo', ?, ?)
  `);

  for (const user of TEST_USERS) {
    insertUser.run(
      user.id,
      user.name,
      user.username,
      hashPasswordSync(user.password),
      user.role,
      FIXED_TIMESTAMP,
      FIXED_TIMESTAMP
    );
  }
}

/**
 * Recria o estado inicial completo antes de carregar a massa de referência.
 *
 * @param {import('node:sqlite').DatabaseSync} database
 */
function resetAndInsertReferenceSeed(database) {
  clearTestData(database);
  insertReferenceSeed(database);
}

/**
 * Aplica migrações pendentes e recria a massa sintética em transação
 * (Seção 2.2 / Seção 7.5, RNF02, RNF20).
 *
 * @param {import('node:sqlite').DatabaseSync | null} [customDatabase]
 * @returns {{ regions: number, equipments: number, poles: number, municipalBuildings: number }}
 */
function seedDatabase(customDatabase = null) {
  assertTestEnvironment();
  const database = customDatabase || openDatabase();
  const ownsDatabase = customDatabase === null;

  try {
    runMigrations(database);
    runInTransaction(database, () => resetAndInsertReferenceSeed(database));

    return {
      regions: database.prepare(
        'SELECT COUNT(*) AS total FROM regions'
      ).get().total,
      equipments: database.prepare(
        'SELECT COUNT(*) AS total FROM equipments'
      ).get().total,
      poles: database.prepare(
        "SELECT COUNT(*) AS total FROM equipments WHERE type = 'poste'"
      ).get().total,
      municipalBuildings: database.prepare(
        "SELECT COUNT(*) AS total FROM equipments WHERE type = 'predio_municipal'"
      ).get().total,
    };
  } finally {
    if (ownsDatabase) {
      database.close();
    }
  }
}

module.exports = {
  seedDatabase,
};
