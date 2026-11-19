const { openDatabase, runInTransaction } = require('./connection');
const { runMigrations } = require('./migrate');
const {
  EQUIPMENTS,
  FIXED_TIMESTAMP,
  REGIONS,
} = require('./seeds/referenceSeedData');

/**
 * Carga sintética, parametrizada e idempotente para ambiente de teste.
 *
 * Rastreabilidade:
 * - RF03, RF04, RF05; UC04; CA05.1–CA05.3
 * - RN02, RN03, RN04, RN05, RN24 (2 regiões, 15 postes e 5 prédios municipais)
 * - RNF02, RNF17 (dados simulados), RNF19 (SQL parametrizado), RNF20 (exclusivo NODE_ENV=test)
 * - CT04, CT17, CT24, CT26
 */

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
 * Insere ou atualiza de forma idempotente a massa sintética usando SQL parametrizado (RNF19).
 *
 * @param {import('node:sqlite').DatabaseSync} database
 */
function insertReferenceSeed(database) {
  const insertRegion = database.prepare(`
    INSERT INTO regions (
      id, name, latitude, longitude, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'Ativo', ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      latitude = excluded.latitude,
      longitude = excluded.longitude,
      status = excluded.status,
      updated_at = excluded.updated_at
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
    ON CONFLICT(id) DO UPDATE SET
      region_id = excluded.region_id,
      type = excluded.type,
      location = excluded.location,
      expected_consumption_kwh = excluded.expected_consumption_kwh,
      latitude = excluded.latitude,
      longitude = excluded.longitude,
      status = excluded.status,
      updated_at = excluded.updated_at
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
}

/**
 * Aplica migrações pendentes e carrega a massa sintética em transação (RNF02, RNF20).
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
    runInTransaction(database, () => insertReferenceSeed(database));

    return {
      regions: REGIONS.length,
      equipments: EQUIPMENTS.length,
      poles: EQUIPMENTS.filter(({ type }) => type === 'poste').length,
      municipalBuildings: EQUIPMENTS.filter(
        ({ type }) => type === 'predio_municipal'
      ).length,
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
