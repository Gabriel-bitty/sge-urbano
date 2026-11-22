/** Tela inicial pública. */
import { h } from '../dom.js';
import { getUser } from '../session.js';

export function homeView(container) {
  const user = getUser();

  container.append(
    h('section', { class: 'hero' },
      h('h1', { tabindex: '-1' }, 'SGE-Urbano'),
      h('p', { class: 'hero-lead' },
        'Sistema de Gestão Energética Urbana: acompanhamento do consumo de ',
        'equipamentos públicos, alertas de anomalia e ordens de serviço.'
      ),
      h('div', { class: 'hero-actions' },
        user
          ? h('a', { class: 'button', href: '#/painel' }, 'Ir para o painel')
          : h('a', { class: 'button', href: '#/login', dataset: { cy: 'ir-login' } },
            'Entrar como Gestor ou Técnico')
      )
    )
  );
}
