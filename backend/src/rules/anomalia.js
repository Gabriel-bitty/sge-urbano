const PARAMETER_NAMES = Object.freeze([
  'LIM_SUP',
  'LIM_INF',
  'TOL_ZERO',
  'FAIXA_BAIXA',
  'FAIXA_MEDIA',
  'FAIXA_ALTA',
]);
const DEVIATION_PRECISION = 1e6;

function assertFiniteNumber(value, field) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${field} deve ser um número finito.`);
  }
}

function assertParameters(parameters) {
  if (!parameters || typeof parameters !== 'object') {
    throw new TypeError('Os parâmetros de anomalia são obrigatórios.');
  }

  for (const name of PARAMETER_NAMES) {
    assertFiniteNumber(parameters[name], name);

    if (parameters[name] < 0) {
      throw new RangeError(`${name} não pode ser negativo.`);
    }
  }

  if (parameters.FAIXA_MEDIA < parameters.FAIXA_BAIXA) {
    throw new RangeError('FAIXA_MEDIA não pode ser menor que FAIXA_BAIXA.');
  }

  if (parameters.FAIXA_ALTA < parameters.FAIXA_MEDIA) {
    throw new RangeError('FAIXA_ALTA não pode ser menor que FAIXA_MEDIA.');
  }
}

/**
 * Calcula o desvio percentual segundo RN28.
 */
function calculateDeviationPercent(measuredConsumptionKwh, expectedConsumptionKwh) {
  assertFiniteNumber(measuredConsumptionKwh, 'Consumo medido');
  assertFiniteNumber(expectedConsumptionKwh, 'Consumo esperado');

  if (measuredConsumptionKwh < 0) {
    throw new RangeError('O consumo medido não pode ser negativo.');
  }

  if (expectedConsumptionKwh <= 0) {
    throw new RangeError('O consumo esperado deve ser maior que zero.');
  }

  const deviationPercent = (
    ((measuredConsumptionKwh - expectedConsumptionKwh)
      / expectedConsumptionKwh)
    * 100
  );

  return Math.round(deviationPercent * DEVIATION_PRECISION)
    / DEVIATION_PRECISION;
}

function classifySeverity(anomalyType, deviationPercent, parameters) {
  assertFiniteNumber(deviationPercent, 'Desvio percentual');
  assertParameters(parameters);

  if (
    anomalyType === 'falha_total'
    || Math.abs(deviationPercent) >= parameters.FAIXA_ALTA
  ) {
    return 'Alta';
  }

  if (Math.abs(deviationPercent) >= parameters.FAIXA_MEDIA) {
    return 'Média';
  }

  return 'Baixa';
}

/**
 * Aplica RN06 e RN07 sem acessar banco, rede ou interface.
 */
function detectAnomaly(
  measuredConsumptionKwh,
  expectedConsumptionKwh,
  parameters
) {
  assertParameters(parameters);

  const deviationPercent = calculateDeviationPercent(
    measuredConsumptionKwh,
    expectedConsumptionKwh
  );

  let anomalyType = null;

  if (measuredConsumptionKwh <= parameters.TOL_ZERO) {
    anomalyType = 'falha_total';
  } else if (deviationPercent >= parameters.LIM_SUP) {
    anomalyType = 'consumo_acima';
  } else if (deviationPercent <= -parameters.LIM_INF) {
    anomalyType = 'consumo_abaixo';
  }

  return {
    isAnomaly: anomalyType !== null,
    anomalyType,
    severity: anomalyType
      ? classifySeverity(anomalyType, deviationPercent, parameters)
      : null,
    deviationPercent,
  };
}

module.exports = {
  calculateDeviationPercent,
  classifySeverity,
  detectAnomaly,
  detectarAnomalia: detectAnomaly,
};
