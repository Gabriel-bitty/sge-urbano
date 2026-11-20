/** Rotas de bloqueio e desbloqueio auditados (RF17, RN16, RNF16, CT18–CT20). */
const { Router } = require('express');

function toBlockedTargetResponse(target, targetType) {
  const response = {
    id: target.id,
    status: target.status,
    previousStatus: target.previous_status,
    blockReason: target.block_reason,
    updatedAt: target.updated_at,
  };

  if (targetType === 'region') {
    response.name = target.name;
    return response;
  }

  response.regionId = target.region_id;
  response.type = target.type;
  response.location = target.location;
  return response;
}

function createBlockingRouter({
  blockingService,
  authenticate,
  requireRole,
}) {
  const router = Router();
  const managerOnly = [authenticate, requireRole('Gestor')];

  router.post('/regions/:id/block', ...managerOnly, (req, res) => (
    res.status(200).json(toBlockedTargetResponse(
      blockingService.block('region', req.params.id, req.body, req.user),
      'region'
    ))
  ));

  router.post('/regions/:id/unblock', ...managerOnly, (req, res) => (
    res.status(200).json(toBlockedTargetResponse(
      blockingService.unblock('region', req.params.id, req.user),
      'region'
    ))
  ));

  router.post('/equipments/:id/block', ...managerOnly, (req, res) => (
    res.status(200).json(toBlockedTargetResponse(
      blockingService.block('equipment', req.params.id, req.body, req.user),
      'equipment'
    ))
  ));

  router.post('/equipments/:id/unblock', ...managerOnly, (req, res) => (
    res.status(200).json(toBlockedTargetResponse(
      blockingService.unblock('equipment', req.params.id, req.user),
      'equipment'
    ))
  ));

  return router;
}

module.exports = { createBlockingRouter };
