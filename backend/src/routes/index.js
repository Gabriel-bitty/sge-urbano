const { Router } = require('express');
const { createAuditoriaRepository } = require('../repositories/auditoriaRepository');
const { createAlertaRepository } = require('../repositories/alertaRepository');
const { createEquipamentoRepository } = require('../repositories/equipamentoRepository');
const { createLeituraRepository } = require('../repositories/leituraRepository');
const { createParametrosRepository } = require('../repositories/parametrosRepository');
const { createRegiaoRepository } = require('../repositories/regiaoRepository');
const { createUsuarioRepository } = require('../repositories/usuarioRepository');
const { createAuthenticationMiddleware } = require('../middleware/authentication');
const { createAuthorizationMiddleware } = require('../middleware/authorization');
const { createAlertRouter } = require('./alertRoutes');
const { createAuthRouter } = require('./authRoutes');
const { createBlockingRouter } = require('./blockingRoutes');
const { createEquipmentRouter } = require('./equipmentRoutes');
const { createRegionRouter } = require('./regionRoutes');
const { createSimulationRouter } = require('./simulationRoutes');
const { createAlertService } = require('../services/alertService');
const { createAuditService } = require('../services/auditService');
const { createAuthService } = require('../services/authService');
const { createBlockingService } = require('../services/blockingService');
const { createEquipmentService } = require('../services/equipmentService');
const { createRegionService } = require('../services/regionService');
const { createSimulationService } = require('../services/simulationService');

/**
 * Compõe os repositórios, serviços e rotas sem executar SQL nesta camada (RNF18).
 */
function createRoutes({ database }) {
  if (!database || typeof database.prepare !== 'function') {
    throw new TypeError('Uma conexão SQLite válida é obrigatória para as rotas.');
  }

  const router = Router();
  const userRepository = createUsuarioRepository(database);
  const auditService = createAuditService(createAuditoriaRepository(database));
  const authService = createAuthService({ userRepository, auditService });
  const authenticate = createAuthenticationMiddleware({
    userRepository,
    auditService,
  });
  const requireRole = createAuthorizationMiddleware(auditService);
  const regionRepository = createRegiaoRepository(database);
  const equipmentRepository = createEquipamentoRepository(database);
  const alertRepository = createAlertaRepository(database);
  const readingRepository = createLeituraRepository(database);
  const parameterRepository = createParametrosRepository(database);
  const alertService = createAlertService({ alertRepository });

  router.use('/auth', createAuthRouter({
    authService,
    auditService,
    authenticate,
  }));
  router.use('/regions', createRegionRouter({
    regionService: createRegionService({
      database,
      regionRepository: createRegiaoRepository(database),
      equipmentRepository: createEquipamentoRepository(database),
      auditService,
    }),
    authenticate,
    requireRole,
  }));
  router.use('/equipments', createEquipmentRouter({
    equipmentService: createEquipmentService({
      database,
      regionRepository,
      equipmentRepository,
    }),
    authenticate,
    requireRole,
  }));
  router.use('/', createBlockingRouter({
    blockingService: createBlockingService({
      database,
      regionRepository,
      equipmentRepository,
      alertRepository,
      auditService,
    }),
    authenticate,
    requireRole,
  }));
  router.use('/simulations', createSimulationRouter({
    simulationService: createSimulationService({
      database,
      regionRepository,
      equipmentRepository,
      readingRepository,
      parameterRepository,
      alertService,
    }),
    authenticate,
    requireRole,
  }));
  router.use('/alerts', createAlertRouter({
    alertService,
    authenticate,
    requireRole,
  }));

  return router;
}

module.exports = createRoutes;
