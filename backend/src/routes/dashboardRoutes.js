/** Rota protegida de dashboard agregado (RF14, RNF11, CA14.1–CA14.3, CT15). */
const { Router } = require('express');

function toAlertSummary(alert) {
  return {
    id: alert.id,
    equipmentId: alert.equipment_id,
    regionId: alert.region_id,
    anomalyType: alert.anomaly_type,
    severity: alert.severity,
    status: alert.status,
    measuredConsumptionKwh: alert.measured_consumption_kwh,
    updatedAt: alert.updated_at,
  };
}

function toWorkOrderSummary(workOrder) {
  return {
    id: workOrder.id,
    code: workOrder.code,
    origin: workOrder.origin,
    regionId: workOrder.region_id,
    equipmentId: workOrder.equipment_id,
    status: workOrder.status,
    assignedTechnicianId: workOrder.assigned_technician_id,
    updatedAt: workOrder.updated_at,
  };
}

function createDashboardRouter({
  dashboardService,
  authenticate,
  requireRole,
}) {
  const router = Router();
  const managerOnly = [authenticate, requireRole('Gestor')];

  router.get('/', ...managerOnly, (req, res) => {
    const dashboard = dashboardService.get(req.query);
    return res.status(200).json({
      ...dashboard,
      recentAlerts: dashboard.recentAlerts.map(toAlertSummary),
      pendingWorkOrders: dashboard.pendingWorkOrders.map(
        toWorkOrderSummary
      ),
    });
  });

  return router;
}

module.exports = { createDashboardRouter };
