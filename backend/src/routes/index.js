const { Router } = require('express');
const { createAuditoriaRepository } = require('../repositories/auditoriaRepository');
const { createAlertaRepository } = require('../repositories/alertaRepository');
const { createEquipamentoRepository } = require('../repositories/equipamentoRepository');
const { createLeituraRepository } = require('../repositories/leituraRepository');
const { createLogRepository } = require('../repositories/logRepository');
const { createOcorrenciaRepository } = require('../repositories/ocorrenciaRepository');
const { createOsRepository } = require('../repositories/osRepository');
const { createParametrosRepository } = require('../repositories/parametrosRepository');
const { createRegiaoRepository } = require('../repositories/regiaoRepository');
const { createUsuarioRepository } = require('../repositories/usuarioRepository');
const { createAuthenticationMiddleware } = require('../middleware/authentication');
const { createAuthorizationMiddleware } = require('../middleware/authorization');
const { createAlertRouter } = require('./alertRoutes');
const { createAuditRouter } = require('./auditRoutes');
const { createAuthRouter } = require('./authRoutes');
const { createBlockingRouter } = require('./blockingRoutes');
const { createDashboardRouter } = require('./dashboardRoutes');
const { createEquipmentRouter } = require('./equipmentRoutes');
const { createMapRouter } = require('./mapRoutes');
const { createOccurrenceRouter } = require('./occurrenceRoutes');
const { createRegionRouter } = require('./regionRoutes');
const { createReportRouter } = require('./reportRoutes');
const { createReadingRouter } = require('./readingRoutes');
const { createSimulationRouter } = require('./simulationRoutes');
const { createUserRouter } = require('./userRoutes');
const { createWorkOrderRouter } = require('./workOrderRoutes');
const { createAlertService } = require('../services/alertService');
const { createAuditService } = require('../services/auditService');
const { createAuthService } = require('../services/authService');
const { createBlockingService } = require('../services/blockingService');
const { createDashboardService } = require('../services/dashboardService');
const { createEquipmentService } = require('../services/equipmentService');
const { createMapService } = require('../services/mapService');
const { createOccurrenceService } = require('../services/occurrenceService');
const { createRegionService } = require('../services/regionService');
const { createReadingService } = require('../services/readingService');
const { createReportService } = require('../services/reportService');
const { createSimulationService } = require('../services/simulationService');
const { createUserService } = require('../services/userService');
const { createWorkOrderService } = require('../services/workOrderService');

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
  const occurrenceRepository = createOcorrenciaRepository(database);
  const workOrderRepository = createOsRepository(database);
  const readingRepository = createLeituraRepository(database);
  const parameterRepository = createParametrosRepository(database);
  const logRepository = createLogRepository();
  const alertService = createAlertService({ alertRepository });
  const readingService = createReadingService({ readingRepository });
  const userService = createUserService({ userRepository });
  const occurrenceService = createOccurrenceService({
    occurrenceRepository,
    regionRepository,
    equipmentRepository,
  });
  const workOrderService = createWorkOrderService({
    database,
    workOrderRepository,
    alertRepository,
    occurrenceRepository,
    regionRepository,
    equipmentRepository,
    userRepository,
    auditService,
  });
  const dashboardService = createDashboardService({
    equipmentRepository,
    readingRepository,
    alertRepository,
    workOrderRepository,
    regionRepository,
  });
  const reportService = createReportService({
    readingRepository,
    regionRepository,
  });
  const mapService = createMapService({
    occurrenceRepository,
    workOrderRepository,
    equipmentRepository,
    regionRepository,
  });

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
      logRepository,
    }),
    authenticate,
    requireRole,
  }));
  router.use('/alerts', createAlertRouter({
    alertService,
    authenticate,
    requireRole,
  }));
  router.use('/readings', createReadingRouter({
    readingService,
    authenticate,
    requireRole,
  }));
  router.use('/audit-logs', createAuditRouter({
    auditService,
    authenticate,
    requireRole,
  }));
  router.use('/users', createUserRouter({
    userService,
    authenticate,
    requireRole,
  }));
  router.use('/dashboard', createDashboardRouter({
    dashboardService,
    authenticate,
    requireRole,
  }));
  router.use('/', createReportRouter({
    reportService,
    authenticate,
    requireRole,
  }));
  router.use('/map', createMapRouter({
    mapService,
    authenticate,
  }));
  router.use('/work-orders', createWorkOrderRouter({
    workOrderService,
    authenticate,
    requireRole,
  }));
  router.use('/occurrences', createOccurrenceRouter({
    occurrenceService,
    authenticate,
    requireRole,
  }));

  return router;
}

module.exports = createRoutes;
