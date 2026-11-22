// Geração de leituras simuladas em lote (RF05, CT04, CT24)
import { api } from '../api.js';
import { h, anomalyLabel, formatDateTime, formatKwh } from '../dom.js';
import { alertBox, dataTable, field, pageHeader, statusBadge } from '../ui.js';

const SCENARIOS = [
  { value: 'normal', label: 'Normal (consumo esperado)' },
  { value: 'pico', label: 'Pico (1,5 × consumo esperado)' },
  { value: 'falha', label: 'Falha (consumo zero)' },
];

export function simulacaoView(container) {
  const resultArea = h('div');

  const scenario = h('select', { dataset: { cy: 'cenario' } },
    SCENARIOS.map((item) => h('option', { value: item.value }, item.label)));

  const button = h('button', { type: 'submit', class: 'button', dataset: { cy: 'gerar-leituras' } }, 'Gerar leituras');

  const form = h('form', { class: 'card form narrow' },
    field({ label: 'Cenário de simulação', name: 'scenario', control: scenario }),
    h('p', { class: 'muted' }, 'Gera uma leitura para cada equipamento ativo. Equipamentos inativos ou bloqueados não recebem leituras.'),
    button
  );

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const batch = await api.post('/simulations', { scenario: scenario.value });
      showResult(batch);
    } catch (error) {
      resultArea.replaceChildren(alertBox(error.message, 'error'));
    }
  });

  function showResult(batch) {
    resultArea.replaceChildren(
      alertBox(`Lote gerado: ${batch.readingCount} leitura(s) e ${batch.alertCount} alerta(s) processado(s).`, 'success'),
      h('h2', {}, 'Leituras geradas'),
      dataTable({
        cy: 'tabela-leituras',
        rows: batch.readings,
        emptyMessage: 'Nenhum equipamento ativo para gerar leituras.',
        columns: [
          { label: 'Equipamento', render: (r) => `#${r.equipmentId}` },
          { label: 'Medido', render: (r) => formatKwh(r.measuredConsumptionKwh) },
          { label: 'Esperado', render: (r) => formatKwh(r.expectedConsumptionKwh) },
          { label: 'Anomalia', render: (r) => (r.isAnomaly ? anomalyLabel(r.anomalyType) : 'Não') },
          { label: 'Severidade', render: (r) => (r.severity ? statusBadge(r.severity) : '—') },
          { label: 'Origem', render: (r) => r.origin },
          { label: 'Data/hora', render: (r) => formatDateTime(r.recordedAt) },
        ],
      })
    );
  }

  container.append(
    pageHeader('Simulação de consumo', 'Os valores gerados aqui são simulados e não vêm de medidores reais.'),
    form,
    resultArea
  );
}
