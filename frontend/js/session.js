/**
 * Estado da sessão no navegador (RF01, RF02).
 *
 * O cookie de sessão é HttpOnly e não pode ser lido pelo JavaScript.
 * Guardamos apenas um indicador em localStorage para evitar consultar
 * /api/auth/session a cada visita pública, o que geraria eventos de
 * auditoria de "acesso negado" para visitantes sem login.
 */
import { api } from './api.js';

const SESSION_HINT_KEY = 'sge.sessaoAtiva';

let currentUser = null;

function setHint(active) {
  try {
    if (active) {
      window.localStorage.setItem(SESSION_HINT_KEY, '1');
    } else {
      window.localStorage.removeItem(SESSION_HINT_KEY);
    }
  } catch {
    // Armazenamento indisponível (modo privado): seguimos sem o indicador.
  }
}

function hasHint() {
  try {
    return window.localStorage.getItem(SESSION_HINT_KEY) === '1';
  } catch {
    return true;
  }
}

export function getUser() {
  return currentUser;
}

export function hasRole(...roles) {
  return currentUser !== null && roles.includes(currentUser.role);
}

/** Recupera a sessão existente, se houver, sem disparar o aviso de expiração. */
export async function restoreSession() {
  if (!hasHint()) {
    return null;
  }
  try {
    const { user } = await api.get('/auth/session', undefined, { silent: true });
    currentUser = user;
  } catch {
    clearSession();
  }
  return currentUser;
}

export async function login(username, password) {
  const { user } = await api.post('/auth/login', { username, password });
  currentUser = user;
  setHint(true);
  return user;
}

export async function logout() {
  try {
    await api.post('/auth/logout', undefined, { silent: true });
  } finally {
    clearSession();
  }
}

export function clearSession() {
  currentUser = null;
  setHint(false);
}
