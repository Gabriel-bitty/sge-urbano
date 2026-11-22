/**
 * Roteador por hash (#/caminho?parametros). Cada rota declara os perfis
 * que podem acessá-la; o controle real de acesso é feito pela API (RF02,
 * RNF05) e aqui serve apenas para não exibir telas indevidas.
 */
import { h } from './dom.js';
import { getUser } from './session.js';
import { pageHeader, alertBox } from './ui.js';

const routes = [];
const listeners = [];
let renderCount = 0;

/**
 * @param {Array<{ path: string, title: string, view: Function,
 *   roles?: string[], guestOnly?: boolean }>} list
 */
export function addRoutes(list) {
  routes.push(...list);
}

export function onRouteChange(listener) {
  listeners.push(listener);
}

export function navigate(target) {
  const hash = target.startsWith('#') ? target : `#${target}`;
  if (window.location.hash === hash) {
    render();
  } else {
    window.location.hash = hash;
  }
}

export function currentPath() {
  return parseLocation().path;
}

function parseLocation() {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  const [path, queryString = ''] = raw.split('?');
  return { path: path || '/', query: new URLSearchParams(queryString) };
}

function matchRoute(path) {
  for (const route of routes) {
    const names = [];
    const pattern = new RegExp(`^${route.path.replace(/:(\w+)/g, (_, name) => {
      names.push(name);
      return '([^/]+)';
    })}$`);
    const result = pattern.exec(path);
    if (result) {
      const params = Object.fromEntries(
        names.map((name, index) => [name, decodeURIComponent(result[index + 1])])
      );
      return { route, params };
    }
  }
  return null;
}

function simplePage(title, message) {
  return (container) => {
    container.append(
      pageHeader(title),
      h('p', {}, message),
      h('p', {}, h('a', { href: '#/' }, 'Voltar ao início'))
    );
  };
}

const notFoundView = simplePage('Página não encontrada', 'O endereço informado não existe.');
const forbiddenView = simplePage(
  'Acesso negado',
  'Seu perfil não tem permissão para acessar esta funcionalidade.'
);

export async function render() {
  const renderId = ++renderCount;
  const { path, query } = parseLocation();
  const container = document.getElementById('conteudo');
  const user = getUser();
  const match = matchRoute(path);

  let view = notFoundView;
  let title = 'Página não encontrada';

  if (match) {
    const { route } = match;
    if (route.roles && !user) {
      navigate(`/login?proxima=${encodeURIComponent(path)}`);
      return;
    }
    if (route.guestOnly && user) {
      navigate('/painel');
      return;
    }
    if (route.roles && !route.roles.includes(user.role)) {
      view = forbiddenView;
      title = 'Acesso negado';
    } else {
      view = route.view;
      title = route.title;
    }
  }

  document.title = `${title} · SGE-Urbano`;
  container.replaceChildren();
  listeners.forEach((listener) => listener(path));

  try {
    await view(container, { params: match?.params ?? {}, query });
  } catch (error) {
    if (renderId === renderCount && error?.code !== 'AUTHENTICATION_REQUIRED') {
      container.append(alertBox(error.message || 'Erro ao carregar a tela.', 'error'));
    }
  }

  if (renderId === renderCount) {
    container.querySelector('h1')?.focus({ preventScroll: true });
  }
}

export function startRouter() {
  window.addEventListener('hashchange', render);
  return render();
}
