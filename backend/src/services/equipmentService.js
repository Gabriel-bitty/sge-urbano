const { runInTransaction } = require('../db/connection');
const { NotFoundError, ValidationError } = require('./domainErrors');

const EQUIPMENT_FIELDS = Object.freeze([
  'regionId',
  'type',
  'location',
  'expectedConsumptionKwh',
  'latitude',
  'longitude',
  'status',
]);
const EQUIPMENT_TYPES = Object.freeze(['poste', 'predio_municipal']);

function validateObject(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new ValidationError({ body: 'Deve ser um objeto JSON.' });
  }

  const fields = {};
  for (const key of Object.keys(payload)) {
    if (!EQUIPMENT_FIELDS.includes(key)) {
      fields[key] = 'Campo não permitido.';
    }
  }

  if (Object.keys(fields).length > 0) {
    throw new ValidationError(fields);
  }
}

function parseId(id) {
  if (!/^[1-9]\d*$/.test(String(id))) {
    throw new ValidationError({ id: 'Informe um identificador inteiro positivo.' });
  }
  return Number(id);
}

function validateEquipmentValues(values, required) {
  const fields = {};
  const checkRequired = (key) => required || values[key] !== undefined;

  if (
    checkRequired('regionId')
    && (!Number.isSafeInteger(values.regionId) || values.regionId < 1)
  ) {
    fields.regionId = 'Informe o identificador inteiro positivo de uma região.';
  }

  if (
    checkRequired('type')
    && !EQUIPMENT_TYPES.includes(values.type)
  ) {
    fields.type = 'Use poste ou predio_municipal.';
  }

  if (checkRequired('location')) {
    if (
      typeof values.location !== 'string'
      || values.location.trim().length < 3
      || values.location.trim().length > 200
    ) {
      fields.location = 'Informe uma localização com 3 a 200 caracteres.';
    }
  }

  if (
    checkRequired('expectedConsumptionKwh')
    && (
      typeof values.expectedConsumptionKwh !== 'number'
      || !Number.isFinite(values.expectedConsumptionKwh)
      || values.expectedConsumptionKwh <= 0
    )
  ) {
    fields.expectedConsumptionKwh = 'O consumo esperado deve ser maior que zero.';
  }

  for (const [field, minimum, maximum] of [
    ['latitude', -90, 90],
    ['longitude', -180, 180],
  ]) {
    if (
      checkRequired(field)
      && (
        typeof values[field] !== 'number'
        || !Number.isFinite(values[field])
        || values[field] < minimum
        || values[field] > maximum
      )
    ) {
      fields[field] = `Informe um número entre ${minimum} e ${maximum}.`;
    }
  }

  if (values.status !== undefined && values.status !== 'Inativo') {
    fields.status = 'O único estado permitido por esta operação é Inativo.';
  }

  if (Object.keys(fields).length > 0) {
    throw new ValidationError(fields);
  }
}

function createEquipmentService({
  database,
  regionRepository,
  equipmentRepository,
  clock = () => new Date(),
}) {
  if (!database || !regionRepository || !equipmentRepository) {
    throw new TypeError('Banco e repositórios de regiões/equipamentos são obrigatórios.');
  }

  function requireActiveRegion(regionId) {
    const region = regionRepository.findById(regionId);
    if (!region || region.status !== 'Ativo') {
      throw new ValidationError({
        regionId: 'A região deve existir e estar ativa.',
      });
    }
  }

  function list() {
    return equipmentRepository.list();
  }

  function findById(id) {
    const equipment = equipmentRepository.findById(parseId(id));
    if (!equipment) {
      throw new NotFoundError('Equipamento');
    }
    return equipment;
  }

  function create(payload) {
    validateObject(payload);
    validateEquipmentValues(payload, true);

    const timestamp = clock().toISOString();
    return runInTransaction(database, () => {
      requireActiveRegion(payload.regionId);
      const equipment = equipmentRepository.create({
        regionId: payload.regionId,
        type: payload.type,
        location: payload.location.trim(),
        expectedConsumptionKwh: payload.expectedConsumptionKwh,
        latitude: payload.latitude,
        longitude: payload.longitude,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      return equipmentRepository.findById(equipment.id);
    });
  }

  function update(id, payload) {
    const equipmentId = parseId(id);
    validateObject(payload);
    validateEquipmentValues(payload, false);

    if (Object.keys(payload).length === 0) {
      throw new ValidationError({ body: 'Informe ao menos um campo para atualizar.' });
    }

    return runInTransaction(database, () => {
      const currentEquipment = equipmentRepository.findById(equipmentId);
      if (!currentEquipment) {
        throw new NotFoundError('Equipamento');
      }

      if (
        payload.regionId !== undefined
        && payload.regionId !== currentEquipment.region_id
      ) {
        requireActiveRegion(payload.regionId);
      }

      const values = { updatedAt: clock().toISOString() };
      for (const field of [
        'regionId',
        'type',
        'location',
        'expectedConsumptionKwh',
        'latitude',
        'longitude',
        'status',
      ]) {
        if (payload[field] !== undefined) {
          values[field] = field === 'location'
            ? payload[field].trim()
            : payload[field];
        }
      }

      equipmentRepository.update(equipmentId, values);
      return equipmentRepository.findById(equipmentId);
    });
  }

  return { create, findById, list, update };
}

module.exports = { createEquipmentService };
