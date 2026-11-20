const { Router } = require('express');
const { ValidationError } = require('../services/domainErrors');

const SEVERITIES = Object.freeze(['Baixa', 'Média', 'Alta']);
const STATUSES = Object.freeze(['Ativo', 'Suspenso', 'Resolvido']);
const EQUIPMENT_TYPES = Object.freeze(['poste', 'predio_municipal']);
const FILTERS = Object.freeze([
  'severity',
  'status',
  'regionId',
  'equipmentId',
  'equipmentType',
]);

function parsePositiveInteger(value, field) {
  if (value === undefined) {
    return undefined;
  }
  if (!/^[1-9]\d*$/.test(String(value))) {
    throw new ValidationError({
      [field]: 'Informe um identificador inteiro positivo.',
    });
  }
  return Number(value);
}

function parseFilters(query) {
  const fields = {};
  for (const key of Object.keys(query)) {
    if (!FILTERS.includes(key)) {
      fields[key] = 'Filtro não permitido.';
    }
  }
  if (query.severity !== undefined && !SEVERITIES.includes(query.severity)) {
    fields.severity = 'Use Baixa, Média ou Alta.';
  }
  if (query.status !== undefined && !STATUSES.includes(query.status)) {
    fields.status = 'Use Ativo, Suspenso ou Resolvido.';
  }
  if (
    query.equipmentType !== undefined
    && !EQUIPMENT_TYPES.includes(query.equipmentType)
  ) {
    fields.equipmentType = 'Use poste ou predio_municipal.';
  }

  if (Object.keys(fields).length > 0) {
    throw new ValidationError(fields);
  }

  return {
    severity: query.severity,
    status: query.status,
    regionId: parsePositiveInteger(query.regionId, 'regionId'),
    equipmentId: parsePositiveInteger(query.equipmentId, 'equipmentId'),
    equipmentType: query.equipmentType,
  };
}

function toAlertResponse(alert) {
  return {
    id: alert.id,
    equipmentId: alert.equipment_id,
    equipmentType: alert.equipment_type,
    regionId: alert.region_id,
    lastReadingId: alert.last_reading_id,
    anomalyType: alert.anomaly_type,
    severity: alert.severity,
    measuredConsumptionKwh: alert.measured_consumption_kwh,
    expectedConsumptionKwh: alert.expected_consumption_kwh,
    deviationPercent: alert.deviation_percent,
    status: alert.status,
    occurrenceCount: alert.occurrence_count,
    message: alert.message,
    createdAt: alert.created_at,
    updatedAt: alert.updated_at,
    resolvedAt: alert.resolved_at,
  };
}

function createAlertRouter({
  alertService,
  authenticate,
  requireRole,
}) {
  const router = Router();
  const managerOnly = [authenticate, requireRole('Gestor')];

  router.get('/', ...managerOnly, (req, res) => {
    const alerts = alertService.list(parseFilters(req.query));
    return res.status(200).json({
      count: alerts.length,
      alerts: alerts.map(toAlertResponse),
    });
  });

  return router;
}

module.exports = { createAlertRouter };
