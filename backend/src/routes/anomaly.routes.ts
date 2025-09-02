import { Router } from "express";
import {
  getAnomalousTransactions,
  getAnomalyStats,
  resetCategoryStats,
  resetAllStats,
  nuclearResetUserData,
  getDetectorDebugInfo,
} from "../controllers/anomaly.controller";
import { verifyJWT } from "../middleware/auth.middleware";

const router: Router = Router();

// All routes require authentication
router.use(verifyJWT);

// Analytics and reports
router.route("/transactions")
  .get(getAnomalousTransactions);     // GET /api/v1/anomaly/transactions - Get anomalous transactions

router.route("/stats")
  .get(getAnomalyStats);              // GET /api/v1/anomaly/stats - Get anomaly statistics

// Management operations
router.route("/reset/category")
  .post(resetCategoryStats);          // POST /api/v1/anomaly/reset/category - Reset specific category stats

router.route("/reset/all")
  .post(resetAllStats);               // POST /api/v1/anomaly/reset/all - Reset all stats for transaction type

router.route("/reset/nuclear")
  .post(nuclearResetUserData);        // POST /api/v1/anomaly/reset/nuclear - Nuclear reset all user data

router.route("/debug")
  .get(getDetectorDebugInfo);         // GET /api/v1/anomaly/debug - Get detector debug info

export default router;