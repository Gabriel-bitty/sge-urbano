/** Cadastro de regiões pelo Gestor (RF03, RN04, RN20, RF17, CT02, CT20). */
import { api } from '../api.js';
import { h, formatDateTime, formatNumber } from '../dom.js';
import {
  clearFieldErrors, dataTable, field, pageHeader, showApiError,
  statusBadge, toast, withBusy,
} from '../ui.js';
import { numberFromInput, statusActions } from './cadastroAcoes.js';

export async function regioesView(container) {
  const formArea = h('div');
  const listArea = h('div', { 'aria-live': 'polite' });
  const newButton = h('button', {
    type: 'button',
    class: 'button',
    dataset: { cy: 'nova-regiao' },
    onClick: () => openForm(null),
  }, 'Nova região');

  container.append(
    pageHeader('Regiões', 'Cadastro, edição, inativação e bloqueio das regiões monitoradas.'),
    h('div', { class: 'toolbar' }, newButton),
    formArea,
    listArea
  );

  async function load() {
    const regions = await api.get('/regions');
    listArea.replaceChildren(dataTable({
      cy: 'tabela-regioes',
      rows: regions,
      emptyMessage: 'Nenhuma região cadastrada.',
      columns: [
        { label: 'Nome', render: (region) => region.name },
        {
          label: 'Coordenadas (simuladas)',
          render: (region) => `${formatNumber(region.latitude)}, ${formatNumber(region.longitude)}`,
        },
        { label: 'Estado', render: (region) => statusBadge(region.status) },
        { label: 'Atualizada em', render: (region) => formatDateTime(region.updatedAt) },
        {
          label: 'Ações',
          render: (region) => statusActions({
            kind: 'region',
            item: region,
            name: region.name,
            onEdit: openForm,
            onChanged: load,
          }),
        },
      ],
    }));
  }

  function openForm(region) {
    const editing = region !== null;
    const feedback = h('div', { 'aria-live': 'assertive' });
    const submit = h('button', { type: 'submit', class: 'button', dataset: { cy: 'salvar' } },
      editing ? 'Salvar alterações' : 'Cadastrar região');
    const cancel = h('button', {
      type: 'button',
      class: 'button button-secondary',
      onClick: () => formArea.replaceChildren(),
    }, 'Cancelar');

    const form = h('form', { class: 'card form', novalidate: true, dataset: { cy: 'form-regiao' } },
      h('h2', {}, editing ? `Editar região: ${region.name}` : 'Nova região'),
      feedback,
      field({
        label: 'Nome',
        name: 'name',
        hint: 'Pelo menos 2 caracteres.',
        control: h('input', { type: 'text', required: true, value: region?.name ?? '' }),
      }),
      h('div', { class: 'form-grid' },
        field({
          label: 'Latitude',
          name: 'latitude',
          hint: 'Entre -90 e 90.',
          control: h('input', { type: 'text', inputmode: 'decimal', required: true, value: region?.latitude ?? '' }),
        }),
        field({
          label: 'Longitude',
          name: 'longitude',
          hint: 'Entre -180 e 180.',
          control: h('input', { type: 'text', inputmode: 'decimal', required: true, value: region?.longitude ?? '' }),
        })
      ),
      h('div', { class: 'form-actions' }, cancel, submit)
    );

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      feedback.replaceChildren();
      clearFieldErrors(form);

      const body = {
        name: form.elements.name.value.trim(),
        latitude: numberFromInput(form.elements.latitude),
        longitude: numberFromInput(form.elements.longitude),
      };

      try {
        await withBusy(submit, () => (editing
          ? api.patch(`/regions/${region.id}`, body)
          : api.post('/regions', body)));
        toast(editing ? 'Região atualizada.' : 'Região cadastrada.', 'success');
        formArea.replaceChildren();
        await load();
      } catch (error) {
        showApiError(form, feedback, error);
      }
    });

    formArea.replaceChildren(form);
    form.elements.name.focus();
  }

  await load();
}
