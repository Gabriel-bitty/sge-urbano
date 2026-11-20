const { runInTransaction } = require('../db/connection');
const { NotFoundError, ValidationError } = require('./domainErrors');

const TARGET_TYPES = Object.freeze(['region', 'equipment']);

/**
 * Coordena bloqueio e desbloqueio com preservação histórica e auditoria
 * (RF17, RN16, RN17, RN27, RNF16).
 */
function createBlockingService({
  database,
  regionRepository,
  equipmentRepository,
  alertRepository,
  auditService,
  clock = () => new Date(),
}) {
  if (
    !database
    || !regionRepository
    || !equipmentRepository
    || !alertRepository
    || !auditService
    || typeof auditService.record !== 'function'
    || typeof auditService.list !== 'function'
  ) {
    throw new TypeError(
      'Banco, repositórios e serviço de auditoria são obrigatórios.'
    );
  }

  function parseId(id) {
    if (!/^[1-9]\d*$/.test(String(id))) {
      throw new ValidationError({ id: 'Informe um identificador inteiro positivo.' });
    }
    return Number(id);
  }

  function validateTargetType(targetType) {
    if (!TARGET_TYPES.includes(targetType)) {
      throw new ValidationError({ targetType: 'Use region ou equipment.' });
    }
  }

  function validateActor(actor) {
    if (
      !actor
      || !Number.isSafeInteger(actor.id)
      || actor.id < 1
      || typeof actor.role !== 'string'
      || !actor.role.trim()
    ) {
      throw new TypeError('Um usuário autenticado válido é obrigatório.');
    }
  }

  function repositoryFor(targetType) {
    return targetType === 'region' ? regionRepository : equipmentRepository;
  }

  function findTarget(targetType, targetId) {
    const target = repositoryFor(targetType).findById(targetId);
    if (!target) {
      throw new NotFoundError(targetType === 'region' ? 'Região' : 'Equipamento');
    }
    return target;
  }

  function validateReason(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new ValidationError({ body: 'Deve ser um objeto JSON.' });
    }

    const fields = {};
    for (const key of Object.keys(payload)) {
      if (key !== 'reason') {
        fields[key] = 'Campo não permitido.';
      }
    }

    const reason = typeof payload.reason === 'string'
      ? payload.reason.trim()
      : '';

    if (reason.length < 10) {
      fields.reason = 'Informe um motivo com pelo menos 10 caracteres.';
    }

    if (Object.keys(fields).length > 0) {
      throw new ValidationError(fields);
    }

    return reason;
  }

  function suspendAlerts(equipmentId, timestamp) {
    const alerts = alertRepository.list({
      equipmentId,
      status: 'Ativo',
    });

    for (const alert of alerts) {
      alertRepository.update(alert.id, {
        status: 'Suspenso',
        updatedAt: timestamp,
      });
    }

    return alerts.map((alert) => alert.id);
  }

  function reactivateAlerts(equipmentId, timestamp) {
    const alerts = alertRepository.list({
      equipmentId,
      status: 'Suspenso',
    });

    for (const alert of alerts) {
      alertRepository.update(alert.id, {
        status: 'Ativo',
        updatedAt: timestamp,
      });
    }

    return alerts.map((alert) => alert.id);
  }

  function blockEquipmentsInRegion(regionId, reason, timestamp) {
    const affectedEquipment = equipmentRepository.list({
      regionId,
      status: 'Ativo',
    });
    const suspendedAlertIds = [];

    for (const equipment of affectedEquipment) {
      equipmentRepository.update(equipment.id, {
        status: 'Bloqueado',
        previousStatus: equipment.status,
        blockReason: reason,
        updatedAt: timestamp,
      });
      suspendedAlertIds.push(...suspendAlerts(equipment.id, timestamp));
    }

    return {
      affectedEquipmentIds: affectedEquipment
        .map((equipment) => equipment.id)
        .sort((firstId, secondId) => firstId - secondId),
      suspendedAlertIds: suspendedAlertIds.sort(
        (firstId, secondId) => firstId - secondId
      ),
    };
  }

  function findRegionCascadeEquipmentIds(regionId) {
    const blockEvent = auditService.list({
      action: 'region.blocked',
      targetType: 'region',
      targetId: String(regionId),
    })[0];

    if (!blockEvent || !blockEvent.details) {
      throw new ValidationError({
        status: 'Não foi possível localizar o bloqueio regional anterior.',
      });
    }

    const details = JSON.parse(blockEvent.details);
    if (
      !details
      || !Array.isArray(details.affectedEquipmentIds)
      || details.affectedEquipmentIds.some(
        (equipmentId) => !Number.isSafeInteger(equipmentId) || equipmentId < 1
      )
    ) {
      throw new ValidationError({
        status: 'O histórico do bloqueio regional está inconsistente.',
      });
    }

    return details.affectedEquipmentIds;
  }

  function unblockEquipmentsInRegion(regionId, timestamp) {
    const affectedEquipmentIds = findRegionCascadeEquipmentIds(regionId);
    const restoredEquipmentIds = [];
    const reactivatedAlertIds = [];

    for (const equipmentId of affectedEquipmentIds) {
      const equipment = equipmentRepository.findById(equipmentId);
      if (
        !equipment
        || equipment.region_id !== regionId
        || equipment.status !== 'Bloqueado'
      ) {
        throw new ValidationError({
          status: 'O estado de um equipamento da cascata foi alterado.',
        });
      }
      if (equipment.previous_status !== 'Ativo') {
        throw new ValidationError({
          status: 'O estado anterior do equipamento bloqueado é inválido.',
        });
      }

      equipmentRepository.update(equipment.id, {
        status: equipment.previous_status,
        previousStatus: null,
        blockReason: null,
        updatedAt: timestamp,
      });
      restoredEquipmentIds.push(equipment.id);
      reactivatedAlertIds.push(...reactivateAlerts(equipment.id, timestamp));
    }

    return { reactivatedAlertIds, restoredEquipmentIds };
  }

  function recordAudit({
    actor,
    target,
    targetType,
    action,
    previousValue,
    newValue,
    reason = null,
    details,
  }) {
    auditService.record({
      actorUserId: actor.id,
      actorRole: actor.role,
      action: `${targetType}.${action}`,
      targetType,
      targetId: String(target.id),
      reason,
      previousValue,
      newValue,
      details: JSON.stringify(details),
    });
  }

  function block(targetType, id, payload, actor) {
    validateTargetType(targetType);
    validateActor(actor);
    const targetId = parseId(id);
    const reason = validateReason(payload);
    const timestamp = clock().toISOString();

    return runInTransaction(database, () => {
      const target = findTarget(targetType, targetId);
      if (target.status !== 'Ativo') {
        throw new ValidationError({
          status: target.status === 'Bloqueado'
            ? 'O objeto já está bloqueado.'
            : 'Somente objetos ativos podem ser bloqueados.',
        });
      }

      repositoryFor(targetType).update(target.id, {
        status: 'Bloqueado',
        previousStatus: target.status,
        blockReason: reason,
        updatedAt: timestamp,
      });

      const effects = targetType === 'region'
        ? blockEquipmentsInRegion(target.id, reason, timestamp)
        : {
          affectedEquipmentIds: [target.id],
          suspendedAlertIds: suspendAlerts(target.id, timestamp),
        };

      recordAudit({
        actor,
        target,
        targetType,
        action: 'blocked',
        previousValue: target.status,
        newValue: 'Bloqueado',
        reason,
        details: effects,
      });

      return findTarget(targetType, target.id);
    });
  }

  function unblock(targetType, id, actor) {
    validateTargetType(targetType);
    validateActor(actor);
    const targetId = parseId(id);
    const timestamp = clock().toISOString();

    return runInTransaction(database, () => {
      const target = findTarget(targetType, targetId);
      if (target.status !== 'Bloqueado') {
        throw new ValidationError({ status: 'O objeto não está bloqueado.' });
      }
      if (target.previous_status !== 'Ativo') {
        throw new ValidationError({ status: 'O estado anterior do objeto é inválido.' });
      }

      repositoryFor(targetType).update(target.id, {
        status: target.previous_status,
        previousStatus: null,
        blockReason: null,
        updatedAt: timestamp,
      });

      const effects = targetType === 'region'
        ? unblockEquipmentsInRegion(target.id, timestamp)
        : {
          restoredEquipmentIds: [target.id],
          reactivatedAlertIds: reactivateAlerts(target.id, timestamp),
        };

      recordAudit({
        actor,
        target,
        targetType,
        action: 'unblocked',
        previousValue: 'Bloqueado',
        newValue: target.previous_status,
        details: effects,
      });

      return findTarget(targetType, target.id);
    });
  }

  return { block, unblock };
}

module.exports = { createBlockingService };
