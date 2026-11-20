/** Rota de reset/seed exclusiva de NODE_ENV=test (RNF20, CT26). */
const { Router } = require('express');
const { seedDatabase } = require('../db/seed');
const { ValidationError } = require('../services/domainErrors');

function createTestSupportRouter({ database }) {
  if (!database || typeof database.prepare !== 'function') {
    throw new TypeError('Uma conexão SQLite válida é obrigatória para o reset.');
  }
  const router = Router();

  router.post('/reset', (req, res) => {
    if (Object.keys(req.body || {}).length > 0) {
      throw new ValidationError({ body: 'Esta operação não recebe campos.' });
    }

    return res.status(200).json(seedDatabase(database));
  });

  return router;
}

module.exports = { createTestSupportRouter };
