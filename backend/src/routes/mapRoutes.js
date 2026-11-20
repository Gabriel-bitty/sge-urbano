const { Router } = require('express');

function createMapRouter({ mapService, authenticate }) {
  const router = Router();

  router.get('/', authenticate, (req, res) => (
    res.status(200).json(mapService.list(req.user))
  ));

  return router;
}

module.exports = { createMapRouter };
