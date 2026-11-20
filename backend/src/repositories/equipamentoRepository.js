/** SQL parametrizado de equipamentos vinculados a regiões (RF04, RN02–RN04, RNF19). */
const {
  appendFilter,
  insertAndSelect,
  requireDatabase,
  updateById,
  whereClause,
} = require('./repositoryUtils');

function createEquipamentoRepository(database) {
  const db = requireDatabase(database);

  function create(equipment) {
    return insertAndSelect(db, 'equipments', `
      INSERT INTO equipments (
        region_id, type, location, expected_consumption_kwh,
        latitude, longitude, status, previous_status, block_reason,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      equipment.regionId,
      equipment.type,
      equipment.location,
      equipment.expectedConsumptionKwh,
      equipment.latitude,
      equipment.longitude,
      equipment.status ?? 'Ativo',
      equipment.previousStatus ?? null,
      equipment.blockReason ?? null,
      equipment.createdAt,
      equipment.updatedAt ?? equipment.createdAt,
    ]);
  }

  function findById(id) {
    return db.prepare(`
      SELECT equipments.*, regions.name AS region_name
      FROM equipments
      JOIN regions ON regions.id = equipments.region_id
      WHERE equipments.id = ?
    `).get(id);
  }

  function list(filters = {}) {
    const clauses = [];
    const parameters = [];
    appendFilter(clauses, parameters, 'equipments.region_id = ?', filters.regionId);
    appendFilter(clauses, parameters, 'equipments.type = ?', filters.type);
    appendFilter(clauses, parameters, 'equipments.status = ?', filters.status);

    return db.prepare(`
      SELECT equipments.*, regions.name AS region_name
      FROM equipments
      JOIN regions ON regions.id = equipments.region_id
      ${whereClause(clauses)}
      ORDER BY equipments.location, equipments.id
    `).all(...parameters);
  }

  function update(id, values) {
    return updateById(db, 'equipments', {
      regionId: 'region_id',
      type: 'type',
      location: 'location',
      expectedConsumptionKwh: 'expected_consumption_kwh',
      latitude: 'latitude',
      longitude: 'longitude',
      status: 'status',
      previousStatus: 'previous_status',
      blockReason: 'block_reason',
      updatedAt: 'updated_at',
    }, id, values);
  }

  return { create, findById, list, update };
}

module.exports = { createEquipamentoRepository };
