/**
 * Cadastro de equipamentos pelo Gestor
 * (RF04, RN02, RN03, RF17, RNF09, RNF19, CT03, CT18, CT19).
 */
import { api } from '../api.js';
import { h, equipmentTypeLabel, formatKwh } from '../dom.js';
import {
  clearFieldErrors, dataTable, field, pageHeader, showApiError,
  statusBadge, toast, withBusy,
} from '../ui.js';
import { numberFromInput, statusActions } from './cadastroAcoes.js';

const EQUIPMENT_TYPES = ['poste', 'predio_municipal'];
const STATUSES = ['Ativo', 'Bloqueado', 'Inativo'];

function select(options, { placeholder, value } = {}) {
  return h('select', {},
    placeholder ? h('option', { value: '' }, placeholder) : null,
    options.map((option) => h('option', {
      value: option.value,
      selected: String(option.value) === String(value ?? ''),
    }, option.label))
  );
}

function equipmentName(equipment) {
  return `${equipmentTypeLabel(equipment.type)} — ${equipment.location}`;
}

export async function equipamentosView(container) {
  const formArea = h('div');
  const listArea = h('div', { 'aria-live': 'polite' });
  let regions = [];
  let equipments = [];

  const filterRegion = select([], { placeholder: 'Todas as regiões' });
  const filterType = select(
    EQUIPMENT_TYPES.map((type) => ({ value: type, label: equipmentTypeLabel(type) })),
    { placeholder: 'Todos os tipos' }
  );
  const filterStatus = select(
    STATUSES.map((status) => ({ value: status, label: status })),
    { placeholder: 'Todos os estados' }
  );
  for (const [control, cy] of [[filterRegion, 'filtro-regiao'], [filterType, 'filtro-tipo'], [filterStatus, 'filtro-status']]) {
    control.dataset.cy = cy;
    control.addEventListener('change', renderList);
  }

  const filters = h('div', { class: 'filters card' },
    field({ label: 'Região', name: 'filtroRegiao', control: filterRegion }),
    field({ label: 'Tipo', name: 'filtroTipo', control: filterType }),
    field({ label: 'Estado', name: 'filtroStatus', control: filterStatus })
  );

  container.append(
    pageHeader('Equipamentos', 'Postes e prédios municipais monitorados. O consumo esperado é informado em kWh.'),
    h('div', { class: 'toolbar' },
      h('button', {
        type: 'button',
        class: 'button',
        dataset: { cy: 'novo-equipamento' },
        onClick: () => openForm(null),
      }, 'Novo equipamento')
    ),
    formArea,
    filters,
    listArea
  );

  async function load() {
    [regions, equipments] = await Promise.all([api.get('/regions'), api.get('/equipments')]);
    const selected = filterRegion.value;
    filterRegion.replaceChildren(
      h('option', { value: '' }, 'Todas as regiões'),
      regions.map((region) => h('option', {
        value: region.id,
        selected: String(region.id) === selected,
      }, region.name))
    );
    renderList();
  }

  function renderList() {
    const rows = equipments.filter((equipment) => (
      (!filterRegion.value || String(equipment.regionId) === filterRegion.value)
      && (!filterType.value || equipment.type === filterType.value)
      && (!filterStatus.value || equipment.status === filterStatus.value)
    ));

    listArea.replaceChildren(
      h('p', { class: 'muted', dataset: { cy: 'total-equipamentos' } },
        `${rows.length} de ${equipments.length} equipamento(s).`),
      dataTable({
        cy: 'tabela-equipamentos',
        rows,
        emptyMessage: 'Nenhum equipamento encontrado para os filtros selecionados.',
        columns: [
          { label: 'Tipo', render: (equipment) => equipmentTypeLabel(equipment.type) },
          { label: 'Localização', render: (equipment) => equipment.location },
          { label: 'Região', render: (equipment) => equipment.regionName },
          { label: 'Consumo esperado', render: (equipment) => formatKwh(equipment.expectedConsumptionKwh) },
          { label: 'Estado', render: (equipment) => statusBadge(equipment.status) },
          {
            label: 'Ações',
            render: (equipment) => statusActions({
              kind: 'equipment',
              item: equipment,
              name: equipmentName(equipment),
              onEdit: openForm,
              onChanged: load,
            }),
          },
        ],
      })
    );
  }

  function openForm(equipment) {
    const editing = equipment !== null;
    const feedback = h('div', { 'aria-live': 'assertive' });
    // Somente regiões ativas recebem equipamentos (RN04).
    const regionOptions = regions
      .filter((region) => region.status === 'Ativo' || region.id === equipment?.regionId)
      .map((region) => ({ value: region.id, label: region.name }));

    const regionSelect = select(regionOptions, { placeholder: 'Selecione…', value: equipment?.regionId });
    const latitude = h('input', { type: 'text', inputmode: 'decimal', value: equipment?.latitude ?? '' });
    const longitude = h('input', { type: 'text', inputmode: 'decimal', value: equipment?.longitude ?? '' });

    // Conveniência: sugere as coordenadas da região quando ainda não há valor.
    regionSelect.addEventListener('change', () => {
      const region = regions.find((item) => String(item.id) === regionSelect.value);
      if (region && latitude.value.trim() === '' && longitude.value.trim() === '') {
        latitude.value = region.latitude;
        longitude.value = region.longitude;
      }
    });

    const submit = h('button', { type: 'submit', class: 'button', dataset: { cy: 'salvar' } },
      editing ? 'Salvar alterações' : 'Cadastrar equipamento');

    const form = h('form', { class: 'card form', novalidate: true, dataset: { cy: 'form-equipamento' } },
      h('h2', {}, editing ? `Editar: ${equipmentName(equipment)}` : 'Novo equipamento'),
      feedback,
      h('div', { class: 'form-grid' },
        field({ label: 'Região', name: 'regionId', control: regionSelect }),
        field({
          label: 'Tipo',
          name: 'type',
          control: select(
            EQUIPMENT_TYPES.map((type) => ({ value: type, label: equipmentTypeLabel(type) })),
            { placeholder: 'Selecione…', value: equipment?.type }
          ),
        })
      ),
      field({
        label: 'Localização',
        name: 'location',
        hint: 'Endereço ou ponto de referência, de 3 a 200 caracteres.',
        control: h('input', { type: 'text', maxlength: '200', value: equipment?.location ?? '' }),
      }),
      field({
        label: 'Consumo esperado (kWh)',
        name: 'expectedConsumptionKwh',
        hint: 'Deve ser maior que zero.',
        control: h('input', {
          type: 'text',
          inputmode: 'decimal',
          value: equipment?.expectedConsumptionKwh ?? '',
          dataset: { cy: 'consumo-input' },
        }),
      }),
      h('div', { class: 'form-grid' },
        field({ label: 'Latitude', name: 'latitude', hint: 'Entre -90 e 90.', control: latitude }),
        field({ label: 'Longitude', name: 'longitude', hint: 'Entre -180 e 180.', control: longitude })
      ),
      h('div', { class: 'form-actions' },
        h('button', {
          type: 'button',
          class: 'button button-secondary',
          onClick: () => formArea.replaceChildren(),
        }, 'Cancelar'),
        submit
      )
    );

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      feedback.replaceChildren();
      clearFieldErrors(form);

      const regionValue = form.elements.regionId.value;
      const body = {
        regionId: regionValue === '' ? undefined : Number(regionValue),
        type: form.elements.type.value || undefined,
        location: form.elements.location.value.trim(),
        expectedConsumptionKwh: numberFromInput(form.elements.expectedConsumptionKwh),
        latitude: numberFromInput(latitude),
        longitude: numberFromInput(longitude),
      };

      try {
        await withBusy(submit, () => (editing
          ? api.patch(`/equipments/${equipment.id}`, body)
          : api.post('/equipments', body)));
        toast(editing ? 'Equipamento atualizado.' : 'Equipamento cadastrado.', 'success');
        formArea.replaceChildren();
        await load();
      } catch (error) {
        showApiError(form, feedback, error);
      }
    });

    formArea.replaceChildren(form);
    regionSelect.focus();
  }

  await load();
}
