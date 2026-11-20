/** SQL de leituras e agregações de consumo (RF05, RF14, RF16, RN24, CT04). */
const {
  appendFilter,
  insertAndSelect,
  requireDatabase,
  whereClause,
} = require('./repositoryUtils');

function createLeituraRepository(database) {
  const db = requireDatabase(database);

  function create(reading) {
    return insertAndSelect(db, 'readings', `
      INSERT INTO readings (
        equipment_id, batch_id, scenario, measured_consumption_kwh,
        expected_consumption_kwh, deviation_percent, is_anomaly,
        anomaly_type, severity, unit, origin, recorded_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      reading.equipmentId,
      reading.batchId ?? null,
      reading.scenario,
      reading.measuredConsumptionKwh,
      reading.expectedConsumptionKwh,
      reading.deviationPercent,
      reading.isAnomaly ? 1 : 0,
      reading.anomalyType ?? null,
      reading.severity ?? null,
      reading.unit ?? 'kWh',
      reading.origin ?? 'SIMULADO',
      reading.recordedAt,
    ]);
  }

  function findById(id) {
    return db.prepare('SELECT * FROM readings WHERE id = ?').get(id);
  }

  function findLatestByEquipmentId(equipmentId) {
    return db.prepare(`
      SELECT *
      FROM readings
      WHERE equipment_id = ?
      ORDER BY recorded_at DESC, id DESC
      LIMIT 1
    `).get(equipmentId);
  }

  function list(filters = {}) {
    const clauses = [];
    const parameters = [];
    appendFilter(clauses, parameters, 'readings.equipment_id = ?', filters.equipmentId);
    appendFilter(clauses, parameters, 'readings.batch_id = ?', filters.batchId);
    appendFilter(clauses, parameters, 'readings.scenario = ?', filters.scenario);
    appendFilter(clauses, parameters, 'readings.is_anomaly = ?', filters.isAnomaly);
    appendFilter(clauses, parameters, 'readings.recorded_at >= ?', filters.from);
    appendFilter(clauses, parameters, 'readings.recorded_at <= ?', filters.to);
    appendFilter(clauses, parameters, 'equipments.region_id = ?', filters.regionId);
    appendFilter(clauses, parameters, 'equipments.type = ?', filters.equipmentType);

    return db.prepare(`
      SELECT readings.*, equipments.region_id, equipments.type AS equipment_type
      FROM readings
      JOIN equipments ON equipments.id = readings.equipment_id
      ${whereClause(clauses)}
      ORDER BY readings.recorded_at DESC, readings.id DESC
    `).all(...parameters);
  }

  function aggregate({ from, to, regionId, equipmentType, granularity = null } = {}) {
    const periodExpressions = {
      day: "strftime('%Y-%m-%d', readings.recorded_at)",
      month: "strftime('%Y-%m', readings.recorded_at)",
    };

    if (granularity !== null && !periodExpressions[granularity]) {
      throw new TypeError('Granularidade deve ser "day", "month" ou null.');
    }

    const clauses = [];
    const parameters = [];
    appendFilter(clauses, parameters, 'readings.recorded_at >= ?', from);
    appendFilter(clauses, parameters, 'readings.recorded_at <= ?', to);
    appendFilter(clauses, parameters, 'equipments.region_id = ?', regionId);
    appendFilter(clauses, parameters, 'equipments.type = ?', equipmentType);

    const grouping = [
      'equipments.region_id',
      'equipments.type',
      periodExpressions[granularity],
    ].filter(Boolean);

    return db.prepare(`
      SELECT
        equipments.region_id,
        equipments.type AS equipment_type,
        ${periodExpressions[granularity] || 'NULL'} AS period,
        COUNT(*) AS reading_count,
        SUM(readings.measured_consumption_kwh) AS measured_consumption_kwh,
        SUM(readings.expected_consumption_kwh) AS expected_consumption_kwh,
        AVG(readings.deviation_percent) AS average_deviation_percent
      FROM readings
      JOIN equipments ON equipments.id = readings.equipment_id
      ${whereClause(clauses)}
      GROUP BY ${grouping.join(', ')}
      ORDER BY equipments.region_id, equipments.type, period
    `).all(...parameters);
  }

  return { aggregate, create, findById, findLatestByEquipmentId, list };
}

module.exports = { createLeituraRepository };
