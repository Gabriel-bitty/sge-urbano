/** Página inicial após o login, com o resumo do perfil (RF02). */
import { h } from '../dom.js';
import { getUser } from '../session.js';
import { pageHeader } from '../ui.js';

const ROLE_DESCRIPTIONS = Object.freeze({
  Gestor: 'Gestão de regiões, equipamentos, simulação, alertas, ordens de serviço, dashboard e relatórios.',
  Técnico: 'Consulta e atendimento das ordens de serviço atribuídas a você e mapa das OS.',
});

export function painelView(container) {
  const user = getUser();

  container.append(
    pageHeader(`Olá, ${user.name}`, 'Bem-vindo ao SGE-Urbano.'),
    h('section', { class: 'card', dataset: { cy: 'perfil' } },
      h('h2', {}, `Perfil: ${user.role}`),
      h('p', {}, ROLE_DESCRIPTIONS[user.role] ?? ''),
      h('p', { class: 'muted' }, 'A sessão é encerrada após 30 minutos sem atividade.')
    )
  );
}
