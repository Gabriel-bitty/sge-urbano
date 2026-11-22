/** Ponto de entrada do front-end do SGE-Urbano. */
import { onUnauthorized } from './api.js';
import { clearSession, restoreSession } from './session.js';
import { addRoutes, navigate, onRouteChange, startRouter } from './router.js';
import { renderNavigation } from './navigation.js';
import { homeView } from './views/home.js';
import { loginView } from './views/login.js';
import { painelView } from './views/painel.js';
import { regioesView } from './views/regioes.js';
import { equipamentosView } from './views/equipamentos.js';
import { simulacaoView } from './views/simulacao.js';
import { alertasView } from './views/alertas.js';
import { ordensServicoView } from './views/ordensServico.js';
import { ordemServicoDetalheView } from './views/ordemServicoDetalhe.js';
import { consultarOcorrenciaView, registrarOcorrenciaView } from './views/ocorrencias.js';
import { dashboardView } from './views/dashboard.js';
import { relatoriosView } from './views/relatorios.js';
import { mapaView } from './views/mapa.js';

const BOTH_PROFILES = ['Gestor', 'Técnico'];
const MANAGER_ONLY = ['Gestor'];

addRoutes([
  { path: '/', title: 'Início', view: homeView },
  { path: '/login', title: 'Entrar', view: loginView, guestOnly: true },
  { path: '/ocorrencia/nova', title: 'Registrar ocorrência', view: registrarOcorrenciaView },
  { path: '/ocorrencia/consulta', title: 'Consultar ocorrência', view: consultarOcorrenciaView },
  { path: '/painel', title: 'Painel', view: painelView, roles: BOTH_PROFILES },
  { path: '/dashboard', title: 'Dashboard', view: dashboardView, roles: MANAGER_ONLY },
  { path: '/relatorios', title: 'Relatórios', view: relatoriosView, roles: MANAGER_ONLY },
  { path: '/regioes', title: 'Regiões', view: regioesView, roles: MANAGER_ONLY },
  { path: '/equipamentos', title: 'Equipamentos', view: equipamentosView, roles: MANAGER_ONLY },
  { path: '/simulacao', title: 'Simulação', view: simulacaoView, roles: MANAGER_ONLY },
  { path: '/alertas', title: 'Alertas', view: alertasView, roles: MANAGER_ONLY },
  { path: '/os', title: 'Ordens de serviço', view: ordensServicoView, roles: BOTH_PROFILES },
  { path: '/os/:id', title: 'Ordem de serviço', view: ordemServicoDetalheView, roles: BOTH_PROFILES },
  { path: '/mapa', title: 'Mapa', view: mapaView, roles: BOTH_PROFILES },
]);

// Sessão expirada ou encerrada no servidor: volta ao login (RNF06, CT01).
onUnauthorized(() => {
  clearSession();
  navigate('/login?expirada=1');
});

onRouteChange(renderNavigation);

await restoreSession();
await startRouter();
