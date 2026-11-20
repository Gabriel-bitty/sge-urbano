const { runInTransaction } = require('../db/connection');
const {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} = require('./domainErrors');

const ORIGINS = Object.freeze(['alerta', 'cidadao', 'manual']);
const ACTIVE_WORK_ORDER_STATUSES = Object.freeze([
  'Aberta',
  'Atribuída',
  'Em atendimento',
]);

function parseId(value, field = 'id') {
  if (!/^[1-9]\d*$/.test(String(value))) {
    throw new ValidationError({
      [field]: 'Informe um identificador inteiro positivo.',
    });
  }
  return Number(value);
}

function parseOptionalId(value, field) {
  return value === undefined || value === null
    ? null
    : parseId(value, field);
}

function requiredText(value, field, minimumLength = 1) {
  if (typeof value !== 'string' || value.trim().length < minimumLength) {
    throw new ValidationError({
      [field]: `Informe um texto com pelo menos ${minimumLength} caracteres.`,
    });
  }
  return value.trim();
}

function validateActionPayload(payload, allowedField) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new ValidationError({ body: 'Deve ser um objeto JSON.' });
  }

  const fields = {};
  for (const key of Object.keys(payload)) {
    if (key !== allowedField) {
      fields[key] = 'Campo não permitido.';
    }
  }
  if (Object.keys(fields).length > 0) {
    throw new ValidationError(fields);
  }
}

/**
 * Aplica criação, transições, autorização e auditoria das OS
 * (RF09–RF11, RF18, RN09–RN12, RN18, RN19, RN21, RN25, RNF16).
 */
function createWorkOrderService({
  database,
  workOrderRepository,
  alertRepository,
  occurrenceRepository,
  regionRepository,
  equipmentRepository,
  userRepository,
  auditService,
  clock = () => new Date(),
}) {
  if (
    !database
    || !workOrderRepository
    || !alertRepository
    || !occurrenceRepository
    || !regionRepository
    || !equipmentRepository
    || !userRepository
    || !auditService
  ) {
    throw new TypeError(
      'Banco, repositórios de OS e serviço de auditoria são obrigatórios.'
    );
  }

  function validateActor(actor) {
    if (!actor || !Number.isSafeInteger(actor.id) || actor.id < 1) {
      throw new TypeError('Um usuário autenticado válido é obrigatório.');
    }
    return actor;
  }

  function requireManager(actor) {
    validateActor(actor);
    if (actor.role !== 'Gestor') {
      throw new ForbiddenError('Somente o Gestor pode executar esta operação.');
    }
  }

  function findWorkOrder(id) {
    const workOrder = workOrderRepository.findById(parseId(id));
    if (!workOrder) {
      throw new NotFoundError('Ordem de serviço');
    }
    return workOrder;
  }

  function requireManagerOrAssignedTechnician(workOrder, actor, action) {
    validateActor(actor);
    if (
      actor.role === 'Gestor'
      || (
        actor.role === 'Técnico'
        && workOrder.assigned_technician_id === actor.id
      )
    ) {
      return;
    }

    auditService.record({
      actorUserId: actor.id,
      actorRole: actor.role,
      action: `work_order.${action}.denied`,
      targetType: 'work_order',
      targetId: String(workOrder.id),
      previousValue: workOrder.status,
      reason: 'usuario_nao_autorizado_ou_nao_atribuido',
    });
    throw new ForbiddenError('A OS não pode ser alterada por este usuário.');
  }

  function requireActiveTechnician(technicianId) {
    const technician = userRepository.findById(technicianId);
    if (!technician || technician.role !== 'Técnico' || technician.status !== 'Ativo') {
      throw new ValidationError({
        technicianId: 'Informe um Técnico ativo para receber a OS.',
      });
    }
    return technician;
  }

  function validateCreateObject(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new ValidationError({ body: 'Deve ser um objeto JSON.' });
    }

    const allowedFieldsByOrigin = {
      alerta: ['origin', 'alertId', 'description'],
      cidadao: ['origin', 'occurrenceId', 'description'],
      manual: [
        'origin',
        'regionId',
        'equipmentId',
        'location',
        'description',
      ],
    };
    const allowedFields = allowedFieldsByOrigin[payload.origin] || ['origin'];
    const fields = {};
    for (const key of Object.keys(payload)) {
      if (!allowedFields.includes(key)) {
        fields[key] = 'Campo não permitido.';
      }
    }
    if (!ORIGINS.includes(payload.origin)) {
      fields.origin = 'Use alerta, cidadao ou manual.';
    }
    if (Object.keys(fields).length > 0) {
      throw new ValidationError(fields);
    }
  }

  function resolveAlertOrigin(payload) {
    const alertId = parseId(payload.alertId, 'alertId');
    const alert = alertRepository.findById(alertId);
    if (!alert || alert.status !== 'Ativo') {
      throw new ValidationError({ alertId: 'Informe um alerta ativo.' });
    }
    if (workOrderRepository.findActiveByAlertId(alert.id)) {
      throw new ValidationError({
        alertId: 'Já existe uma OS ativa vinculada a este alerta.',
      });
    }

    const equipment = equipmentRepository.findById(alert.equipment_id);
    if (!equipment) {
      throw new NotFoundError('Equipamento do alerta');
    }

    return {
      alertId: alert.id,
      occurrenceId: null,
      regionId: alert.region_id,
      equipmentId: alert.equipment_id,
      location: equipment.location,
      description: requiredText(
        payload.description ?? alert.message,
        'description',
        3
      ),
    };
  }

  function resolveOccurrenceOrigin(payload) {
    const occurrenceId = parseId(payload.occurrenceId, 'occurrenceId');
    const occurrence = occurrenceRepository.findById(occurrenceId);
    if (!occurrence) {
      throw new NotFoundError('Ocorrência');
    }
    if (occurrence.status !== 'Aberta') {
      throw new ValidationError({
        occurrenceId: 'A ocorrência deve estar Aberta para gerar uma OS.',
      });
    }

    return {
      alertId: null,
      occurrenceId: occurrence.id,
      regionId: occurrence.region_id,
      equipmentId: occurrence.equipment_id,
      location: occurrence.address_reference,
      description: requiredText(
        payload.description ?? occurrence.description,
        'description',
        3
      ),
    };
  }

  function resolveManualOrigin(payload) {
    const regionId = parseId(payload.regionId, 'regionId');
    const region = regionRepository.findById(regionId);
    if (!region) {
      throw new ValidationError({ regionId: 'Informe uma região existente.' });
    }

    const equipmentId = parseOptionalId(payload.equipmentId, 'equipmentId');
    if (equipmentId !== null) {
      const equipment = equipmentRepository.findById(equipmentId);
      if (!equipment || equipment.region_id !== regionId) {
        throw new ValidationError({
          equipmentId: 'O equipamento deve existir e pertencer à região informada.',
        });
      }
    }

    return {
      alertId: null,
      occurrenceId: null,
      regionId,
      equipmentId,
      location: requiredText(payload.location, 'location', 1),
      description: requiredText(payload.description, 'description', 3),
    };
  }

  function resolveOrigin(payload) {
    if (payload.origin === 'alerta') {
      return resolveAlertOrigin(payload);
    }
    if (payload.origin === 'cidadao') {
      return resolveOccurrenceOrigin(payload);
    }
    return resolveManualOrigin(payload);
  }

  function recordTransition({
    actor,
    workOrder,
    action,
    previousValue,
    newValue,
    reason = null,
    details = {},
  }) {
    auditService.record({
      actorUserId: actor.id,
      actorRole: actor.role,
      action: `work_order.${action}`,
      targetType: 'work_order',
      targetId: String(workOrder.id),
      previousValue,
      newValue,
      reason,
      details: JSON.stringify(details),
    });
  }

  function syncOccurrenceStatus(workOrder, status, updatedAt) {
    if (workOrder.occurrence_id !== null) {
      occurrenceRepository.updateStatus(workOrder.occurrence_id, {
        status,
        updatedAt,
      });
    }
  }

  function create(payload, actor) {
    requireManager(actor);
    validateCreateObject(payload);
    const timestamp = clock().toISOString();
    const year = new Date(timestamp).getUTCFullYear();

    return runInTransaction(database, () => {
      const origin = resolveOrigin(payload);
      const workOrder = workOrderRepository.create({
        code: workOrderRepository.nextCode(year),
        origin: payload.origin,
        ...origin,
        status: 'Aberta',
        createdByUserId: actor.id,
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      recordTransition({
        actor,
        workOrder,
        action: 'created',
        previousValue: null,
        newValue: 'Aberta',
        details: {
          origin: workOrder.origin,
          alertId: workOrder.alert_id,
          occurrenceId: workOrder.occurrence_id,
        },
      });
      return workOrder;
    });
  }

  function list(actor, filters = {}) {
    validateActor(actor);
    if (actor.role === 'Gestor') {
      return workOrderRepository.list(filters).map((workOrder) => (
        withAuthorizedOccurrence(workOrder, actor)
      ));
    }
    if (actor.role === 'Técnico') {
      return workOrderRepository.list({
        ...filters,
        assignedTechnicianId: actor.id,
      }).map((workOrder) => withAuthorizedOccurrence(workOrder, actor));
    }
    throw new ForbiddenError('Perfil sem acesso a ordens de serviço.');
  }

  function findById(id, actor) {
    validateActor(actor);
    const workOrder = findWorkOrder(id);
    if (
      actor.role !== 'Gestor'
      && !(
        actor.role === 'Técnico'
        && workOrder.assigned_technician_id === actor.id
      )
    ) {
      throw new ForbiddenError('A OS não está disponível para este usuário.');
    }
    return withAuthorizedOccurrence(workOrder, actor);
  }

  function withAuthorizedOccurrence(workOrder, actor) {
    if (
      actor.role !== 'Gestor'
      || workOrder.occurrence_id === null
    ) {
      return workOrder;
    }

    const occurrence = occurrenceRepository.findById(workOrder.occurrence_id);
    if (!occurrence) {
      throw new NotFoundError('Ocorrência vinculada à OS');
    }

    return {
      ...workOrder,
      occurrence: {
        id: occurrence.id,
        protocol: occurrence.protocol,
        citizenName: occurrence.citizen_name,
        citizenEmail: occurrence.citizen_email,
        citizenPhone: occurrence.citizen_phone,
        citizenCpfSimulated: occurrence.citizen_cpf_simulated,
        type: occurrence.type,
        description: occurrence.description,
      },
    };
  }

  function assign(id, payload, actor) {
    requireManager(actor);
    validateActionPayload(payload, 'technicianId');
    const timestamp = clock().toISOString();

    return runInTransaction(database, () => {
      const workOrder = findWorkOrder(id);
      if (!['Aberta', 'Atribuída'].includes(workOrder.status)) {
        throw new ValidationError({
          status: 'Somente OS Aberta ou Atribuída pode ser atribuída.',
        });
      }
      const technician = requireActiveTechnician(
        parseId(payload.technicianId, 'technicianId')
      );
      const action = workOrder.status === 'Aberta' ? 'assigned' : 'reassigned';
      const previousTechnicianId = workOrder.assigned_technician_id;
      const updated = workOrderRepository.update(workOrder.id, {
        status: 'Atribuída',
        assignedTechnicianId: technician.id,
        updatedAt: timestamp,
      });
      syncOccurrenceStatus(workOrder, 'Atribuída', timestamp);

      recordTransition({
        actor,
        workOrder,
        action,
        previousValue: workOrder.status,
        newValue: 'Atribuída',
        details: {
          previousTechnicianId,
          newTechnicianId: technician.id,
        },
      });
      return updated;
    });
  }

  function start(id, actor) {
    validateActor(actor);
    const accessibleWorkOrder = findWorkOrder(id);
    requireManagerOrAssignedTechnician(accessibleWorkOrder, actor, 'started');
    const timestamp = clock().toISOString();

    return runInTransaction(database, () => {
      const workOrder = findWorkOrder(id);
      if (actor.role !== 'Técnico' || workOrder.status !== 'Atribuída') {
        throw new ValidationError({
          status: 'Somente o Técnico atribuído pode iniciar uma OS Atribuída.',
        });
      }

      const updated = workOrderRepository.update(workOrder.id, {
        status: 'Em atendimento',
        updatedAt: timestamp,
      });
      syncOccurrenceStatus(workOrder, 'Em atendimento', timestamp);
      recordTransition({
        actor,
        workOrder,
        action: 'started',
        previousValue: 'Atribuída',
        newValue: 'Em atendimento',
      });
      return updated;
    });
  }

  function complete(id, payload, actor) {
    validateActor(actor);
    validateActionPayload(payload, 'solution');
    const accessibleWorkOrder = findWorkOrder(id);
    requireManagerOrAssignedTechnician(accessibleWorkOrder, actor, 'completed');
    const solution = requiredText(payload && payload.solution, 'solution', 1);
    const timestamp = clock().toISOString();

    return runInTransaction(database, () => {
      const workOrder = findWorkOrder(id);
      if (workOrder.status !== 'Em atendimento') {
        throw new ValidationError({
          status: 'Somente uma OS Em atendimento pode ser concluída.',
        });
      }

      const updated = workOrderRepository.update(workOrder.id, {
        status: 'Concluída',
        solutionDescription: solution,
        updatedAt: timestamp,
      });
      if (workOrder.alert_id !== null) {
        alertRepository.update(workOrder.alert_id, {
          status: 'Resolvido',
          resolvedAt: timestamp,
          updatedAt: timestamp,
        });
      }
      syncOccurrenceStatus(workOrder, 'Concluída', timestamp);
      recordTransition({
        actor,
        workOrder,
        action: 'completed',
        previousValue: 'Em atendimento',
        newValue: 'Concluída',
        details: { solution },
      });
      return updated;
    });
  }

  function cancel(id, payload, actor) {
    requireManager(actor);
    validateActionPayload(payload, 'reason');
    const reason = requiredText(payload && payload.reason, 'reason', 1);
    const timestamp = clock().toISOString();

    return runInTransaction(database, () => {
      const workOrder = findWorkOrder(id);
      if (!['Aberta', 'Atribuída'].includes(workOrder.status)) {
        throw new ValidationError({
          status: 'Somente OS Aberta ou Atribuída pode ser cancelada.',
        });
      }

      const updated = workOrderRepository.update(workOrder.id, {
        status: 'Cancelada',
        cancellationReason: reason,
        updatedAt: timestamp,
      });
      syncOccurrenceStatus(workOrder, 'Cancelada', timestamp);
      recordTransition({
        actor,
        workOrder,
        action: 'cancelled',
        previousValue: workOrder.status,
        newValue: 'Cancelada',
        reason,
      });
      return updated;
    });
  }

  return {
    assign,
    cancel,
    complete,
    create,
    findById,
    list,
    start,
  };
}

module.exports = {
  ACTIVE_WORK_ORDER_STATUSES,
  createWorkOrderService,
};
