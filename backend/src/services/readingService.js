/** Consulta e valida filtros de leituras persistidas (RF05, RN05, CT04, CT24). */
const { ValidationError } = require('./domainErrors');

const FILTERS = Object.freeze([
  'equipmentId',
  'batchId',
  'scenario',
  'isAnomaly',
  'from',
  'to',
  'regionId',
  'equipmentType',
]);
const SCENARIOS = Object.freeze(['normal', 'pico', 'falha']);
const EQUIPMENT_TYPES = Object.freeze(['poste', 'predio_municipal']);

function parsePositiveInteger(value, field) {
  if (value === undefined) {
    return undefined;
  }
  if (!/^[1-9]\d*$/.test(String(value))) {
    throw new ValidationError({
      [field]: 'Informe um identificador inteiro positivo.',
    });
  }
  return Number(value);
}

function createReadingService({ readingRepository }) {
  if (!readingRepository || typeof readingRepository.list !== 'function') {
    throw new TypeError('Repositório de leituras válido é obrigatório.');
  }

  function list(query = {}) {
    const fields = {};
    for (const key of Object.keys(query)) {
      if (!FILTERS.includes(key)) {
        fields[key] = 'Filtro não permitido.';
      }
    }
    if (query.scenario !== undefined && !SCENARIOS.includes(query.scenario)) {
      fields.scenario = 'Use normal, pico ou falha.';
    }
    if (
      query.equipmentType !== undefined
      && !EQUIPMENT_TYPES.includes(query.equipmentType)
    ) {
      fields.equipmentType = 'Use poste ou predio_municipal.';
    }
    if (
      query.isAnomaly !== undefined
      && !['0', '1'].includes(String(query.isAnomaly))
    ) {
      fields.isAnomaly = 'Use 0 ou 1.';
    }
    if (Object.keys(fields).length > 0) {
      throw new ValidationError(fields);
    }

    return readingRepository.list({
      equipmentId: parsePositiveInteger(query.equipmentId, 'equipmentId'),
      batchId: query.batchId,
      scenario: query.scenario,
      isAnomaly: query.isAnomaly === undefined
        ? undefined
        : Number(query.isAnomaly),
      from: query.from,
      to: query.to,
      regionId: parsePositiveInteger(query.regionId, 'regionId'),
      equipmentType: query.equipmentType,
    });
  }

  return { list };
}

module.exports = { createReadingService };
