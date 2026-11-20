/** Aplica perfis no servidor e registra acessos negados (RF02, RN01, RNF05, RNF16). */
function createAuthorizationMiddleware(auditService) {
  if (!auditService || typeof auditService.record !== 'function') {
    throw new TypeError('Um serviço de auditoria válido é obrigatório.');
  }

  return function requireRole(...allowedRoles) {
    if (allowedRoles.length === 0) {
      throw new TypeError('Informe ao menos um perfil autorizado.');
    }

    return function authorize(req, res, next) {
      try {
        if (allowedRoles.includes(req.user.role)) {
          return next();
        }

        auditService.record({
          actorUserId: req.user.id,
          actorRole: req.user.role,
          action: 'auth.access.denied',
          targetType: 'route',
          targetId: `${req.method} ${req.path}`,
          reason: 'perfil_insuficiente',
        });

        return res.status(403).json({
          error: 'FORBIDDEN',
          message: 'Seu perfil não tem permissão para este recurso.',
        });
      } catch (error) {
        return next(error);
      }
    };
  };
}

module.exports = { createAuthorizationMiddleware };
