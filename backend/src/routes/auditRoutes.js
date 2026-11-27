/** Consulta protegida dos eventos críticos de auditoria (RNF16, CT11, CT12, CT19, CT20). */
const { Router } = require('express');
const { ValidationError } = require('../services/domainErrors');

const FILTERS = Object.freeze([
  'actorUserId',
  'action',
  'targetType',
  'targetId',
  'from',
  'to',
]);

function parseFilters(query) {
  const fields = {};
  for (const key of Object.keys(query)) {
    if (!FILTERS.includes(key)) {
      fields[key] = 'Filtro não permitido.';
    }
  }
  if (
    query.actorUserId !== undefined
    && !/^[1-9]\d*$/.test(String(query.actorUserId))
  ) {
    fields.actorUserId = 'Informe um identificador inteiro positivo.';
  }
  if (Object.keys(fields).length > 0) {
    throw new ValidationError(fields);
  }

  return {
    actorUserId: query.actorUserId === undefined
      ? undefined
      : Number(query.actorUserId),
    action: query.action,
    targetType: query.targetType,
    targetId: query.targetId,
    from: query.from,
    to: query.to,
  };
}

function toAuditResponse(event) {
  let details = null;
  if (event.details) {
    try {
      details = JSON.parse(event.details);
    } catch {
      details = event.details;
    }
  }

  return {
    id: event.id,
    actorUserId: event.actor_user_id,
    actorIdentity: event.actor_identity,
    actorRole: event.actor_role,
    action: event.action,
    targetType: event.target_type,
    targetId: event.target_id,
    reason: event.reason,
    previousValue: event.previous_value,
    newValue: event.new_value,
    details,
    createdAt: event.created_at,
  };
}

function createAuditRouter({ auditService, authenticate, requireRole }) {
  const router = Router();
  const managerOnly = [authenticate, requireRole('Gestor')];

  router.get('/', ...managerOnly, (req, res) => (
    res.status(200).json(
      auditService.list(parseFilters(req.query)).map(toAuditResponse)
    )
  ));

  return router;
}

module.exports = { createAuditRouter };
