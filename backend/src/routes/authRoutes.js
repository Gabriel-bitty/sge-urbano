/** Rotas de autenticação e sessão (RF01, RNF05, RNF06, RNF16, CT01). */
const { Router } = require('express');
const { asyncHandler } = require('../middleware/asyncHandler');
const { SESSION_COOKIE_NAME } = require('../services/sqliteSessionStore');

function createAuthRouter({ authService, auditService, authenticate }) {
  const router = Router();

  router.post('/login', asyncHandler(async (req, res, next) => {
    const body = req.body;
    const fields = {};

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      fields.body = 'Deve ser um objeto JSON.';
    } else {
      if (typeof body.username !== 'string' || !body.username.trim()) {
        fields.username = 'Informe o usuário.';
      }
      if (typeof body.password !== 'string' || !body.password) {
        fields.password = 'Informe a senha.';
      }
      for (const key of Object.keys(body)) {
        if (!['username', 'password'].includes(key)) {
          fields[key] = 'Campo não permitido.';
        }
      }
    }

    if (Object.keys(fields).length > 0) {
      const attemptedUsername = (
        body && typeof body.username === 'string'
          ? body.username.trim()
          : ''
      );
      auditService.record({
        actorIdentity: attemptedUsername || 'login:sem-identificador',
        action: 'auth.login.failed',
        targetType: 'user',
        reason: 'dados_de_login_invalidos',
      });

      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Informe usuário e senha válidos.',
        fields,
      });
    }

    const user = await authService.login(body.username, body.password);

    if (!user) {
      return res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: 'Usuário ou senha inválidos.',
      });
    }

    await new Promise((resolve, reject) => {
      req.session.regenerate((error) => error ? reject(error) : resolve());
    });
    req.session.userId = user.id;

    await new Promise((resolve, reject) => {
      req.session.save((error) => error ? reject(error) : resolve());
    });

    try {
      auditService.record({
        actorUserId: user.id,
        actorRole: user.role,
        action: 'auth.login.succeeded',
        targetType: 'user',
        targetId: String(user.id),
      });
    } catch (error) {
      req.session.destroy((destroyError) => {
        if (destroyError) {
          return next(destroyError);
        }
        return next(error);
      });
      return;
    }

    return res.status(200).json({ user });
  }));

  router.post('/logout', authenticate, (req, res, next) => {
    try {
      auditService.record({
        actorUserId: req.user.id,
        actorRole: req.user.role,
        action: 'auth.logout',
        targetType: 'user',
        targetId: String(req.user.id),
      });
    } catch (error) {
      return next(error);
    }

    return req.session.destroy((error) => {
      if (error) {
        return next(error);
      }

      res.clearCookie(SESSION_COOKIE_NAME);
      return res.status(204).end();
    });
  });

  router.get('/session', authenticate, (req, res) => (
    res.status(200).json({ user: req.user })
  ));

  return router;
}

module.exports = { createAuthRouter };
