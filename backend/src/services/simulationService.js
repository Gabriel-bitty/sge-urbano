const { randomUUID } = require('node:crypto');
const { runInTransaction } = require('../db/connection');
const { detectAnomaly } = require('../rules/anomalia');
const { ValidationError } = require('./domainErrors');

const SCENARIOS = Object.freeze(['normal', 'pico', 'falha']);
const DEFAULT_SEED = 42;
const PEAK_FACTOR = 1.5;

function validateScenario(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new ValidationError({ body: 'Deve ser um objeto JSON.' });
  }

  const fields = {};
  for (const key of Object.keys(payload)) {
    if (key !== 'scenario') {
      fields[key] = 'Campo não permitido.';
    }
  }

  if (!SCENARIOS.includes(payload.scenario)) {
    fields.scenario = 'Use normal, pico ou falha.';
  }

  if (Object.keys(fields).length > 0) {
    throw new ValidationError(fields);
  }

  return payload.scenario;
}

function measuredConsumptionFor(scenario, expectedConsumptionKwh) {
  if (scenario === 'pico') {
    return expectedConsumptionKwh * PEAK_FACTOR;
  }
  if (scenario === 'falha') {
    return 0;
  }
  return expectedConsumptionKwh;
}

/**
 * Gera leituras simuladas determinísticas para objetos ativos
 * (RF05, RN04, RN05, RN24, RNF17, D-INS-11).
 */
function createSimulationService({
  database,
  regionRepository,
  equipmentRepository,
  readingRepository,
  parameterRepository,
  alertService,
  clock = () => new Date(),
  batchIdFactory = () => randomUUID(),
  seed = DEFAULT_SEED,
}) {
  if (
    !database
    || !regionRepository
    || !equipmentRepository
    || !readingRepository
    || !parameterRepository
    || !alertService
    || typeof alertService.process !== 'function'
  ) {
    throw new TypeError('Banco e repositórios de simulação são obrigatórios.');
  }
  if (seed !== DEFAULT_SEED) {
    throw new TypeError('A semente de simulação deve permanecer fixa em 42.');
  }

  function generate(payload) {
    const scenario = validateScenario(payload);
    const parameters = parameterRepository.listAsObject();
    const batchId = batchIdFactory();
    const recordedAt = clock().toISOString();

    return runInTransaction(database, () => {
      const readings = [];
      const alerts = [];
      const activeEquipment = equipmentRepository.list({ status: 'Ativo' });

      for (const equipment of activeEquipment) {
        const region = regionRepository.findById(equipment.region_id);
        if (!region || region.status !== 'Ativo') {
          continue;
        }

        const measuredConsumptionKwh = measuredConsumptionFor(
          scenario,
          equipment.expected_consumption_kwh
        );
        const analysis = detectAnomaly(
          measuredConsumptionKwh,
          equipment.expected_consumption_kwh,
          parameters
        );

        const reading = readingRepository.create({
          equipmentId: equipment.id,
          batchId,
          scenario,
          measuredConsumptionKwh,
          expectedConsumptionKwh: equipment.expected_consumption_kwh,
          deviationPercent: analysis.deviationPercent,
          isAnomaly: analysis.isAnomaly,
          anomalyType: analysis.anomalyType,
          severity: analysis.severity,
          origin: 'SIMULADO',
          unit: 'kWh',
          recordedAt,
        });
        const alert = alertService.process(equipment, reading);

        readings.push(reading);
        if (alert) {
          alerts.push(alert);
        }
      }

      return {
        batchId,
        scenario,
        seed,
        readingCount: readings.length,
        alertCount: alerts.length,
        readings,
        alerts,
      };
    });
  }

  return { generate };
}

module.exports = { createSimulationService };
