// Registro e consulta pública de ocorrências pelo cidadão (RF12, RF13, CT13, CT14)
import { api } from '../api.js';
import { h } from '../dom.js';
import {
  alertBox, clearFieldErrors, field, pageHeader, showApiError, statusBadge, withBusy,
} from '../ui.js';

const OCCURRENCE_TYPES = [
  'poste apagado',
  'oscilação de energia',
  'falta de energia',
  'prédio público com consumo anormal',
  'iluminação acesa durante o dia',
];

export async function registrarOcorrenciaView(container) {
  const feedback = h('div', { 'aria-live': 'assertive' });
  const result = h('div', { 'aria-live': 'polite' });
  const regions = await api.get('/regions/public');

  const submit = h('button', { type: 'submit', class: 'button', dataset: { cy: 'enviar-ocorrencia' } }, 'Enviar ocorrência');

  const form = h('form', { class: 'card form', novalidate: true, dataset: { cy: 'form-ocorrencia' } },
    feedback,
    h('h2', {}, 'Seus dados'),
    h('p', { class: 'muted' }, 'Usados apenas pela equipe de gestão para contato. Não aparecem na consulta pública.'),
    field({ label: 'Nome', name: 'citizenName', control: h('input', { type: 'text', autocomplete: 'name' }) }),
    h('div', { class: 'form-grid' },
      field({ label: 'E-mail', name: 'citizenEmail', control: h('input', { type: 'email', autocomplete: 'email' }) }),
      field({ label: 'Telefone', name: 'citizenPhone', control: h('input', { type: 'tel', autocomplete: 'tel' }) }),
      field({
        label: 'CPF (opcional)',
        name: 'citizenCpfSimulated',
        hint: 'Informe telefone ou CPF.',
        control: h('input', { type: 'text', inputmode: 'numeric' }),
      })
    ),
    h('h2', {}, 'Problema'),
    h('div', { class: 'form-grid' },
      field({
        label: 'Tipo de problema',
        name: 'type',
        control: h('select', {},
          h('option', { value: '' }, 'Selecione…'),
          OCCURRENCE_TYPES.map((type) => h('option', { value: type }, type))),
      }),
      field({
        label: 'Região',
        name: 'regionId',
        control: h('select', {},
          h('option', { value: '' }, 'Selecione…'),
          regions.map((region) => h('option', { value: region.id }, region.name))),
      })
    ),
    field({ label: 'Endereço ou ponto de referência', name: 'addressReference', control: h('input', { type: 'text' }) }),
    field({ label: 'Descrição', name: 'description', control: h('textarea', { rows: '4' }) }),
    h('div', { class: 'form-actions' }, submit)
  );

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    feedback.replaceChildren();
    clearFieldErrors(form);

    const value = (name) => form.elements[name].value.trim();
    const body = {
      citizenName: value('citizenName'),
      citizenEmail: value('citizenEmail'),
      citizenPhone: value('citizenPhone') || null,
      citizenCpfSimulated: value('citizenCpfSimulated') || null,
      type: value('type'),
      description: value('description'),
      regionId: Number(value('regionId')) || null,
      addressReference: value('addressReference'),
    };

    try {
      const occurrence = await withBusy(submit, () => api.post('/occurrences', body));
      result.replaceChildren(
        h('section', { class: 'card protocol-card', dataset: { cy: 'protocolo-gerado' } },
          h('h2', {}, 'Ocorrência registrada'),
          h('p', {}, 'Guarde o número do protocolo para acompanhar o andamento:'),
          h('p', { class: 'protocol', dataset: { cy: 'protocolo' } }, occurrence.protocol),
          h('p', {}, 'Situação: ', statusBadge(occurrence.status)),
          h('a', { href: `#/ocorrencia/consulta?protocolo=${encodeURIComponent(occurrence.protocol)}` }, 'Consultar este protocolo')
        )
      );
      result.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      showApiError(form, feedback, error);
    }
  });

  container.append(
    pageHeader('Registrar ocorrência', 'Informe um problema na iluminação ou no consumo de energia de equipamentos públicos. Não é necessário login.'),
    result,
    form
  );
}

export function consultarOcorrenciaView(container, { query }) {
  const result = h('div', { 'aria-live': 'polite' });
  const protocolInput = h('input', {
    type: 'text',
    placeholder: 'PROTOCOLO-AAAAMMDD-XXXX',
    value: query.get('protocolo') ?? '',
    dataset: { cy: 'protocolo-input' },
  });
  const submit = h('button', { type: 'submit', class: 'button', dataset: { cy: 'consultar' } }, 'Consultar');

  const form = h('form', { class: 'card form narrow', novalidate: true },
    field({ label: 'Número do protocolo', name: 'protocol', control: protocolInput }),
    submit
  );

  async function search() {
    const protocol = protocolInput.value.trim();
    clearFieldErrors(form);
    result.replaceChildren();
    if (!protocol) {
      showApiError(form, result, { fields: { protocol: 'Informe o número do protocolo.' } });
      return;
    }

    try {
      const occurrence = await withBusy(submit, () => api.get(`/occurrences/${encodeURIComponent(protocol)}`));
      result.replaceChildren(
        h('section', { class: 'card', dataset: { cy: 'resultado-consulta' } },
          h('h2', {}, 'Situação da ocorrência'),
          h('dl', { class: 'details' },
            h('dt', {}, 'Tipo do problema'), h('dd', {}, occurrence.type),
            h('dt', {}, 'Situação'), h('dd', {}, statusBadge(occurrence.status)))
        )
      );
    } catch (error) {
      result.replaceChildren(alertBox(
        error.status === 404 ? 'Nenhuma ocorrência encontrada para este protocolo.' : error.message,
        'warning'
      ));
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    search();
  });

  container.append(
    pageHeader('Consultar ocorrência', 'Acompanhe a situação da sua ocorrência pelo número do protocolo.'),
    form,
    result
  );

  if (protocolInput.value) {
    search();
  }
}
