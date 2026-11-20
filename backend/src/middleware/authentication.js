/** Valida sessão server-side e audita acessos sem autenticação (RNF05, RNF06, RNF16, CT01). */
const { SESSION_COOKIE_NAME } = require('../services/sqliteSessionStore');

function createAuthenticationMiddleware({ userRepository, auditService }) {
  if (!userRepository || !auditService) {
    throw new TypeError('Repositório de usuários e serviço de auditoria são obrigatórios.');
  }

  return function authenticate(req, res, next) {
    try {
      const userId = req.session && req.session.userId;

      if (!Number.isSafeInteger(userId) || userId < 1) {
        auditService.record({
          actorIdentity: 'visitante',
          action: 'auth.access.denied',
          targetType: 'route',
          targetId: `${req.method} ${req.path}`,
          reason: 'autenticacao_necessaria',
        });
        return res.status(401).json({
          error: 'AUTHENTICATION_REQUIRED',
          message: 'É necessário autenticar-se para acessar este recurso.',
        });
      }

      const user = userRepository.findById(userId);

      if (!user || user.status !== 'Ativo') {
        auditService.record({
          actorIdentity: `session-user:${userId}`,
          action: 'auth.access.denied',
          targetType: 'route',
          targetId: `${req.method} ${req.path}`,
          reason: 'usuario_inativo_ou_inexistente',
        });

        return req.session.destroy((error) => {
          if (error) {
            return next(error);
          }

          res.clearCookie(SESSION_COOKIE_NAME);
          return res.status(401).json({
            error: 'AUTHENTICATION_REQUIRED',
            message: 'A sessão não é válida ou expirou.',
          });
        });
      }

      req.user = {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        status: user.status,
      };
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = { createAuthenticationMiddleware };
