// Lista e abertura de ordens de serviço (RF09, RF10, CT09, CT10)
import { api } from '../api.js';
import { h, anomalyLabel, equipmentTypeLabel, formatDateTime } from '../dom.js';
import { getUser } from '../session.js';
import { navigate } from '../router.js';
import {
  alertBox, clearFieldErrors, dataTable, field, pageHeader,
  showApiError, statusBadge, toast, withBusy,
} from '../ui.js';

export const ORIGIN_LABELS = {
  alerta: 'Alerta',
  cidadao: 'Ocorrência cidadã',
  manual: 'Manual',
};

const STATUS_FILTER = ['Aberta', 'Atribuída', 'Em atendimento', 'Concluída'];

export async function ordensServicoView(container) {
  const user = getUser();
  const isManager = user.role === 'Gestor';
  const formArea = h('div');
  const listArea = h('div');
  let technicians = [];

  const statusFilter = h('select', { dataset: { cy: 'filtro-status-os' } },
    h('option', { value: '' }, 'Todos'),
    STATUS_FILTER.map((status) => h('option', { value: status }, status)));
  statusFilter.addEventListener('change', load);

  container.append(
    pageHeader(
      isManager ? 'Ordens de serviço' : 'Minhas ordens de serviço',
      isManager ? 'Abertura, atribuição e acompanhamento das OS.' : 'OS atribuídas a você.'
    ),
    isManager
      ? h('div', { class: 'toolbar' },
        h('button', { type: 'button', class: 'button', dataset: { cy: 'nova-os' }, onClick: openForm }, 'Nova OS'))
      : null,
    formArea,
    h('div', { class: 'filters card' }, field({ label: 'Estado', name: 'statusFiltro', control: statusFilter })),
    listArea
  );

  if (isManager) {
    technicians = await api.get('/users');
  }

  function technicianName(id) {
    if (id === null) return '—';
    if (id === user.id) return 'Você';
    return technicians.find((t) => t.id === id)?.name ?? `Técnico #${id}`;
  }

  async function load() {
    const workOrders = await api.get('/work-orders', { status: statusFilter.value });
    listArea.replaceChildren(dataTable({
      cy: 'tabela-os',
      rows: workOrders,
      emptyMessage: 'Nenhuma ordem de serviço encontrada.',
      columns: [
        { label: 'Código', render: (os) => h('a', { href: `#/os/${os.id}`, dataset: { cy: 'link-os' } }, os.code) },
        { label: 'Origem', render: (os) => ORIGIN_LABELS[os.origin] ?? os.origin },
        { label: 'Local', render: (os) => os.location },
        { label: 'Responsável', render: (os) => technicianName(os.assignedTechnicianId) },
        { label: 'Estado', render: (os) => statusBadge(os.status) },
        { label: 'Atualizada em', render: (os) => formatDateTime(os.updatedAt) },
      ],
    }));
  }

  async function openForm() {
    const feedback = h('div', { 'aria-live': 'assertive' });
    const originFields = h('div', { class: 'form' });
    const origin = h('select', { dataset: { cy: 'origem-os' } },
      Object.entries(ORIGIN_LABELS).map(([value, label]) => h('option', { value }, label)));
    const submit = h('button', { type: 'submit', class: 'button', dataset: { cy: 'salvar' } }, 'Abrir OS');

    const [alerts, occurrences, regions, equipments] = await Promise.all([
      api.get('/alerts', { status: 'Ativo' }).then((result) => result.alerts),
      api.get('/occurrences', { status: 'Aberta' }),
      api.get('/regions'),
      api.get('/equipments'),
    ]);

    const select = (name, items, placeholder) => field({
      label: placeholder.label,
      name,
      control: h('select', {},
        h('option', { value: '' }, placeholder.text),
        items.map((item) => h('option', { value: item.value }, item.label))),
    });

    function renderOriginFields() {
      if (origin.value === 'alerta') {
        originFields.replaceChildren(select('alertId', alerts.map((a) => ({
          value: a.id,
          label: `${a.severity} · ${anomalyLabel(a.anomalyType)} · Equipamento #${a.equipmentId}`,
        })), { label: 'Alerta ativo', text: alerts.length ? 'Selecione…' : 'Nenhum alerta ativo' }));
      } else if (origin.value === 'cidadao') {
        originFields.replaceChildren(select('occurrenceId', occurrences.map((o) => ({
          value: o.id,
          label: `${o.protocol} · ${o.type}`,
        })), { label: 'Ocorrência aberta', text: occurrences.length ? 'Selecione…' : 'Nenhuma ocorrência aberta' }));
      } else {
        const regionField = select('regionId', regions.filter((r) => r.status === 'Ativo')
          .map((r) => ({ value: r.id, label: r.name })), { label: 'Região', text: 'Selecione…' });
        const equipmentField = select('equipmentId', [], { label: 'Equipamento (opcional)', text: 'Nenhum' });
        regionField.querySelector('select').addEventListener('change', (event) => {
          const equipmentSelect = equipmentField.querySelector('select');
          equipmentSelect.replaceChildren(
            h('option', { value: '' }, 'Nenhum'),
            equipments.filter((e) => String(e.regionId) === event.target.value)
              .map((e) => h('option', { value: e.id }, `${equipmentTypeLabel(e.type)} — ${e.location}`))
          );
        });
        originFields.replaceChildren(
          h('div', { class: 'form-grid' }, regionField, equipmentField),
          field({ label: 'Local', name: 'location', control: h('input', { type: 'text' }) })
        );
      }
    }

    origin.addEventListener('change', renderOriginFields);
    renderOriginFields();

    const form = h('form', { class: 'card form', novalidate: true, dataset: { cy: 'form-os' } },
      h('h2', {}, 'Nova ordem de serviço'),
      feedback,
      field({ label: 'Origem', name: 'origin', control: origin }),
      originFields,
      field({
        label: 'Descrição',
        name: 'description',
        hint: 'Opcional para alerta e ocorrência (usa a descrição de origem).',
        control: h('textarea', { rows: '3' }),
      }),
      h('div', { class: 'form-actions' },
        h('button', { type: 'button', class: 'button button-secondary', onClick: () => formArea.replaceChildren() }, 'Cancelar'),
        submit)
    );

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      feedback.replaceChildren();
      clearFieldErrors(form);

      const body = { origin: origin.value };
      const description = form.elements.description.value.trim();
      if (description) body.description = description;
      if (origin.value === 'alerta') {
        body.alertId = Number(form.elements.alertId.value) || undefined;
      } else if (origin.value === 'cidadao') {
        body.occurrenceId = Number(form.elements.occurrenceId.value) || undefined;
      } else {
        body.regionId = Number(form.elements.regionId.value) || undefined;
        body.equipmentId = Number(form.elements.equipmentId.value) || null;
        body.location = form.elements.location.value.trim();
      }

      try {
        const created = await withBusy(submit, () => api.post('/work-orders', body));
        toast(`OS ${created.code} aberta.`, 'success');
        navigate(`/os/${created.id}`);
      } catch (error) {
        showApiError(form, feedback, error);
      }
    });

    formArea.replaceChildren(form);
    origin.focus();
  }

  try {
    await load();
  } catch (error) {
    listArea.replaceChildren(alertBox(error.message, 'error'));
  }
}
