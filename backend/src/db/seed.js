const { openDatabase, runInTransaction } = require('./connection');
const { runMigrations } = require('./migrate');
const {
  EQUIPMENTS,
  FIXED_TIMESTAMP,
  REGIONS,
} = require('./seeds/referenceSeedData');

function assertTestEnvironment() {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error(
      'A carga de seed sintética é permitida exclusivamente em NODE_ENV=test.'
    );
  }
}

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
