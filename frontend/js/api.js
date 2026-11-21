/**
 * Cliente da API REST (/api). Centraliza envio de JSON, leitura de erros
 * no formato do backend e o tratamento de sessão expirada (RF01, RNF06).
 */

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.message || 'Não foi possível concluir a operação.');
    this.name = 'ApiError';
    this.status = status;
    this.code = body?.error ?? 'UNKNOWN_ERROR';
    this.fields = body?.fields ?? {};
  }
}

let unauthorizedHandler = () => {};

/** Define o que fazer quando a API responde que a sessão não existe mais. */
export function onUnauthorized(handler) {
  unauthorizedHandler = handler;
}

function buildUrl(path, query) {
  const url = new URL(`/api${path}`, window.location.origin);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  }
  return url;
}

export async function request(method, path, { body, query, silent = false } = {}) {
  const init = {
    method,
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  };
  if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(buildUrl(path, query), init);
  } catch {
    throw new ApiError(0, {
      error: 'NETWORK_ERROR',
      message: 'Não foi possível conectar ao servidor. Verifique sua conexão.',
    });
  }

  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new ApiError(response.status, data);
    if (error.code === 'AUTHENTICATION_REQUIRED' && !silent) {
      unauthorizedHandler(error);
    }
    throw error;
  }

  return data;
}

export const api = {
  get: (path, query, options) => request('GET', path, { ...options, query }),
  post: (path, body, options) => request('POST', path, { ...options, body }),
  patch: (path, body, options) => request('PATCH', path, { ...options, body }),
};
