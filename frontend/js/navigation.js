/**
 * Itens do menu por perfil (RF02). "Visitante" representa quem não fez
 * login: o Cidadão usa o sistema sem cadastro.
 */
import { h } from './dom.js';
import { getUser, logout } from './session.js';
import { navigate } from './router.js';
import { toast } from './ui.js';

const MENU = [
  { href: '#/', label: 'Início', roles: ['Visitante'] },
  { href: '#/painel', label: 'Painel', roles: ['Gestor', 'Técnico'] },
  { href: '#/login', label: 'Entrar', roles: ['Visitante'] },
];

export function renderNavigation(currentPath) {
  const nav = document.querySelector('.nav');
  const userBox = document.querySelector('.user-box');
  const user = getUser();
  const role = user?.role ?? 'Visitante';

  const links = MENU
    .filter((item) => item.roles.includes(role))
    .map((item) => {
      const active = item.href === `#${currentPath}`;
      return h('a', {
        href: item.href,
        class: active ? 'active' : null,
        'aria-current': active ? 'page' : null,
      }, item.label);
    });
  nav.replaceChildren(...links);

  if (!user) {
    userBox.replaceChildren();
    return;
  }

  userBox.replaceChildren(
    h('span', { class: 'user-name' }, user.name),
    h('span', { class: `role-badge role-${user.role === 'Gestor' ? 'gestor' : 'tecnico'}` }, user.role),
    h('button', {
      type: 'button',
      class: 'button button-ghost',
      dataset: { cy: 'sair' },
      onClick: async () => {
        await logout().catch(() => {});
        toast('Você saiu do sistema.');
        navigate('/');
      },
    }, 'Sair')
  );
}
