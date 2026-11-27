/** Rotas protegidas de gestão de equipamentos (RF02, RF04, CT03). */
const { Router } = require('express');

function toEquipmentResponse(equipment) {
  return {
    id: equipment.id,
    regionId: equipment.region_id,
    regionName: equipment.region_name,
    type: equipment.type,
    location: equipment.location,
    expectedConsumptionKwh: equipment.expected_consumption_kwh,
    latitude: equipment.latitude,
    longitude: equipment.longitude,
    status: equipment.status,
    createdAt: equipment.created_at,
    updatedAt: equipment.updated_at,
  };
}

function createEquipmentRouter({ equipmentService, authenticate, requireRole }) {
  const router = Router();
  const managerOnly = [authenticate, requireRole('Gestor')];

  router.get('/', ...managerOnly, (req, res) => (
    res.status(200).json(equipmentService.list().map(toEquipmentResponse))
  ));

  router.get('/:id', ...managerOnly, (req, res) => (
    res.status(200).json(
      toEquipmentResponse(equipmentService.findById(req.params.id))
    )
  ));

  router.post('/', ...managerOnly, (req, res) => (
    res.status(201).json(toEquipmentResponse(equipmentService.create(req.body)))
  ));

  router.patch('/:id', ...managerOnly, (req, res) => (
    res.status(200).json(
      toEquipmentResponse(
        equipmentService.update(req.params.id, req.body)
      )
    )
  ));

  return router;
}

module.exports = { createEquipmentRouter };
