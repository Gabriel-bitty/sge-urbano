const { Router } = require('express');

function toWorkOrderResponse(workOrder) {
  const response = {
    id: workOrder.id,
    code: workOrder.code,
    origin: workOrder.origin,
    alertId: workOrder.alert_id,
    occurrenceId: workOrder.occurrence_id,
    regionId: workOrder.region_id,
    equipmentId: workOrder.equipment_id,
    location: workOrder.location,
    description: workOrder.description,
    status: workOrder.status,
    assignedTechnicianId: workOrder.assigned_technician_id,
    createdByUserId: workOrder.created_by_user_id,
    solutionDescription: workOrder.solution_description,
    cancellationReason: workOrder.cancellation_reason,
    createdAt: workOrder.created_at,
    updatedAt: workOrder.updated_at,
  };

  if (workOrder.occurrence) {
    response.occurrence = workOrder.occurrence;
  }

  return response;
}

function createWorkOrderRouter({
  workOrderService,
  authenticate,
  requireRole,
}) {
  const router = Router();
  const managerOnly = [authenticate, requireRole('Gestor')];

  router.get('/', authenticate, (req, res) => (
    res.status(200).json(
      workOrderService.list(req.user, req.query).map(toWorkOrderResponse)
    )
  ));

  router.get('/:id', authenticate, (req, res) => (
    res.status(200).json(
      toWorkOrderResponse(workOrderService.findById(req.params.id, req.user))
    )
  ));

  router.post('/', ...managerOnly, (req, res) => (
    res.status(201).json(
      toWorkOrderResponse(workOrderService.create(req.body, req.user))
    )
  ));

  router.post('/:id/assign', ...managerOnly, (req, res) => (
    res.status(200).json(toWorkOrderResponse(
      workOrderService.assign(
        req.params.id,
        req.body,
        req.user
      )
    ))
  ));

  router.post('/:id/reassign', ...managerOnly, (req, res) => (
    res.status(200).json(toWorkOrderResponse(
      workOrderService.assign(
        req.params.id,
        req.body,
        req.user
      )
    ))
  ));

  router.post('/:id/start', authenticate, (req, res) => (
    res.status(200).json(
      toWorkOrderResponse(workOrderService.start(req.params.id, req.user))
    )
  ));

  router.post('/:id/complete', authenticate, (req, res) => (
    res.status(200).json(toWorkOrderResponse(
      workOrderService.complete(req.params.id, req.body, req.user)
    ))
  ));

  router.post('/:id/cancel', ...managerOnly, (req, res) => (
    res.status(200).json(toWorkOrderResponse(
      workOrderService.cancel(req.params.id, req.body, req.user)
    ))
  ));

  return router;
}

module.exports = { createWorkOrderRouter };
