/**
 * Componentes de interface reutilizados pelas telas: mensagens,
 * erros por campo (RNF09) e estados de carregamento/vazio.
 */
import { h } from './dom.js';

export function toast(message, type = 'info') {
  const area = document.querySelector('.toast-area');
  const item = h('div', { class: `toast toast-${type}`, role: type === 'error' ? 'alert' : 'status' }, message);
  area.append(item);
  setTimeout(() => item.remove(), 6000);
}

export function alertBox(message, type = 'info') {
  return h('div', {
    class: `alert alert-${type}`,
    role: type === 'error' ? 'alert' : 'status',
  }, message);
}

/** Campo de formulário com rótulo, dica e espaço para mensagem de erro. */
export function field({ label, name, hint, control }) {
  const id = control.id || `campo-${name}`;
  control.id = id;
  control.name = name;
  const errorId = `${id}-erro`;
  const hintId = hint ? `${id}-dica` : null;
  control.setAttribute('aria-describedby', [hintId, errorId].filter(Boolean).join(' '));

  return h('div', { class: 'field', dataset: { field: name } },
    h('label', { for: id }, label),
    control,
    hint ? h('small', { id: hintId, class: 'field-hint' }, hint) : null,
    h('p', { id: errorId, class: 'field-error', dataset: { cy: `erro-${name}` } })
  );
}

/**
 * Mostra no formulário os erros devolvidos pela API em `fields`,
 * indicando o campo e o motivo (RNF09). Retorna true se algum foi exibido.
 */
export function showFieldErrors(form, fields = {}) {
  clearFieldErrors(form);
  let firstInvalid = null;

  for (const [name, message] of Object.entries(fields ?? {})) {
    const wrapper = form.querySelector(`[data-field="${CSS.escape(name)}"]`);
    if (!wrapper) {
      continue;
    }
    wrapper.querySelector('.field-error').textContent = message;
    const control = wrapper.querySelector('input, select, textarea');
    if (control) {
      control.setAttribute('aria-invalid', 'true');
      firstInvalid ??= control;
    }
  }

  firstInvalid?.focus();
  return firstInvalid !== null;
}

export function clearFieldErrors(form) {
  for (const error of form.querySelectorAll('.field-error')) {
    error.textContent = '';
  }
  for (const control of form.querySelectorAll('[aria-invalid]')) {
    control.removeAttribute('aria-invalid');
  }
}

/** Desabilita o botão de envio enquanto a requisição está em andamento. */
export async function withBusy(button, task) {
  const original = button.textContent;
  button.disabled = true;
  button.textContent = 'Aguarde…';
  try {
    return await task();
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
}

export function pageHeader(title, subtitle) {
  return h('header', { class: 'page-header' },
    h('h1', { tabindex: '-1' }, title),
    subtitle ? h('p', { class: 'page-subtitle' }, subtitle) : null
  );
}

export function emptyState(message) {
  return h('p', { class: 'empty-state', dataset: { cy: 'estado-vazio' } }, message);
}

/** Selo de estado com texto visível (não depende só da cor). */
export function statusBadge(status) {
  const slug = String(status ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '-');
  return h('span', { class: `badge badge-${slug}`, dataset: { cy: 'status' } }, status ?? '—');
}

/**
 * Tabela simples. Cada coluna define o rótulo e como exibir a linha.
 * @param {{ columns: Array<{ label: string, render: Function }>,
 *   rows: object[], emptyMessage: string, cy?: string }} options
 */
export function dataTable({ columns, rows, emptyMessage, cy }) {
  if (rows.length === 0) {
    return emptyState(emptyMessage);
  }

  return h('div', { class: 'table-wrapper' },
    h('table', { class: 'table', dataset: { cy } },
      h('thead', {}, h('tr', {}, columns.map((column) => h('th', { scope: 'col' }, column.label)))),
      h('tbody', {}, rows.map((row) => h('tr', { dataset: { id: row.id } },
        columns.map((column) => h('td', { dataset: { label: column.label } }, column.render(row)))
      )))
    )
  );
}

/**
 * Diálogo de confirmação. Quando `reason` é informado, exige um motivo
 * com tamanho mínimo após remover espaços das pontas (RN16, D-INS-14).
 * `onConfirm` recebe o motivo; se lançar erro, a mensagem é exibida
 * no próprio diálogo e ele continua aberto.
 */
export function confirmDialog({
  title,
  message,
  confirmLabel = 'Confirmar',
  danger = false,
  reason,
  onConfirm,
}) {
  const feedback = h('div', { 'aria-live': 'assertive' });
  const confirmButton = h('button', {
    type: 'submit',
    class: danger ? 'button button-danger' : 'button',
    dataset: { cy: 'confirmar' },
  }, confirmLabel);
  const cancelButton = h('button', {
    type: 'button',
    class: 'button button-secondary',
    dataset: { cy: 'cancelar' },
  }, 'Cancelar');

  let reasonInput = null;
  let counter = null;
  if (reason) {
    reasonInput = h('textarea', { rows: '3', required: true, dataset: { cy: 'motivo-input' } });
    counter = h('small', { class: 'field-hint', 'aria-live': 'polite' });
    const updateCounter = () => {
      const length = reasonInput.value.trim().length;
      counter.textContent = `${length} de no mínimo ${reason.minLength} caracteres.`;
    };
    reasonInput.addEventListener('input', updateCounter);
    updateCounter();
  }

  const form = h('form', { method: 'dialog', class: 'form' },
    h('h2', {}, title),
    message ? h('p', {}, message) : null,
    feedback,
    reasonInput ? field({ label: reason.label, name: 'reason', control: reasonInput }) : null,
    counter,
    h('div', { class: 'dialog-actions' }, cancelButton, confirmButton)
  );
  const dialog = h('dialog', { class: 'dialog', dataset: { cy: 'dialogo' } }, form);

  cancelButton.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => dialog.remove());

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    feedback.replaceChildren();
    clearFieldErrors(form);

    const reasonText = reasonInput ? reasonInput.value.trim() : undefined;
    if (reason && reasonText.length < reason.minLength) {
      showFieldErrors(form, {
        reason: `Informe um motivo com pelo menos ${reason.minLength} caracteres.`,
      });
      return;
    }

    try {
      await withBusy(confirmButton, () => onConfirm(reasonText));
      dialog.close();
    } catch (error) {
      if (!showFieldErrors(form, error.fields)) {
        feedback.replaceChildren(alertBox(error.message, 'error'));
      }
    }
  });

  document.body.append(dialog);
  dialog.showModal();
  (reasonInput ?? confirmButton).focus();
  return dialog;
}

/** Mostra o erro da API nos campos do formulário ou como mensagem geral. */
export function showApiError(form, feedback, error) {
  if (!showFieldErrors(form, error.fields)) {
    feedback.replaceChildren(alertBox(error.message, 'error'));
  }
}
