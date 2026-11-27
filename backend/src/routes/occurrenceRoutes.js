/** Rotas públicas de ocorrência e consulta privada por protocolo (RF12, RF13, CT13, CT14). */
const { Router } = require('express');

function toOccurrenceCreatedResponse(occurrence) {
  return {
    id: occurrence.id,
    protocol: occurrence.protocol,
    type: occurrence.type,
    status: occurrence.status,
    createdAt: occurrence.created_at,
  };
}

function toOccurrenceManagerResponse(occurrence) {
  return {
    id: occurrence.id,
    protocol: occurrence.protocol,
    citizenName: occurrence.citizen_name,
    citizenEmail: occurrence.citizen_email,
    citizenPhone: occurrence.citizen_phone,
    citizenCpfSimulated: occurrence.citizen_cpf_simulated,
    type: occurrence.type,
    description: occurrence.description,
    regionId: occurrence.region_id,
    equipmentId: occurrence.equipment_id,
    addressReference: occurrence.address_reference,
    latitude: occurrence.latitude,
    longitude: occurrence.longitude,
    status: occurrence.status,
    createdAt: occurrence.created_at,
    updatedAt: occurrence.updated_at,
  };
}

function createOccurrenceRouter({
  occurrenceService,
  authenticate,
  requireRole,
}) {
  const router = Router();

  router.get('/', authenticate, requireRole('Gestor'), (req, res) => (
    res.status(200).json(
      occurrenceService.list(req.query).map(toOccurrenceManagerResponse)
    )
  ));

  router.post('/', (req, res) => (
    res.status(201).json(
      toOccurrenceCreatedResponse(occurrenceService.create(req.body))
    )
  ));

  router.get('/:protocol', (req, res) => {
    const occurrence = occurrenceService.findPublic(req.params.protocol);
    return res.status(200).json({
      status: occurrence.status,
      type: occurrence.type,
    });
  });

  return router;
}

module.exports = { createOccurrenceRouter };
