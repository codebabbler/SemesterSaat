import { Router } from "express";
import {
  addIncome,
  getAllIncome,
  getIncomeById,
  updateIncome,
  deleteIncome,
  downloadIncomeExcel,
  getIncomeStats,
} from "../controllers/income.controller";
import { verifyJWT } from "../middleware/auth.middleware";

const router: Router = Router();

// All routes require authentication
router.use(verifyJWT);

// Analytics and reports (must come before /:id routes)
router.route("/stats")
  .get(getIncomeStats);      // GET /api/v1/income/stats - Get income statistics

router.route("/download/excel")
  .get(downloadIncomeExcel); // GET /api/v1/income/download/excel - Download Excel report

// CRUD operations
router.route("/")
  .post(addIncome)           // POST /api/v1/income - Add new income
  .get(getAllIncome);        // GET /api/v1/income - Get all income (with pagination)

router.route("/:id")
  .get(getIncomeById)        // GET /api/v1/income/:id - Get income by ID
  .put(updateIncome)         // PUT /api/v1/income/:id - Update income
  .delete(deleteIncome);     // DELETE /api/v1/income/:id - Delete income

export default router;