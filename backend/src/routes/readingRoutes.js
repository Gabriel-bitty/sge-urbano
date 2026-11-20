/** Consulta protegida de leituras persistidas (RF05, RN05, RNF17, CT04, CT24). */
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
    regionId: reading.region_id,
    equipmentType: reading.equipment_type,
  };
}

function createReadingRouter({
  readingService,
  authenticate,
  requireRole,
}) {
  const router = Router();
  const managerOnly = [authenticate, requireRole('Gestor')];

  router.get('/', ...managerOnly, (req, res) => {
    const readings = readingService.list(req.query);
    return res.status(200).json({
      count: readings.length,
      readings: readings.map(toReadingResponse),
    });
  });

  return router;
}

module.exports = { createReadingRouter };
