const { Router } = require('express');

function createReportRouter({
  reportService,
  authenticate,
  requireRole,
}) {
  const router = Router();
  const managerOnly = [authenticate, requireRole('Gestor')];

  router.get('/reports', ...managerOnly, (req, res) => (
    res.status(200).json(reportService.get(req.query))
  ));

  router.get('/reports.csv', ...managerOnly, (req, res) => {
    const report = reportService.get(req.query);
    const filename = `consumption-${report.period.from}-${report.period.to}.csv`;
    res.type('text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(reportService.toCsv(report));
  });

  return router;
}

module.exports = { createReportRouter };
