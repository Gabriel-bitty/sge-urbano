const { randomInt } = require('node:crypto');
const { NotFoundError, ValidationError } = require('./domainErrors');

const OCCURRENCE_TYPES = Object.freeze([
  'poste apagado',
  'oscilação de energia',
  'falta de energia',
  'prédio público com consumo anormal',
  'iluminação acesa durante o dia',
]);
const PROTOCOL_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const PROTOCOL_PATTERN =
  /^PROTOCOLO-(\d{4})(\d{2})(\d{2})-([0-9A-HJKMNP-TV-Z]{4})$/;
const TIME_ZONE = 'America/Sao_Paulo';
const MAX_PROTOCOL_ATTEMPTS = 10;

function trimmedText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function validateOccurrencePayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new ValidationError({ body: 'Deve ser um objeto JSON.' });
  }

  const allowedFields = [
    'citizenName',
    'citizenEmail',
    'citizenPhone',
    'citizenCpfSimulated',
    'type',
    'description',
    'regionId',
    'equipmentId',
    'addressReference',
  ];
  const fields = {};

  for (const key of Object.keys(payload)) {
    if (!allowedFields.includes(key)) {
      fields[key] = 'Campo não permitido.';
    }
  }
  if (trimmedText(payload.citizenName).length < 2) {
    fields.citizenName = 'Informe o nome com pelo menos 2 caracteres.';
  }
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedText(payload.citizenEmail))
  ) {
    fields.citizenEmail = 'Informe um e-mail válido.';
  }
  const citizenPhone = trimmedText(payload.citizenPhone);
  const citizenCpfSimulated = trimmedText(payload.citizenCpfSimulated);
  if (citizenPhone.length < 8 && citizenCpfSimulated.length < 11) {
    fields.contact = 'Informe telefone com 8 caracteres ou CPF simulado com 11 caracteres.';
  }
  if (!OCCURRENCE_TYPES.includes(payload.type)) {
    fields.type = 'Use um dos tipos de ocorrência permitidos.';
  }
  if (trimmedText(payload.description).length < 3) {
    fields.description = 'Informe uma descrição com pelo menos 3 caracteres.';
  }
  if (
    !Number.isSafeInteger(payload.regionId)
    || payload.regionId < 1
  ) {
    fields.regionId = 'Informe o identificador inteiro positivo da região.';
  }
  if (
    payload.equipmentId !== undefined
    && (
      !Number.isSafeInteger(payload.equipmentId)
      || payload.equipmentId < 1
    )
  ) {
    fields.equipmentId = 'Informe um identificador inteiro positivo.';
  }
  if (trimmedText(payload.addressReference).length < 3) {
    fields.addressReference = 'Informe um endereço ou ponto de referência.';
  }

  if (Object.keys(fields).length > 0) {
    throw new ValidationError(fields);
  }
}

function datePartsInSaoPaulo(date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date).map(({ type, value }) => [type, value])
  );
  return `${parts.year}${parts.month}${parts.day}`;
}

function randomSuffix() {
  return Array.from(
    { length: 4 },
    () => PROTOCOL_ALPHABET[randomInt(PROTOCOL_ALPHABET.length)]
  ).join('');
}

function isUniqueConstraint(error) {
  return error && error.code === 'ERR_SQLITE_CONSTRAINT_UNIQUE';
}

function normalizeAndValidateProtocol(protocol) {
  const normalized = trimmedText(protocol).toUpperCase();
  const match = normalized.match(PROTOCOL_PATTERN);
  if (!match) {
    throw new ValidationError({
      protocol: 'Informe um protocolo no formato PROTOCOLO-AAAAMMDD-XXXX.',
    });
  }

  const [, yearText, monthText, dayText] = match;
  const date = new Date(
    Date.UTC(
      Number(yearText),
      Number(monthText) - 1,
      Number(dayText)
    )
  );
  if (
    date.getUTCFullYear() !== Number(yearText)
    || date.getUTCMonth() !== Number(monthText) - 1
    || date.getUTCDate() !== Number(dayText)
  ) {
    throw new ValidationError({ protocol: 'A data do protocolo é inválida.' });
  }

  return normalized;
}

/**
 * Valida o registro público e protege a consulta do protocolo
 * (RF12, RF13, RN13, RN22, RN23, RN26).
 */
function createOccurrenceService({
  occurrenceRepository,
  regionRepository,
  equipmentRepository,
  clock = () => new Date(),
}) {
  if (!occurrenceRepository || !regionRepository || !equipmentRepository) {
    throw new TypeError('Repositórios de ocorrência e cadastro são obrigatórios.');
  }

  function resolveCoordinates(payload) {
    const region = regionRepository.findById(payload.regionId);
    if (!region) {
      throw new ValidationError({ regionId: 'Informe uma região existente.' });
    }

    if (payload.equipmentId !== undefined) {
      const equipment = equipmentRepository.findById(payload.equipmentId);
      if (!equipment || equipment.region_id !== payload.regionId) {
        throw new ValidationError({
          equipmentId: 'O equipamento deve existir e pertencer à região informada.',
        });
      }
      return {
        equipmentId: equipment.id,
        latitude: equipment.latitude,
        longitude: equipment.longitude,
      };
    }

    return {
      equipmentId: null,
      latitude: region.latitude,
      longitude: region.longitude,
    };
  }

  function create(payload) {
    validateOccurrencePayload(payload);
    const timestamp = clock().toISOString();
    const coordinates = resolveCoordinates(payload);
    const dateCode = datePartsInSaoPaulo(new Date(timestamp));

    for (let attempt = 0; attempt < MAX_PROTOCOL_ATTEMPTS; attempt += 1) {
      const protocol = `PROTOCOLO-${dateCode}-${randomSuffix()}`;
      try {
        return occurrenceRepository.create({
          protocol,
          citizenName: payload.citizenName.trim(),
          citizenEmail: payload.citizenEmail.trim(),
          citizenPhone: trimmedText(payload.citizenPhone) || null,
          citizenCpfSimulated: trimmedText(payload.citizenCpfSimulated) || null,
          type: payload.type,
          description: payload.description.trim(),
          regionId: payload.regionId,
          equipmentId: coordinates.equipmentId,
          addressReference: payload.addressReference.trim(),
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          status: 'Aberta',
          createdAt: timestamp,
          updatedAt: timestamp,
        });
      } catch (error) {
        if (!isUniqueConstraint(error)) {
          throw error;
        }
      }
    }

    throw new Error('Não foi possível gerar um protocolo único após várias tentativas.');
  }

  function findPublic(protocol) {
    const normalized = normalizeAndValidateProtocol(protocol);
    const occurrence = occurrenceRepository.findPublicByProtocol(normalized);
    if (!occurrence) {
      throw new NotFoundError('Ocorrência para o protocolo informado');
    }
    return occurrence;
  }

  function findById(id) {
    if (!Number.isSafeInteger(Number(id)) || Number(id) < 1) {
      throw new ValidationError({ id: 'Informe um identificador inteiro positivo.' });
    }
    const occurrence = occurrenceRepository.findById(Number(id));
    if (!occurrence) {
      throw new NotFoundError('Ocorrência');
    }
    return occurrence;
  }

  function list(filters = {}) {
    const allowedFilters = [
      'status',
      'type',
      'regionId',
      'equipmentId',
      'from',
      'to',
    ];
    const fields = {};
    for (const key of Object.keys(filters)) {
      if (!allowedFilters.includes(key)) {
        fields[key] = 'Filtro não permitido.';
      }
    }
    if (filters.type !== undefined && !OCCURRENCE_TYPES.includes(filters.type)) {
      fields.type = 'Use um dos tipos de ocorrência permitidos.';
    }
    if (
      filters.regionId !== undefined
      && (
        !Number.isSafeInteger(Number(filters.regionId))
        || Number(filters.regionId) < 1
      )
    ) {
      fields.regionId = 'Informe um identificador inteiro positivo.';
    }
    if (
      filters.equipmentId !== undefined
      && (
        !Number.isSafeInteger(Number(filters.equipmentId))
        || Number(filters.equipmentId) < 1
      )
    ) {
      fields.equipmentId = 'Informe um identificador inteiro positivo.';
    }
    if (Object.keys(fields).length > 0) {
      throw new ValidationError(fields);
    }

    return occurrenceRepository.list({
      ...filters,
      regionId: filters.regionId === undefined
        ? undefined
        : Number(filters.regionId),
      equipmentId: filters.equipmentId === undefined
        ? undefined
        : Number(filters.equipmentId),
    });
  }

  return { create, findById, findPublic, list };
}

module.exports = {
  OCCURRENCE_TYPES,
  createOccurrenceService,
  normalizeAndValidateProtocol,
};
