/** Tela de login para Gestor e Técnico (RF01, CA01.1–CA01.3, CT01). */
import { h } from '../dom.js';
import { login } from '../session.js';
import { navigate } from '../router.js';
import { alertBox, field, pageHeader, showFieldErrors, clearFieldErrors, withBusy } from '../ui.js';

export function loginView(container, { query }) {
  const feedback = h('div', { class: 'form-feedback', 'aria-live': 'assertive' });

  if (query.get('expirada') === '1') {
    feedback.append(alertBox('Sua sessão expirou por inatividade. Entre novamente.', 'warning'));
  }

  const submit = h('button', { type: 'submit', class: 'button', dataset: { cy: 'entrar' } }, 'Entrar');
  const form = h('form', { class: 'card form narrow', novalidate: true },
    field({
      label: 'Usuário',
      name: 'username',
      control: h('input', { type: 'text', autocomplete: 'username', required: true, dataset: { cy: 'usuario-input' } }),
    }),
    field({
      label: 'Senha',
      name: 'password',
      control: h('input', { type: 'password', autocomplete: 'current-password', required: true, dataset: { cy: 'senha-input' } }),
    }),
    submit
  );

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    feedback.replaceChildren();
    clearFieldErrors(form);

    const username = form.elements.username.value.trim();
    const password = form.elements.password.value;
    const missing = {};
    if (!username) missing.username = 'Informe o usuário.';
    if (!password) missing.password = 'Informe a senha.';
    if (showFieldErrors(form, missing)) {
      return;
    }

    try {
      await withBusy(submit, () => login(username, password));
      const next = query.get('proxima');
      navigate(next && next.startsWith('/') ? next : '/painel');
    } catch (error) {
      // Mensagem genérica: não revela se o usuário existe (CT01).
      feedback.replaceChildren(alertBox(error.message, 'error'));
      form.elements.password.value = '';
      form.elements.password.focus();
    }
  });

  container.append(
    pageHeader('Entrar', 'Acesso restrito a Gestores e Técnicos. O Cidadão não precisa de login.'),
    feedback,
    form
  );
}
