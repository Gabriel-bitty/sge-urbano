// Lista de alertas com filtros (RF07, RF08, CT07, CT08)
import { api } from '../api.js';
import { h, anomalyLabel, equipmentTypeLabel, formatDateTime, formatKwh } from '../dom.js';
import { alertBox, dataTable, field, pageHeader, statusBadge } from '../ui.js';

function options(list, placeholder) {
  return [
    h('option', { value: '' }, placeholder),
    ...list.map((item) => h('option', { value: item.value }, item.label)),
  ];
}

export async function alertasView(container) {
  const listArea = h('div');

  const severity = h('select', { dataset: { cy: 'filtro-severidade' } }, options(
    ['Baixa', 'Média', 'Alta'].map((v) => ({ value: v, label: v })), 'Todas'));
  const region = h('select', { dataset: { cy: 'filtro-regiao' } });
  const type = h('select', { dataset: { cy: 'filtro-tipo' } }, options(
    ['poste', 'predio_municipal'].map((v) => ({ value: v, label: equipmentTypeLabel(v) })), 'Todos'));
  const status = h('select', { dataset: { cy: 'filtro-situacao' } }, options(
    ['Ativo', 'Suspenso', 'Resolvido'].map((v) => ({ value: v, label: v })), 'Todas'));

  const regions = await api.get('/regions');
  region.append(...options(regions.map((r) => ({ value: r.id, label: r.name })), 'Todas'));

  for (const select of [severity, region, type, status]) {
    select.addEventListener('change', load);
  }

  container.append(
    pageHeader('Alertas', 'Anomalias detectadas nas leituras simuladas.'),
    h('div', { class: 'filters card' },
      field({ label: 'Severidade', name: 'severity', control: severity }),
      field({ label: 'Região', name: 'regionId', control: region }),
      field({ label: 'Tipo de equipamento', name: 'equipmentType', control: type }),
      field({ label: 'Situação', name: 'status', control: status })
    ),
    listArea
  );

  async function load() {
    try {
      const { count, alerts } = await api.get('/alerts', {
        severity: severity.value,
        regionId: region.value,
        equipmentType: type.value,
        status: status.value,
      });

      listArea.replaceChildren(
        h('p', { class: 'muted', dataset: { cy: 'total-alertas' } }, `${count} alerta(s).`),
        dataTable({
          cy: 'tabela-alertas',
          rows: alerts,
          emptyMessage: 'Nenhum alerta encontrado.',
          columns: [
            { label: 'Severidade', render: (a) => statusBadge(a.severity) },
            { label: 'Tipo de anomalia', render: (a) => anomalyLabel(a.anomalyType) },
            { label: 'Equipamento', render: (a) => `Equipamento #${a.equipmentId}` },
            { label: 'Medido / esperado', render: (a) => `${formatKwh(a.measuredConsumptionKwh)} / ${formatKwh(a.expectedConsumptionKwh)}` },
            { label: 'Desvio', render: (a) => `${a.deviationPercent}%` },
            { label: 'Ocorrências', render: (a) => a.occurrenceCount },
            { label: 'Situação', render: (a) => statusBadge(a.status) },
            { label: 'Atualizado em', render: (a) => formatDateTime(a.updatedAt) },
          ],
        })
      );
    } catch (error) {
      listArea.replaceChildren(alertBox(error.message, 'error'));
    }
  }

  await load();
}
