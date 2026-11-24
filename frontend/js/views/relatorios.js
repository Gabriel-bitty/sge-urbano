// Relatório de consumo com exportação CSV (RF16, CT16)
import { api } from '../api.js';
import { h, equipmentTypeLabel, formatDate, formatKwh, formatNumber } from '../dom.js';
import {
  clearFieldErrors, dataTable, field, pageHeader, showApiError, withBusy,
} from '../ui.js';

function today() {
  return new Date().toISOString().slice(0, 10);
}

function firstDayOfMonth() {
  return `${today().slice(0, 8)}01`;
}

function formatPeriod(period, granularity) {
  return granularity === 'month' ? `${period.slice(5, 7)}/${period.slice(0, 4)}` : formatDate(period);
}

export function relatoriosView(container) {
  const feedback = h('div', { 'aria-live': 'assertive' });
  const result = h('div', { 'aria-live': 'polite' });

  const select = (options, cy) => h('select', { dataset: { cy } },
    options.map(([value, label]) => h('option', { value }, label)));

  const submit = h('button', { type: 'submit', class: 'button', dataset: { cy: 'gerar-relatorio' } }, 'Gerar relatório');
  const exportLink = h('a', { class: 'button button-secondary', dataset: { cy: 'exportar-csv' } }, 'Exportar CSV');

  const form = h('form', { class: 'card form', novalidate: true },
    feedback,
    h('div', { class: 'form-grid' },
      field({ label: 'Data inicial', name: 'from', control: h('input', { type: 'date', value: firstDayOfMonth(), dataset: { cy: 'data-inicial' } }) }),
      field({ label: 'Data final', name: 'to', control: h('input', { type: 'date', value: today(), dataset: { cy: 'data-final' } }) }),
      field({ label: 'Agrupar por', name: 'groupBy', control: select([['region', 'Região'], ['equipmentType', 'Tipo de equipamento']], 'agrupar') }),
      field({ label: 'Granularidade', name: 'granularity', control: select([['day', 'Diária'], ['month', 'Mensal']], 'granularidade') })),
    h('div', { class: 'form-actions' }, submit)
  );

  function currentQuery() {
    return {
      from: form.elements.from.value,
      to: form.elements.to.value,
      groupBy: form.elements.groupBy.value,
      granularity: form.elements.granularity.value,
    };
  }

  exportLink.addEventListener('click', () => {
    exportLink.href = `/api/reports.csv?${new URLSearchParams(currentQuery())}`;
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    feedback.replaceChildren();
    clearFieldErrors(form);
    const query = currentQuery();

    try {
      const report = await withBusy(submit, () => api.get('/reports', query));
      const groupLabel = (row) => (report.groupBy === 'equipmentType' ? equipmentTypeLabel(row.groupLabel) : row.groupLabel);

      result.replaceChildren(
        h('div', { class: 'toolbar' },
          h('p', { class: 'muted' }, `Período: ${formatDate(report.period.from)} a ${formatDate(report.period.to)}`),
          exportLink),
        dataTable({
          cy: 'tabela-relatorio',
          rows: report.rows,
          emptyMessage: 'Nenhuma leitura no período selecionado.',
          columns: [
            { label: report.groupBy === 'region' ? 'Região' : 'Tipo', render: groupLabel },
            { label: 'Período', render: (row) => formatPeriod(row.period, report.granularity) },
            { label: 'Leituras', render: (row) => formatNumber(row.readingCount) },
            { label: 'Consumo medido', render: (row) => formatKwh(row.measuredConsumptionKwh) },
            { label: 'Consumo esperado', render: (row) => formatKwh(row.expectedConsumptionKwh) },
          ],
        }),
        h('section', { class: 'card totals', dataset: { cy: 'totais' } },
          h('h2', {}, 'Totais'),
          h('dl', { class: 'details' },
            h('dt', {}, 'Leituras'), h('dd', {}, formatNumber(report.totals.readingCount)),
            h('dt', {}, 'Consumo medido'), h('dd', {}, formatKwh(report.totals.measuredConsumptionKwh)),
            h('dt', {}, 'Consumo esperado'), h('dd', {}, formatKwh(report.totals.expectedConsumptionKwh))))
      );
    } catch (error) {
      result.replaceChildren();
      showApiError(form, feedback, error);
    }
  });

  container.append(
    pageHeader('Relatórios de consumo', 'Consumo simulado agregado por região ou tipo de equipamento.'),
    form,
    result
  );
}
