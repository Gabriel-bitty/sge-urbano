const {
  appendFilter,
  insertAndSelect,
  requireDatabase,
  updateById,
  whereClause,
} = require('./repositoryUtils');

function createOcorrenciaRepository(database) {
  const db = requireDatabase(database);

  function create(occurrence) {
    return insertAndSelect(db, 'occurrences', `
      INSERT INTO occurrences (
        protocol, citizen_name, citizen_email, citizen_phone,
        citizen_cpf_simulated, type, description, region_id, equipment_id,
        address_reference, latitude, longitude, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      occurrence.protocol,
      occurrence.citizenName,
      occurrence.citizenEmail,
      occurrence.citizenPhone ?? null,
      occurrence.citizenCpfSimulated ?? null,
      occurrence.type,
      occurrence.description,
      occurrence.regionId,
      occurrence.equipmentId ?? null,
      occurrence.addressReference,
      occurrence.latitude,
      occurrence.longitude,
      occurrence.status ?? 'Aberta',
      occurrence.createdAt,
      occurrence.updatedAt ?? occurrence.createdAt,
    ]);
  }

  function findById(id) {
    return db.prepare('SELECT * FROM occurrences WHERE id = ?').get(id);
  }

  function findByProtocol(protocol) {
    return db.prepare(
      'SELECT * FROM occurrences WHERE protocol = ?'
    ).get(protocol);
  }

  function findPublicByProtocol(protocol) {
    return db.prepare(`
      SELECT status, type
      FROM occurrences
      WHERE protocol = ?
    `).get(protocol);
  }

  function list(filters = {}) {
    const clauses = [];
    const parameters = [];
    appendFilter(clauses, parameters, 'status = ?', filters.status);
    appendFilter(clauses, parameters, 'type = ?', filters.type);
    appendFilter(clauses, parameters, 'region_id = ?', filters.regionId);
    appendFilter(clauses, parameters, 'equipment_id = ?', filters.equipmentId);
    appendFilter(clauses, parameters, 'created_at >= ?', filters.from);
    appendFilter(clauses, parameters, 'created_at <= ?', filters.to);

    return db.prepare(`
      SELECT *
      FROM occurrences
      ${whereClause(clauses)}
      ORDER BY created_at DESC, id DESC
    `).all(...parameters);
  }

  function updateStatus(id, { status, updatedAt }) {
    return updateById(db, 'occurrences', {
      status: 'status',
      updatedAt: 'updated_at',
    }, id, { status, updatedAt });
  }

  return {
    create,
    findById,
    findByProtocol,
    findPublicByProtocol,
    list,
    updateStatus,
  };
}

module.exports = { createOcorrenciaRepository };
