/** Ponto de entrada do front-end do SGE-Urbano. */
import { onUnauthorized } from './api.js';
import { clearSession, restoreSession } from './session.js';
import { addRoutes, navigate, onRouteChange, startRouter } from './router.js';
import { renderNavigation } from './navigation.js';
import { homeView } from './views/home.js';
import { loginView } from './views/login.js';
import { painelView } from './views/painel.js';

const BOTH_PROFILES = ['Gestor', 'Técnico'];

addRoutes([
  { path: '/', title: 'Início', view: homeView },
  { path: '/login', title: 'Entrar', view: loginView, guestOnly: true },
  { path: '/painel', title: 'Painel', view: painelView, roles: BOTH_PROFILES },
]);

// Sessão expirada ou encerrada no servidor: volta ao login (RNF06, CT01).
onUnauthorized(() => {
  clearSession();
  navigate('/login?expirada=1');
});

onRouteChange(renderNavigation);

await restoreSession();
await startRouter();
