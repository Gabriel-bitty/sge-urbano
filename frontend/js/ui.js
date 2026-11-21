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

  for (const [name, message] of Object.entries(fields)) {
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
