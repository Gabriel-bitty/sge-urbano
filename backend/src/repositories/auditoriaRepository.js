/** Persistência imutável e consulta de eventos de auditoria (RNF16, CT01, CT11, CT12, CT19, CT20). */
const {
  appendFilter,
  insertAndSelect,
  requireDatabase,
  whereClause,
} = require('./repositoryUtils');

function createAuditoriaRepository(database) {
  const db = requireDatabase(database);

  function create(event) {
    return insertAndSelect(db, 'audit_logs', `
      INSERT INTO audit_logs (
        actor_user_id, actor_identity, actor_role, action, target_type,
        target_id, reason, previous_value, new_value, details, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      event.actorUserId ?? null,
      event.actorIdentity ?? null,
      event.actorRole ?? null,
      event.action,
      event.targetType,
      event.targetId ?? null,
      event.reason ?? null,
      event.previousValue ?? null,
      event.newValue ?? null,
      event.details ?? null,
      event.createdAt,
    ]);
  }

  function list(filters = {}) {
    const clauses = [];
    const parameters = [];
    appendFilter(clauses, parameters, 'actor_user_id = ?', filters.actorUserId);
    appendFilter(clauses, parameters, 'action = ?', filters.action);
    appendFilter(clauses, parameters, 'target_type = ?', filters.targetType);
    appendFilter(clauses, parameters, 'target_id = ?', filters.targetId);
    appendFilter(clauses, parameters, 'created_at >= ?', filters.from);
    appendFilter(clauses, parameters, 'created_at <= ?', filters.to);

    return db.prepare(`
      SELECT *
      FROM audit_logs
      ${whereClause(clauses)}
      ORDER BY created_at DESC, id DESC
    `).all(...parameters);
  }

  function findById(id) {
    return db.prepare('SELECT * FROM audit_logs WHERE id = ?').get(id);
  }

  return { create, findById, list };
}

module.exports = { createAuditoriaRepository };
