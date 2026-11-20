const { ValidationError } = require('./domainErrors');

const ALERT_MESSAGES = Object.freeze({
  falha_total: 'Falha total de consumo detectada.',
  consumo_acima: 'Consumo acima do esperado.',
  consumo_abaixo: 'Consumo abaixo do esperado.',
});

/**
 * Processa alertas sem excluir histórico nem duplicar o alerta ativo por tipo
 * (RF07, RN07, RN08, RN14).
 */
function createAlertService({
  alertRepository,
  clock = () => new Date(),
}) {
  if (!alertRepository) {
    throw new TypeError('Repositório de alertas é obrigatório.');
  }

  function process(equipment, reading) {
    if (!equipment || !reading) {
      throw new TypeError('Equipamento e leitura são obrigatórios.');
    }

    if (!reading.is_anomaly) {
      return null;
    }
    if (!ALERT_MESSAGES[reading.anomaly_type]) {
      throw new ValidationError({
        anomalyType: 'Tipo de anomalia inválido para geração de alerta.',
      });
    }

    const existingAlert = alertRepository.findActiveByEquipmentAndType(
      equipment.id,
      reading.anomaly_type
    );
    const updatedAt = clock().toISOString();

    if (existingAlert) {
      if (existingAlert.status === 'Suspenso') {
        return existingAlert;
      }

      return alertRepository.update(existingAlert.id, {
        lastReadingId: reading.id,
        severity: reading.severity,
        measuredConsumptionKwh: reading.measured_consumption_kwh,
        expectedConsumptionKwh: reading.expected_consumption_kwh,
        deviationPercent: reading.deviation_percent,
        occurrenceCount: existingAlert.occurrence_count + 1,
        message: ALERT_MESSAGES[reading.anomaly_type],
        updatedAt,
      });
    }

    return alertRepository.create({
      equipmentId: equipment.id,
      regionId: equipment.region_id,
      lastReadingId: reading.id,
      anomalyType: reading.anomaly_type,
      severity: reading.severity,
      measuredConsumptionKwh: reading.measured_consumption_kwh,
      expectedConsumptionKwh: reading.expected_consumption_kwh,
      deviationPercent: reading.deviation_percent,
      message: ALERT_MESSAGES[reading.anomaly_type],
      createdAt: reading.recorded_at,
      updatedAt,
    });
  }

  function list(filters) {
    return alertRepository.list(filters);
  }

  return { list, process };
}

module.exports = { createAlertService };
