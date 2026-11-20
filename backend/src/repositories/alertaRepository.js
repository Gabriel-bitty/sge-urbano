/** Persistência e agregação de alertas sem exclusão histórica (RF07, RF08, RN14). */
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
    appendFilter(clauses, parameters, 'alerts.status = ?', filters.status);
    appendFilter(clauses, parameters, 'alerts.severity = ?', filters.severity);
    appendFilter(clauses, parameters, 'alerts.region_id = ?', filters.regionId);
    appendFilter(
      clauses,
      parameters,
      'alerts.equipment_id = ?',
      filters.equipmentId
    );
    appendFilter(
      clauses,
      parameters,
      'alerts.anomaly_type = ?',
      filters.anomalyType
    );
    appendFilter(clauses, parameters, 'alerts.updated_at >= ?', filters.from);
    appendFilter(clauses, parameters, 'alerts.updated_at <= ?', filters.to);
    appendFilter(clauses, parameters, 'equipments.type = ?', filters.equipmentType);

    return db.prepare(`
      SELECT alerts.*, equipments.type AS equipment_type
      FROM alerts
      JOIN equipments ON equipments.id = alerts.equipment_id
      ${whereClause(clauses)}
      ORDER BY alerts.updated_at DESC, alerts.id DESC
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
    appendFilter(clauses, parameters, 'alerts.region_id = ?', filters.regionId);
    appendFilter(
      clauses,
      parameters,
      'alerts.equipment_id = ?',
      filters.equipmentId
    );
    appendFilter(clauses, parameters, 'alerts.updated_at >= ?', filters.from);
    appendFilter(clauses, parameters, 'alerts.updated_at <= ?', filters.to);
    appendFilter(clauses, parameters, 'equipments.type = ?', filters.equipmentType);

    return db.prepare(`
      SELECT alerts.status, alerts.severity, COUNT(*) AS total
      FROM alerts
      JOIN equipments ON equipments.id = alerts.equipment_id
      ${whereClause(clauses)}
      GROUP BY alerts.status, alerts.severity
      ORDER BY alerts.status, alerts.severity
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
