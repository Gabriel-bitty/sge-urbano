const { Router } = require('express');

/**
 * Roteador central da API REST do SGE-Urbano.
 * Mantém apenas a composição das rotas por domínio, sem SQL ou regra de negócio (RNF18).
 */
const router = Router();

module.exports = router;
