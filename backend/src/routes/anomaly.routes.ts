import { Router } from "express";
import {
  getAnomalyAlerts,
  getAnomalyStatistics,
  resolveAnomalyAlert,
  unresolveAnomalyAlert,
  deleteAnomalyAlert,
  bulkResolveAnomalyAlerts,
  getAnomalyTrends
} from "../controllers/anomaly.controller";
import { verifyJWT } from "../middleware/auth.middleware";

const router: Router = Router();

// All routes require authentication
router.use(verifyJWT);

// Get anomaly alerts with filtering and pagination
router.route("/alerts")
  .get(getAnomalyAlerts);    // GET /api/v1/anomaly/alerts

// Get anomaly statistics
router.route("/statistics")
  .get(getAnomalyStatistics); // GET /api/v1/anomaly/statistics

// Get anomaly trends for analytics
router.route("/trends")
  .get(getAnomalyTrends);     // GET /api/v1/anomaly/trends

// Manage specific anomaly alerts
router.route("/alerts/:alertId/resolve")
  .patch(resolveAnomalyAlert);   // PATCH /api/v1/anomaly/alerts/:alertId/resolve

router.route("/alerts/:alertId/unresolve")
  .patch(unresolveAnomalyAlert); // PATCH /api/v1/anomaly/alerts/:alertId/unresolve

router.route("/alerts/:alertId")
  .delete(deleteAnomalyAlert);   // DELETE /api/v1/anomaly/alerts/:alertId

// Bulk operations
router.route("/alerts/bulk/resolve")
  .patch(bulkResolveAnomalyAlerts); // PATCH /api/v1/anomaly/alerts/bulk/resolve

export default router;