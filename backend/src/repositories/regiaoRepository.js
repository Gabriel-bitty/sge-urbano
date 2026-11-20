/** SQL parametrizado de regiões e histórico de bloqueio (RF03, RN20, RNF19). */
const {
  appendFilter,
  insertAndSelect,
  requireDatabase,
  updateById,
  whereClause,
} = require('./repositoryUtils');

function createRegiaoRepository(database) {
  const db = requireDatabase(database);

  function create(region) {
    return insertAndSelect(db, 'regions', `
      INSERT INTO regions (
        name, latitude, longitude, status, previous_status, block_reason,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      region.name,
      region.latitude,
      region.longitude,
      region.status ?? 'Ativo',
      region.previousStatus ?? null,
      region.blockReason ?? null,
      region.createdAt,
      region.updatedAt ?? region.createdAt,
    ]);
  }

  function findById(id) {
    return db.prepare('SELECT * FROM regions WHERE id = ?').get(id);
  }

  function list(filters = {}) {
    const clauses = [];
    const parameters = [];
    appendFilter(clauses, parameters, 'status = ?', filters.status);

    if (filters.name !== undefined && filters.name !== null) {
      clauses.push('name LIKE ?');
      parameters.push(`%${filters.name}%`);
    }

    return db.prepare(`
      SELECT *
      FROM regions
      ${whereClause(clauses)}
      ORDER BY name, id
    `).all(...parameters);
  }

  function update(id, values) {
    return updateById(db, 'regions', {
      name: 'name',
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

module.exports = { createRegiaoRepository };
