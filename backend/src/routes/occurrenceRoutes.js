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

function createOccurrenceRouter({ occurrenceService }) {
  const router = Router();

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
