import { Router } from "express";
import {
  previewAnomaly,
  rollbackTransaction,
  getAnomalousTransactions,
  getAnomalyStats,
  resetCategoryStats,
  resetAllStats,
  nuclearResetUserData,
  getDetectorDebugInfo,
} from "../controllers/anomaly.controller";
import { verifyJWT } from "../middleware/auth.middleware";

const router: Router = Router();

router.use(verifyJWT);

router.route("/preview")
  .post(previewAnomaly);

router.route("/rollback/:transactionId")
  .post(rollbackTransaction);

router.route("/transactions")
  .get(getAnomalousTransactions);

router.route("/stats")
  .get(getAnomalyStats);

router.route("/reset/category")
  .post(resetCategoryStats);

router.route("/reset/all")
  .post(resetAllStats);

router.route("/reset/nuclear")
  .post(nuclearResetUserData);

router.route("/debug")
  .get(getDetectorDebugInfo);

export default router;