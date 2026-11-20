const { ForbiddenError } = require('./domainErrors');

function occurrenceMarker(occurrence) {
  return {
    id: `occurrence:${occurrence.id}`,
    source: 'occurrence',
    occurrenceId: occurrence.id,
    workOrderId: null,
    type: occurrence.type,
    status: occurrence.status,
    equipmentId: occurrence.equipment_id,
    latitude: occurrence.latitude,
    longitude: occurrence.longitude,
  };
}

/**
 * Prepara dados autorizados para marcadores, sem lógica de interface
 * (RF15, RN15, RN29, RNF07, CA15.1–CA15.3).
 */
function createMapService({
  occurrenceRepository,
  workOrderRepository,
  equipmentRepository,
  regionRepository,
}) {
  if (
    !occurrenceRepository
    || !workOrderRepository
    || !equipmentRepository
    || !regionRepository
  ) {
    throw new TypeError('Repositórios de mapa são obrigatórios.');
  }

  function markerForWorkOrder(workOrder) {
    if (workOrder.occurrence_id !== null) {
      const occurrence = occurrenceRepository.findById(workOrder.occurrence_id);
      if (occurrence) {
        return {
          ...occurrenceMarker(occurrence),
          id: `work-order:${workOrder.id}`,
          source: 'work_order',
          workOrderId: workOrder.id,
        };
      }
    }

    const equipment = workOrder.equipment_id !== null
      ? equipmentRepository.findById(workOrder.equipment_id)
      : null;
    const region = regionRepository.findById(workOrder.region_id);

    return {
      id: `work-order:${workOrder.id}`,
      source: 'work_order',
      occurrenceId: null,
      workOrderId: workOrder.id,
      type: equipment ? equipment.type : workOrder.origin,
      status: workOrder.status,
      equipmentId: workOrder.equipment_id,
      latitude: equipment ? equipment.latitude : region.latitude,
      longitude: equipment ? equipment.longitude : region.longitude,
    };
  }

  function list(actor) {
    if (!actor || !actor.id || !actor.role) {
      throw new ForbiddenError('É necessário autenticar-se para consultar o mapa.');
    }

    if (actor.role === 'Gestor') {
      return {
        profile: 'Gestor',
        markers: occurrenceRepository.list().map(occurrenceMarker),
      };
    }

    if (actor.role === 'Técnico') {
      const assignedOrders = workOrderRepository.list({
        assignedTechnicianId: actor.id,
      });
      return {
        profile: 'Técnico',
        markers: assignedOrders.map(markerForWorkOrder),
      };
    }

    throw new ForbiddenError('Perfil sem acesso aos dados do mapa.');
  }

  return { list };
}

module.exports = { createMapService };
