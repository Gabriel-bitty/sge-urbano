const {
  appendFilter,
  insertAndSelect,
  requireDatabase,
  updateById,
  whereClause,
} = require('./repositoryUtils');

function createOsRepository(database) {
  const db = requireDatabase(database);

  function create(workOrder) {
    return insertAndSelect(db, 'work_orders', `
      INSERT INTO work_orders (
        code, origin, alert_id, occurrence_id, region_id, equipment_id,
        location, description, status, assigned_technician_id,
        created_by_user_id, solution_description, cancellation_reason,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      workOrder.code,
      workOrder.origin,
      workOrder.alertId ?? null,
      workOrder.occurrenceId ?? null,
      workOrder.regionId,
      workOrder.equipmentId ?? null,
      workOrder.location,
      workOrder.description,
      workOrder.status ?? 'Aberta',
      workOrder.assignedTechnicianId ?? null,
      workOrder.createdByUserId,
      workOrder.solutionDescription ?? null,
      workOrder.cancellationReason ?? null,
      workOrder.createdAt,
      workOrder.updatedAt ?? workOrder.createdAt,
    ]);
  }

  function findById(id) {
    return db.prepare('SELECT * FROM work_orders WHERE id = ?').get(id);
  }

  function findActiveByAlertId(alertId) {
    return db.prepare(`
      SELECT *
      FROM work_orders
      WHERE alert_id = ?
        AND status IN ('Aberta', 'Atribuída', 'Em atendimento')
      ORDER BY id DESC
      LIMIT 1
    `).get(alertId);
  }

  function nextCode(year) {
    const prefix = `OS-${year}-`;
    const current = db.prepare(`
      SELECT MAX(CAST(substr(code, length(?) + 1) AS INTEGER)) AS last_sequence
      FROM work_orders
      WHERE code LIKE ?
    `).get(prefix, `${prefix}%`);
    const sequence = (current.last_sequence || 0) + 1;
    return `${prefix}${String(sequence).padStart(6, '0')}`;
  }

  function list(filters = {}) {
    const clauses = [];
    const parameters = [];
    appendFilter(clauses, parameters, 'work_orders.status = ?', filters.status);
    appendFilter(
      clauses,
      parameters,
      'work_orders.region_id = ?',
      filters.regionId
    );
    appendFilter(
      clauses,
      parameters,
      'work_orders.equipment_id = ?',
      filters.equipmentId
    );
    appendFilter(
      clauses,
      parameters,
      'work_orders.assigned_technician_id = ?',
      filters.assignedTechnicianId
    );
    appendFilter(
      clauses,
      parameters,
      'work_orders.alert_id = ?',
      filters.alertId
    );
    appendFilter(
      clauses,
      parameters,
      'work_orders.occurrence_id = ?',
      filters.occurrenceId
    );
    appendFilter(
      clauses,
      parameters,
      'work_orders.updated_at >= ?',
      filters.from
    );
    appendFilter(
      clauses,
      parameters,
      'work_orders.updated_at <= ?',
      filters.to
    );
    appendFilter(clauses, parameters, 'equipments.type = ?', filters.equipmentType);

    return db.prepare(`
      SELECT work_orders.*
      FROM work_orders
      LEFT JOIN equipments ON equipments.id = work_orders.equipment_id
      ${whereClause(clauses)}
      ORDER BY work_orders.updated_at DESC, work_orders.id DESC
    `).all(...parameters);
  }

  function update(id, values) {
    return updateById(db, 'work_orders', {
      status: 'status',
      assignedTechnicianId: 'assigned_technician_id',
      solutionDescription: 'solution_description',
      cancellationReason: 'cancellation_reason',
      updatedAt: 'updated_at',
    }, id, values);
  }

  function aggregateByStatus(filters = {}) {
    const clauses = [];
    const parameters = [];
    appendFilter(clauses, parameters, 'region_id = ?', filters.regionId);
    appendFilter(
      clauses,
      parameters,
      'assigned_technician_id = ?',
      filters.assignedTechnicianId
    );
    appendFilter(clauses, parameters, 'updated_at >= ?', filters.from);
    appendFilter(clauses, parameters, 'updated_at <= ?', filters.to);

    return db.prepare(`
      SELECT status, COUNT(*) AS total
      FROM work_orders
      ${whereClause(clauses)}
      GROUP BY status
      ORDER BY status
    `).all(...parameters);
  }

  return {
    aggregateByStatus,
    create,
    findActiveByAlertId,
    findById,
    list,
    nextCode,
    update,
  };
}

module.exports = { createOsRepository };
