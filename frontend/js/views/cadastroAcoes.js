/**
 * Ações de estado comuns a regiões e equipamentos:
 * inativação (RF03, RN04, RN20) e bloqueio/desbloqueio (RF17, RN16, RN17, RN27).
 */
import { api } from '../api.js';
import { h } from '../dom.js';
import { confirmDialog, toast } from '../ui.js';

const BLOCK_REASON_MIN_LENGTH = 10;

const TEXTS = Object.freeze({
  region: {
    path: '/regions',
    noun: 'região',
    inactivateWarning:
      'Todos os equipamentos ativos desta região também serão inativados. '
      + 'Os dados históricos continuam disponíveis. Esta ação não pode ser desfeita.',
    blockWarning:
      'Os equipamentos ativos desta região também serão bloqueados: não receberão '
      + 'novas leituras e os alertas ativos ficarão suspensos. OS em andamento são preservadas.',
    unblockWarning:
      'A região e os equipamentos bloqueados junto com ela voltarão ao estado anterior, '
      + 'e os alertas suspensos voltarão a ficar ativos.',
  },
  equipment: {
    path: '/equipments',
    noun: 'equipamento',
    inactivateWarning:
      'O equipamento deixará de receber leituras. Os dados históricos continuam '
      + 'disponíveis. Esta ação não pode ser desfeita.',
    blockWarning:
      'O equipamento não receberá novas leituras e os alertas ativos ficarão '
      + 'suspensos. OS em andamento são preservadas.',
    unblockWarning:
      'O equipamento voltará ao estado anterior e os alertas suspensos voltarão a ficar ativos.',
  },
});

/**
 * Botões disponíveis conforme o estado atual:
 * Ativo → Editar, Bloquear, Inativar; Bloqueado → Desbloquear; Inativo → nenhum.
 */
export function statusActions({ kind, item, name, onEdit, onChanged }) {
  const texts = TEXTS[kind];
  const buttons = [];

  const button = (label, cy, handler, extraClass = '') => h('button', {
    type: 'button',
    class: `button button-small button-secondary ${extraClass}`.trim(),
    dataset: { cy },
    'aria-label': `${label} ${texts.noun} ${name}`,
    onClick: handler,
  }, label);

  if (item.status === 'Ativo') {
    buttons.push(button('Editar', 'editar', () => onEdit(item)));

    buttons.push(button('Bloquear', 'bloquear', () => confirmDialog({
      title: `Bloquear ${texts.noun}`,
      message: `${name}. ${texts.blockWarning}`,
      confirmLabel: 'Bloquear',
      danger: true,
      reason: { label: 'Motivo do bloqueio', minLength: BLOCK_REASON_MIN_LENGTH },
      onConfirm: async (reason) => {
        await api.post(`${texts.path}/${item.id}/block`, { reason });
        toast(`${capitalize(texts.noun)} bloqueado(a).`, 'success');
        await onChanged();
      },
    })));

    buttons.push(button('Inativar', 'inativar', () => confirmDialog({
      title: `Inativar ${texts.noun}`,
      message: `${name}. ${texts.inactivateWarning}`,
      confirmLabel: 'Inativar',
      danger: true,
      onConfirm: async () => {
        await api.patch(`${texts.path}/${item.id}`, { status: 'Inativo' });
        toast(`${capitalize(texts.noun)} inativado(a).`, 'success');
        await onChanged();
      },
    }), 'button-danger-text'));
  }

  if (item.status === 'Bloqueado') {
    buttons.push(button('Desbloquear', 'desbloquear', () => confirmDialog({
      title: `Desbloquear ${texts.noun}`,
      message: `${name}. ${texts.unblockWarning}`,
      confirmLabel: 'Desbloquear',
      onConfirm: async () => {
        await api.post(`${texts.path}/${item.id}/unblock`);
        toast(`${capitalize(texts.noun)} desbloqueado(a).`, 'success');
        await onChanged();
      },
    })));
  }

  return buttons.length > 0
    ? h('div', { class: 'row-actions' }, buttons)
    : h('span', { class: 'muted' }, 'Sem ações');
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Converte o texto de um campo numérico; vazio vira undefined (campo ausente). */
export function numberFromInput(input) {
  const text = input.value.trim().replace(',', '.');
  return text === '' ? undefined : Number(text);
}
