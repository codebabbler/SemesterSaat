import { Router } from "express";
import {
  getDashboardData,
  getFinancialSummary,
  getCashFlowAnalysis,
} from "../controllers/dashboard.controller";
import { verifyJWT } from "../middleware/auth.middleware";

const router: Router = Router();

// All routes require authentication
router.use(verifyJWT);

// Dashboard overview
router.route("/")
  .get(getDashboardData);    // GET /api/v1/dashboard - Get complete dashboard data

// Financial analysis
router.route("/summary")
  .get(getFinancialSummary); // GET /api/v1/dashboard/summary - Get financial summary for date range

router.route("/cashflow")
  .get(getCashFlowAnalysis); // GET /api/v1/dashboard/cashflow - Get cash flow analysis (daily/weekly/monthly/yearly)

export default router;