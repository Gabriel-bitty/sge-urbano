const { ValidationError } = require('./domainErrors');

const PERIOD_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const GROUP_BY_VALUES = Object.freeze(['region', 'equipmentType']);
const GRANULARITIES = Object.freeze(['day', 'month']);
const EQUIPMENT_TYPES = Object.freeze(['poste', 'predio_municipal']);

function parseDate(value, field) {
  if (typeof value !== 'string' || !PERIOD_PATTERN.test(value)) {
    throw new ValidationError({ [field]: 'Use o formato AAAA-MM-DD.' });
  }
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) {
    throw new ValidationError({ [field]: 'Informe uma data válida.' });
  }
  return date;
}

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

function csvCell(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(text)
    ? `"${text.replaceAll('"', '""')}"`
    : text;
}

/**
 * Gera relatório JSON e CSV a partir da mesma agregação
 * (RF16, CA16.1–CA16.3).
 */
function createReportService({
  readingRepository,
  regionRepository,
}) {
  if (!readingRepository || !regionRepository) {
    throw new TypeError('Repositórios de relatório são obrigatórios.');
  }

  function parseFilters(query = {}) {
    if (!query || typeof query !== 'object' || Array.isArray(query)) {
      throw new ValidationError({ query: 'Os filtros são inválidos.' });
    }

    const allowedFields = [
      'from',
      'to',
      'groupBy',
      'granularity',
      'regionId',
      'equipmentType',
    ];
    const fields = {};
    for (const key of Object.keys(query)) {
      if (!allowedFields.includes(key)) {
        fields[key] = 'Filtro não permitido.';
      }
    }

    const fromDate = parseDate(query.from, 'from');
    const toDate = parseDate(query.to, 'to');
    if (toDate < fromDate) {
      fields.to = 'A data final não pode ser anterior à inicial.';
    }
    if (!GROUP_BY_VALUES.includes(query.groupBy)) {
      fields.groupBy = 'Use region ou equipmentType.';
    }
    if (!GRANULARITIES.includes(query.granularity)) {
      fields.granularity = 'Use day ou month.';
    }
    const regionId = parsePositiveInteger(query.regionId, 'regionId');
    if (regionId !== undefined && !regionRepository.findById(regionId)) {
      fields.regionId = 'Informe uma região existente.';
    }
    if (
      query.equipmentType !== undefined
      && !EQUIPMENT_TYPES.includes(query.equipmentType)
    ) {
      fields.equipmentType = 'Use poste ou predio_municipal.';
    }

    if (Object.keys(fields).length > 0) {
      throw new ValidationError(fields);
    }

    return {
      from: `${query.from}T00:00:00.000Z`,
      to: `${query.to}T23:59:59.999Z`,
      groupBy: query.groupBy,
      granularity: query.granularity,
      regionId,
      equipmentType: query.equipmentType,
    };
  }

  function aggregateRows(filters) {
    const rows = readingRepository.aggregate(filters);
    return Object.values(rows.reduce((accumulator, row) => {
      const groupValue = filters.groupBy === 'region'
        ? row.region_id
        : row.equipment_type;
      const key = `${groupValue}:${row.period}`;
      accumulator[key] ??= {
        groupBy: filters.groupBy,
        groupValue,
        groupLabel: filters.groupBy === 'region'
          ? regionRepository.findById(row.region_id).name
          : row.equipment_type,
        period: row.period,
        readingCount: 0,
        measuredConsumptionKwh: 0,
        expectedConsumptionKwh: 0,
      };
      accumulator[key].readingCount += row.reading_count || 0;
      accumulator[key].measuredConsumptionKwh +=
        row.measured_consumption_kwh || 0;
      accumulator[key].expectedConsumptionKwh +=
        row.expected_consumption_kwh || 0;
      return accumulator;
    }, {})).sort((first, second) => (
      String(first.groupValue).localeCompare(String(second.groupValue))
      || first.period.localeCompare(second.period)
    ));
  }

  function get(query) {
    const filters = parseFilters(query);
    const rows = aggregateRows(filters);
    return {
      period: {
        from: filters.from.slice(0, 10),
        to: filters.to.slice(0, 10),
      },
      groupBy: filters.groupBy,
      granularity: filters.granularity,
      filters: {
        regionId: filters.regionId ?? null,
        equipmentType: filters.equipmentType ?? null,
      },
      rows,
      totals: {
        readingCount: rows.reduce(
          (total, row) => total + row.readingCount,
          0
        ),
        measuredConsumptionKwh: rows.reduce(
          (total, row) => total + row.measuredConsumptionKwh,
          0
        ),
        expectedConsumptionKwh: rows.reduce(
          (total, row) => total + row.expectedConsumptionKwh,
          0
        ),
      },
    };
  }

  function toCsv(report) {
    const header = [
      'groupBy',
      'groupValue',
      'groupLabel',
      'period',
      'readingCount',
      'measuredConsumptionKwh',
      'expectedConsumptionKwh',
    ];
    const body = report.rows.map((row) => header.map(
      (field) => csvCell(row[field])
    ).join(','));
    const total = {
      groupBy: report.groupBy,
      groupValue: 'TOTAL',
      groupLabel: 'TOTAL',
      period: '',
      readingCount: report.totals.readingCount,
      measuredConsumptionKwh: report.totals.measuredConsumptionKwh,
      expectedConsumptionKwh: report.totals.expectedConsumptionKwh,
    };
    const totalRow = header.map((field) => csvCell(total[field])).join(',');
    return [header.join(','), ...body, totalRow].join('\r\n');
  }

  return { get, toCsv };
}

module.exports = { createReportService };
