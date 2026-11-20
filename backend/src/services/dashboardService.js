const { ValidationError } = require('./domainErrors');

const PERIOD_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const EQUIPMENT_TYPES = Object.freeze(['poste', 'predio_municipal']);
const SEVERITIES = Object.freeze(['Baixa', 'Média', 'Alta']);

function parseDate(value, field) {
  if (!PERIOD_PATTERN.test(value)) {
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

function monthPeriod(clock) {
  const current = clock();
  const from = new Date(Date.UTC(
    current.getUTCFullYear(),
    current.getUTCMonth(),
    1
  ));
  const to = new Date(Date.UTC(
    current.getUTCFullYear(),
    current.getUTCMonth() + 1,
    0
  ));
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
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

/**
 * Consolida indicadores do dashboard sem executar SQL
 * (RF14, RNF02, RNF11, RNF17, CA14.1–CA14.3).
 */
function createDashboardService({
  equipmentRepository,
  readingRepository,
  alertRepository,
  workOrderRepository,
  regionRepository,
  clock = () => new Date(),
}) {
  if (
    !equipmentRepository
    || !readingRepository
    || !alertRepository
    || !workOrderRepository
    || !regionRepository
  ) {
    throw new TypeError('Repositórios de dashboard são obrigatórios.');
  }

  function parseFilters(query = {}) {
    if (!query || typeof query !== 'object' || Array.isArray(query)) {
      throw new ValidationError({ query: 'Os filtros são inválidos.' });
    }

    const allowedFields = ['from', 'to', 'regionId', 'equipmentType'];
    const fields = {};
    for (const key of Object.keys(query)) {
      if (!allowedFields.includes(key)) {
        fields[key] = 'Filtro não permitido.';
      }
    }

    const defaultPeriod = monthPeriod(clock);
    const from = query.from ?? defaultPeriod.from;
    const to = query.to ?? defaultPeriod.to;
    const fromDate = parseDate(from, 'from');
    const toDate = parseDate(to, 'to');
    if (toDate < fromDate) {
      fields.to = 'A data final não pode ser anterior à inicial.';
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
      from: `${from}T00:00:00.000Z`,
      to: `${to}T23:59:59.999Z`,
      regionId,
      equipmentType: query.equipmentType,
    };
  }

  function sumRows(rows, field) {
    return rows.reduce((total, row) => total + (row[field] || 0), 0);
  }

  function get(query) {
    const filters = parseFilters(query);
    const activeEquipment = equipmentRepository.list({
      status: 'Ativo',
      regionId: filters.regionId,
      type: filters.equipmentType,
    });
    const readings = readingRepository.aggregate(filters);
    const readingTrend = readingRepository.aggregate({
      ...filters,
      granularity: 'day',
    });
    const alertAggregates = alertRepository.aggregateByStatus(filters);
    const recentAlerts = alertRepository.list(filters).slice(0, 10);
    const workOrderRows = [
      ...workOrderRepository.list({ ...filters, status: 'Aberta' }),
      ...workOrderRepository.list({ ...filters, status: 'Atribuída' }),
      ...workOrderRepository.list({ ...filters, status: 'Em atendimento' }),
    ];
    const pendingWorkOrders = workOrderRows
      .sort((first, second) => (
        second.updated_at.localeCompare(first.updated_at)
        || second.id - first.id
      ))
      .slice(0, 10);

    const alertsBySeverity = Object.fromEntries(
      SEVERITIES.map((severity) => [
        severity,
        sumRows(
          alertAggregates.filter((row) => (
            row.status === 'Ativo' && row.severity === severity
          )),
          'total'
        ),
      ])
    );
    const activeAlerts = sumRows(
      alertAggregates.filter((row) => row.status === 'Ativo'),
      'total'
    );
    const pendingByStatus = {};
    for (const status of ['Aberta', 'Atribuída', 'Em atendimento']) {
      pendingByStatus[status] = workOrderRows
        .filter((workOrder) => workOrder.status === status)
        .length;
    }

    const consumptionByRegion = Object.values(
      readings.reduce((accumulator, row) => {
        const key = String(row.region_id);
        accumulator[key] ??= {
          regionId: row.region_id,
          measuredConsumptionKwh: 0,
          expectedConsumptionKwh: 0,
          readingCount: 0,
        };
        accumulator[key].measuredConsumptionKwh +=
          row.measured_consumption_kwh || 0;
        accumulator[key].expectedConsumptionKwh +=
          row.expected_consumption_kwh || 0;
        accumulator[key].readingCount += row.reading_count || 0;
        return accumulator;
      }, {})
    ).sort((first, second) => first.regionId - second.regionId);

    const consumptionTrend = Object.values(
      readingTrend.reduce((accumulator, row) => {
        accumulator[row.period] ??= {
          date: row.period,
          measuredConsumptionKwh: 0,
          expectedConsumptionKwh: 0,
          readingCount: 0,
        };
        accumulator[row.period].measuredConsumptionKwh +=
          row.measured_consumption_kwh || 0;
        accumulator[row.period].expectedConsumptionKwh +=
          row.expected_consumption_kwh || 0;
        accumulator[row.period].readingCount += row.reading_count || 0;
        return accumulator;
      }, {})
    ).sort((first, second) => first.date.localeCompare(second.date));

    const readingCount = sumRows(readings, 'reading_count');
    return {
      period: {
        from: filters.from.slice(0, 10),
        to: filters.to.slice(0, 10),
      },
      filters: {
        regionId: filters.regionId ?? null,
        equipmentType: filters.equipmentType ?? null,
      },
      empty: readingCount === 0
        && activeAlerts === 0
        && workOrderRows.length === 0,
      cards: {
        activeEquipments: activeEquipment.length,
        activeAlerts,
        alertsBySeverity,
        pendingWorkOrders: workOrderRows.length,
        pendingWorkOrdersByStatus: pendingByStatus,
        totalConsumptionKwh: sumRows(
          readings,
          'measured_consumption_kwh'
        ),
      },
      consumptionByRegion,
      consumptionTrend,
      recentAlerts,
      pendingWorkOrders,
    };
  }

  return { get };
}

module.exports = { createDashboardService };
