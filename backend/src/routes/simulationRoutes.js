/** Rota de geração transacional de leituras simuladas (RF05, RN05, CT04, CT24). */
const { Router } = require('express');

function toReadingResponse(reading) {
  return {
    id: reading.id,
    equipmentId: reading.equipment_id,
    batchId: reading.batch_id,
    scenario: reading.scenario,
    measuredConsumptionKwh: reading.measured_consumption_kwh,
    expectedConsumptionKwh: reading.expected_consumption_kwh,
    deviationPercent: reading.deviation_percent,
    isAnomaly: Boolean(reading.is_anomaly),
    anomalyType: reading.anomaly_type,
    severity: reading.severity,
    unit: reading.unit,
    origin: reading.origin,
    recordedAt: reading.recorded_at,
  };
}

function createSimulationRouter({
  simulationService,
  authenticate,
  requireRole,
}) {
  const router = Router();
  const managerOnly = [authenticate, requireRole('Gestor')];

  router.post('/', ...managerOnly, (req, res) => {
    const batch = simulationService.generate(req.body, req.user);

    return res.status(201).json({
      batchId: batch.batchId,
      scenario: batch.scenario,
      seed: batch.seed,
      readingCount: batch.readingCount,
      alertCount: batch.alertCount,
      readings: batch.readings.map(toReadingResponse),
    });
  });

  return router;
}

module.exports = { createSimulationRouter };
