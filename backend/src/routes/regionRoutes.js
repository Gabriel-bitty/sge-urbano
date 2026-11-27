/** Rotas protegidas de gestão de regiões (RF02, RF03, RN20, CT02). */
const { Router } = require('express');

function toRegionResponse(region) {
  return {
    id: region.id,
    name: region.name,
    latitude: region.latitude,
    longitude: region.longitude,
    status: region.status,
    createdAt: region.created_at,
    updatedAt: region.updated_at,
  };
}

function toPublicRegionResponse(region) {
  return {
    id: region.id,
    name: region.name,
  };
}

function createRegionRouter({ regionService, authenticate, requireRole }) {
  const router = Router();
  const managerOnly = [authenticate, requireRole('Gestor')];

  router.get('/public', (req, res) => (
    res.status(200).json(regionService.list().map(toPublicRegionResponse))
  ));

  router.get('/', ...managerOnly, (req, res) => (
    res.status(200).json(regionService.list().map(toRegionResponse))
  ));

  router.get('/:id', ...managerOnly, (req, res) => (
    res.status(200).json(toRegionResponse(regionService.findById(req.params.id)))
  ));

  router.post('/', ...managerOnly, (req, res) => (
    res.status(201).json(toRegionResponse(regionService.create(req.body)))
  ));

  router.patch('/:id', ...managerOnly, (req, res) => (
    res.status(200).json(
      toRegionResponse(regionService.update(req.params.id, req.body, req.user))
    )
  ));

  return router;
}

module.exports = { createRegionRouter };
