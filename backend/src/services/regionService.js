const { runInTransaction } = require('../db/connection');
const { NotFoundError, ValidationError } = require('./domainErrors');

const REGION_FIELDS = Object.freeze([
  'name',
  'latitude',
  'longitude',
  'status',
]);

function validateObject(payload, allowedFields) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new ValidationError({ body: 'Deve ser um objeto JSON.' });
  }

  const fields = {};
  for (const key of Object.keys(payload)) {
    if (!allowedFields.includes(key)) {
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

function validateRegionValues(values, required) {
  const fields = {};

  if (required || values.name !== undefined) {
    if (typeof values.name !== 'string' || values.name.trim().length < 2) {
      fields.name = 'Informe um nome com pelo menos 2 caracteres.';
    }
  }

  for (const [field, minimum, maximum] of [
    ['latitude', -90, 90],
    ['longitude', -180, 180],
  ]) {
    if (required || values[field] !== undefined) {
      if (
        typeof values[field] !== 'number'
        || !Number.isFinite(values[field])
        || values[field] < minimum
        || values[field] > maximum
      ) {
        fields[field] = `Informe um número entre ${minimum} e ${maximum}.`;
      }
    }
  }

  if (values.status !== undefined && values.status !== 'Inativo') {
    fields.status = 'O único estado permitido por esta operação é Inativo.';
  }

  if (Object.keys(fields).length > 0) {
    throw new ValidationError(fields);
  }
}

function createRegionService({
  database,
  regionRepository,
  equipmentRepository,
  auditService,
  clock = () => new Date(),
}) {
  if (
    !database
    || !regionRepository
    || !equipmentRepository
    || !auditService
    || typeof auditService.record !== 'function'
  ) {
    throw new TypeError(
      'Banco, repositórios de regiões/equipamentos e serviço de auditoria são obrigatórios.'
    );
  }

  function list() {
    return regionRepository.list();
  }

  function findById(id) {
    const regionId = parseId(id);
    const region = regionRepository.findById(regionId);
    if (!region) {
      throw new NotFoundError('Região');
    }
    return region;
  }

  function create(payload) {
    validateObject(payload, REGION_FIELDS.filter((field) => field !== 'status'));
    validateRegionValues(payload, true);

    const timestamp = clock().toISOString();
    return regionRepository.create({
      name: payload.name.trim(),
      latitude: payload.latitude,
      longitude: payload.longitude,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  function update(id, payload, actor) {
    const regionId = parseId(id);
    validateObject(payload, REGION_FIELDS);
    validateRegionValues(payload, false);

    if (Object.keys(payload).length === 0) {
      throw new ValidationError({ body: 'Informe ao menos um campo para atualizar.' });
    }

    const currentRegion = regionRepository.findById(regionId);
    if (!currentRegion) {
      throw new NotFoundError('Região');
    }

    const values = { updatedAt: clock().toISOString() };
    if (payload.name !== undefined) {
      values.name = payload.name.trim();
    }
    if (payload.latitude !== undefined) {
      values.latitude = payload.latitude;
    }
    if (payload.longitude !== undefined) {
      values.longitude = payload.longitude;
    }
    if (payload.status !== undefined) {
      values.status = payload.status;
    }

    const deactivateRegion = (
      values.status === 'Inativo' && currentRegion.status !== 'Inativo'
    );

    if (!deactivateRegion) {
      regionRepository.update(regionId, values);
      return regionRepository.findById(regionId);
    }

    return runInTransaction(database, () => {
      regionRepository.update(regionId, values);
      const activeEquipment = equipmentRepository.list({
        regionId,
        status: 'Ativo',
      });

      for (const equipment of activeEquipment) {
        equipmentRepository.update(equipment.id, {
          status: 'Inativo',
          updatedAt: values.updatedAt,
        });
      }

      auditService.record({
        actorUserId: actor.id,
        actorRole: actor.role,
        action: 'region.inactivated',
        targetType: 'region',
        targetId: String(regionId),
        previousValue: currentRegion.status,
        newValue: values.status,
        details: JSON.stringify({
          affectedEquipmentIds: activeEquipment
            .map((equipment) => equipment.id)
            .sort((firstId, secondId) => firstId - secondId),
        }),
      });

      return regionRepository.findById(regionId);
    });
  }

  return { create, findById, list, update };
}

module.exports = { createRegionService };
