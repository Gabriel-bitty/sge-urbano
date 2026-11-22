// Detalhe e transições de estado da OS (RF10, RF11, RF18, CT10, CT11, CT12)
import { api } from '../api.js';
import { h, formatDateTime } from '../dom.js';
import { getUser } from '../session.js';
import { confirmDialog, pageHeader, showApiError, statusBadge, toast, withBusy } from '../ui.js';
import { ORIGIN_LABELS } from './ordensServico.js';

function info(label, value) {
  return [h('dt', {}, label), h('dd', {}, value ?? '—')];
}

export async function ordemServicoDetalheView(container, { params }) {
  const user = getUser();
  const isManager = user.role === 'Gestor';
  const technicians = isManager ? await api.get('/users') : [];

  async function render() {
    const os = await api.get(`/work-orders/${params.id}`);
    const isAssignedToMe = os.assignedTechnicianId === user.id;
    const technician = os.assignedTechnicianId === null
      ? 'Não atribuída'
      : isAssignedToMe ? `${user.name} (você)` : technicians.find((t) => t.id === os.assignedTechnicianId)?.name;

    container.replaceChildren(
      pageHeader(`OS ${os.code}`, ORIGIN_LABELS[os.origin]),
      h('p', {}, h('a', { href: '#/os' }, '← Voltar para a lista')),
      h('section', { class: 'card' },
        h('div', { class: 'detail-status' }, 'Estado: ', statusBadge(os.status)),
        h('dl', { class: 'details' },
          info('Local', os.location),
          info('Descrição', os.description),
          info('Região', `Região #${os.regionId}`),
          info('Equipamento', os.equipmentId ? `Equipamento #${os.equipmentId}` : null),
          info('Responsável', technician),
          os.alertId ? info('Alerta vinculado', `Alerta #${os.alertId}`) : null,
          os.solutionDescription ? info('Solução aplicada', os.solutionDescription) : null,
          os.cancellationReason ? info('Motivo do cancelamento', os.cancellationReason) : null,
          info('Criada em', os.createdAt),
          info('Atualizada em', formatDateTime(os.updatedAt))
        )
      ),
      ...[os.occurrence ? occurrenceCard(os.occurrence) : null, actions(os, isAssignedToMe)].filter(Boolean)
    );
  }

  function occurrenceCard(occurrence) {
    return h('section', { class: 'card', dataset: { cy: 'dados-cidadao' } },
      h('h2', {}, 'Ocorrência do cidadão'),
      h('dl', { class: 'details' },
        info('Protocolo', occurrence.protocol),
        info('Tipo', occurrence.type),
        info('Nome', occurrence.citizenName),
        info('E-mail', occurrence.citizenEmail),
        info('Telefone', occurrence.citizenPhone)
      )
    );
  }

  function actions(os, isAssignedToMe) {
    const buttons = [];
    const feedback = h('div', { 'aria-live': 'assertive' });

    if (isManager && ['Aberta', 'Atribuída'].includes(os.status)) {
      const technicianSelect = h('select', { name: 'technicianId', dataset: { cy: 'tecnico-select' } },
        h('option', { value: '' }, 'Selecione o técnico…'),
        technicians.filter((t) => t.id !== os.assignedTechnicianId)
          .map((t) => h('option', { value: t.id }, t.name)));
      const isReassign = os.status === 'Atribuída';
      const assignButton = h('button', { type: 'submit', class: 'button', dataset: { cy: 'atribuir' } },
        isReassign ? 'Reatribuir' : 'Atribuir');
      const form = h('form', { class: 'inline-form' },
        h('div', { class: 'field', dataset: { field: 'technicianId' } },
          h('label', {}, isReassign ? 'Novo técnico' : 'Técnico'), technicianSelect,
          h('p', { class: 'field-error' })),
        assignButton);
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        try {
          await withBusy(assignButton, () => api.post(
            `/work-orders/${os.id}/${isReassign ? 'reassign' : 'assign'}`,
            { technicianId: Number(technicianSelect.value) || undefined }
          ));
          toast(isReassign ? 'OS reatribuída.' : 'OS atribuída.', 'success');
          await render();
        } catch (error) {
          showApiError(form, feedback, error);
        }
      });
      buttons.push(form);

      buttons.push(h('button', {
        type: 'button',
        class: 'button button-danger-text button-secondary',
        dataset: { cy: 'cancelar-os' },
        onClick: () => confirmDialog({
          title: `Cancelar OS ${os.code}`,
          message: 'O alerta vinculado, se houver, continuará ativo.',
          confirmLabel: 'Cancelar OS',
          danger: true,
          reason: { label: 'Justificativa', minLength: 1 },
          onConfirm: async (reason) => {
            await api.post(`/work-orders/${os.id}/cancel`, { reason });
            toast('OS cancelada.', 'success');
            await render();
          },
        }),
      }, 'Cancelar OS'));
    }

    if (!isManager && isAssignedToMe && os.status === 'Atribuída') {
      buttons.push(h('button', {
        type: 'button',
        class: 'button',
        dataset: { cy: 'iniciar' },
        onClick: async (event) => {
          try {
            await withBusy(event.currentTarget, () => api.post(`/work-orders/${os.id}/start`));
            toast('Atendimento iniciado.', 'success');
            await render();
          } catch (error) {
            toast(error.message, 'error');
          }
        },
      }, 'Iniciar atendimento'));
    }

    if (os.status === 'Em atendimento' && (isManager || isAssignedToMe)) {
      buttons.push(h('button', {
        type: 'button',
        class: 'button',
        dataset: { cy: 'concluir' },
        onClick: () => confirmDialog({
          title: `Concluir OS ${os.code}`,
          message: 'O alerta vinculado, se houver, será marcado como Resolvido.',
          confirmLabel: 'Concluir',
          reason: { label: 'Solução aplicada', minLength: 1 },
          onConfirm: async (solution) => {
            await api.post(`/work-orders/${os.id}/complete`, { solution });
            toast('OS concluída.', 'success');
            await render();
          },
        }),
      }, 'Concluir OS'));
    }

    if (buttons.length === 0) {
      return null;
    }
    return h('section', { class: 'card' }, h('h2', {}, 'Ações'), feedback, h('div', { class: 'actions-bar' }, buttons));
  }

  await render();
}
