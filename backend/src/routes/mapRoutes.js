/** Rota autenticada de dados geográficos autorizados (RF15, RN29, CA15.1–CA15.3, CT21). */
const { Router } = require('express');

function createMapRouter({ mapService, authenticate }) {
  const router = Router();

  router.get('/', authenticate, (req, res) => (
    res.status(200).json(mapService.list(req.user))
  ));

  return router;
}

module.exports = { createMapRouter };
