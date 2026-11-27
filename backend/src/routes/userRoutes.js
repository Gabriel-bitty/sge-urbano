/** Consulta de técnicos ativos para atribuição de OS (RF10, RN11, UC08, CT10). */
const { Router } = require('express');

function createUserRouter({
  userService,
  authenticate,
  requireRole,
}) {
  const router = Router();
  const managerOnly = [authenticate, requireRole('Gestor')];

  router.get('/', ...managerOnly, (req, res) => {
    return res.status(200).json(userService.list(req.query));
  });

  return router;
}

module.exports = { createUserRouter };
