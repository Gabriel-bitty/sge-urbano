const {
  appendFilter,
  insertAndSelect,
  requireDatabase,
  updateById,
  whereClause,
} = require('./repositoryUtils');

function createAlertaRepository(database) {
  const db = requireDatabase(database);

  function create(alert) {
    return insertAndSelect(db, 'alerts', `
      INSERT INTO alerts (
        equipment_id, region_id, last_reading_id, anomaly_type, severity,
        measured_consumption_kwh, expected_consumption_kwh, deviation_percent,
        status, occurrence_count, message, created_at, updated_at, resolved_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      alert.equipmentId,
      alert.regionId,
      alert.lastReadingId,
      alert.anomalyType,
      alert.severity,
      alert.measuredConsumptionKwh,
      alert.expectedConsumptionKwh,
      alert.deviationPercent,
      alert.status ?? 'Ativo',
      alert.occurrenceCount ?? 1,
      alert.message,
      alert.createdAt,
      alert.updatedAt ?? alert.createdAt,
      alert.resolvedAt ?? null,
    ]);
  }

  function findById(id) {
    return db.prepare('SELECT * FROM alerts WHERE id = ?').get(id);
  }

  function findActiveByEquipmentAndType(equipmentId, anomalyType) {
    return db.prepare(`
      SELECT *
      FROM alerts
      WHERE equipment_id = ?
        AND anomaly_type = ?
        AND status IN ('Ativo', 'Suspenso')
      ORDER BY id DESC
      LIMIT 1
    `).get(equipmentId, anomalyType);
  }

  function list(filters = {}) {
    const clauses = [];
    const parameters = [];
    appendFilter(clauses, parameters, 'status = ?', filters.status);
    appendFilter(clauses, parameters, 'severity = ?', filters.severity);
    appendFilter(clauses, parameters, 'region_id = ?', filters.regionId);
    appendFilter(clauses, parameters, 'equipment_id = ?', filters.equipmentId);
    appendFilter(clauses, parameters, 'anomaly_type = ?', filters.anomalyType);
    appendFilter(clauses, parameters, 'updated_at >= ?', filters.from);
    appendFilter(clauses, parameters, 'updated_at <= ?', filters.to);

    return db.prepare(`
      SELECT *
      FROM alerts
      ${whereClause(clauses)}
      ORDER BY updated_at DESC, id DESC
    `).all(...parameters);
  }

  function update(id, values) {
    return updateById(db, 'alerts', {
      lastReadingId: 'last_reading_id',
      severity: 'severity',
      measuredConsumptionKwh: 'measured_consumption_kwh',
      expectedConsumptionKwh: 'expected_consumption_kwh',
      deviationPercent: 'deviation_percent',
      status: 'status',
      occurrenceCount: 'occurrence_count',
      message: 'message',
      updatedAt: 'updated_at',
      resolvedAt: 'resolved_at',
    }, id, values);
  }

  function aggregateByStatus(filters = {}) {
    const clauses = [];
    const parameters = [];
    appendFilter(clauses, parameters, 'region_id = ?', filters.regionId);
    appendFilter(clauses, parameters, 'equipment_id = ?', filters.equipmentId);
    appendFilter(clauses, parameters, 'updated_at >= ?', filters.from);
    appendFilter(clauses, parameters, 'updated_at <= ?', filters.to);

    return db.prepare(`
      SELECT status, severity, COUNT(*) AS total
      FROM alerts
      ${whereClause(clauses)}
      GROUP BY status, severity
      ORDER BY status, severity
    `).all(...parameters);
  }

  return {
    aggregateByStatus,
    create,
    findActiveByEquipmentAndType,
    findById,
    list,
    update,
  };
}

module.exports = { createAlertaRepository };
