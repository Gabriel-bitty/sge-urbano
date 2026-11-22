// Dashboard do Gestor (RF14, RNF11, CT15)
import { api } from '../api.js';
import { h, anomalyLabel, equipmentTypeLabel, formatDate, formatDateTime, formatNumber } from '../dom.js';
import { columns, horizontalBars } from '../charts.js';
import { alertBox, dataTable, emptyState, field, pageHeader, statusBadge } from '../ui.js';

function card(title, value, detail, cy) {
  return h('div', { class: 'stat-card', dataset: { cy } },
    h('p', { class: 'stat-title' }, title),
    h('p', { class: 'stat-value' }, value),
    detail ? h('p', { class: 'stat-detail' }, detail) : null);
}

export async function dashboardView(container) {
  const content = h('div', { 'aria-live': 'polite' });
  const regions = await api.get('/regions');
  const regionName = (id) => regions.find((r) => r.id === id)?.name ?? `Região #${id}`;

  const from = h('input', { type: 'date', dataset: { cy: 'filtro-de' } });
  const to = h('input', { type: 'date', dataset: { cy: 'filtro-ate' } });
  const region = h('select', { dataset: { cy: 'filtro-regiao' } },
    h('option', { value: '' }, 'Todas'),
    regions.map((r) => h('option', { value: r.id }, r.name)));
  const type = h('select', { dataset: { cy: 'filtro-tipo' } },
    h('option', { value: '' }, 'Todos'),
    ['poste', 'predio_municipal'].map((t) => h('option', { value: t }, equipmentTypeLabel(t))));

  const filters = h('form', { class: 'filters card', novalidate: true },
    field({ label: 'De', name: 'from', control: from }),
    field({ label: 'Até', name: 'to', control: to }),
    field({ label: 'Região', name: 'regionId', control: region }),
    field({ label: 'Tipo de equipamento', name: 'equipmentType', control: type }),
    h('div', { class: 'filters-submit' }, h('button', { type: 'submit', class: 'button', dataset: { cy: 'aplicar-filtros' } }, 'Aplicar')));
  filters.addEventListener('submit', (event) => {
    event.preventDefault();
    load();
  });

  container.append(pageHeader('Dashboard', 'Visão geral do consumo simulado, alertas e ordens de serviço.'), filters, content);

  async function load() {
    const started = performance.now();
    let data;
    try {
      data = await api.get('/dashboard', {
        from: from.value, to: to.value, regionId: region.value, equipmentType: type.value,
      });
    } catch (error) {
      content.replaceChildren(alertBox(error.fields?.to ?? error.message, 'error'));
      return;
    }

    from.value = data.period.from;
    to.value = data.period.to;
    const periodText = h('p', { class: 'muted', dataset: { cy: 'periodo' } },
      `Período: ${formatDate(data.period.from)} a ${formatDate(data.period.to)}`);

    if (data.empty) {
      content.replaceChildren(periodText, emptyState('Ainda não há leituras, alertas ou ordens de serviço neste período. Gere um lote na tela de Simulação.'));
      return;
    }

    const { cards } = data;
    content.replaceChildren(
      periodText,
      h('div', { class: 'stat-grid' },
        card('Equipamentos ativos', formatNumber(cards.activeEquipments), null, 'card-equipamentos'),
        card('Consumo total', formatNumber(cards.totalConsumptionKwh), null, 'card-consumo'),
        card('Alertas ativos', formatNumber(cards.activeAlerts),
          `Alta: ${cards.alertsBySeverity.Alta} · Média: ${cards.alertsBySeverity['Média']} · Baixa: ${cards.alertsBySeverity.Baixa}`, 'card-alertas'),
        card('OS pendentes', formatNumber(cards.pendingWorkOrders),
          Object.entries(cards.pendingWorkOrdersByStatus).map(([s, n]) => `${s}: ${n}`).join(' · '), 'card-os')),
      h('div', { class: 'chart-grid' },
        h('section', { class: 'card' },
          h('h2', {}, 'Consumo por região'),
          h('p', { class: 'chart-legend' },
            h('span', { class: 'legend-measured' }, 'Medido'), h('span', { class: 'legend-expected' }, 'Esperado')),
          horizontalBars(data.consumptionByRegion.map((r) => ({
            label: regionName(r.regionId), measured: r.measuredConsumptionKwh, expected: r.expectedConsumptionKwh,
          })), { label: 'Consumo medido e esperado por região' })),
        h('section', { class: 'card' },
          h('h2', {}, 'Tendência diária'),
          columns(data.consumptionTrend.map((p) => ({ date: p.date, value: p.measuredConsumptionKwh })),
            { label: 'Consumo medido por dia' }))),
      h('section', {},
        h('h2', {}, 'Alertas recentes'),
        dataTable({
          cy: 'tabela-alertas-recentes',
          rows: data.recentAlerts,
          emptyMessage: 'Nenhum alerta no período.',
          columns: [
            { label: 'Severidade', render: (a) => statusBadge(a.severity) },
            { label: 'Anomalia', render: (a) => anomalyLabel(a.anomalyType) },
            { label: 'Região', render: (a) => regionName(a.regionId) },
            { label: 'Situação', render: (a) => statusBadge(a.status) },
            { label: 'Atualizado em', render: (a) => formatDateTime(a.updatedAt) },
          ],
        })),
      h('section', {},
        h('h2', {}, 'OS pendentes'),
        dataTable({
          cy: 'tabela-os-pendentes',
          rows: data.pendingWorkOrders,
          emptyMessage: 'Nenhuma OS pendente.',
          columns: [
            { label: 'Código', render: (os) => h('a', { href: `#/os/${os.id}` }, os.code) },
            { label: 'Região', render: (os) => regionName(os.regionId) },
            { label: 'Estado', render: (os) => statusBadge(os.status) },
            { label: 'Atualizada em', render: (os) => formatDateTime(os.updatedAt) },
          ],
        })),
      h('p', { class: 'muted small', dataset: { cy: 'tempo-carga' } },
        `Carregado em ${Math.round(performance.now() - started)} ms.`)
    );
  }

  await load();
}
