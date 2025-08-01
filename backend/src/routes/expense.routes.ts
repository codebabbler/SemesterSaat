import { Router } from "express";
import {
  addExpense,
  getAllExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  getExpensesByCategory,
  downloadExpenseExcel,
  getExpenseStats,
  getMonthlyExpenseTrends,
  predictExpenseCategory,
  sendExpenseCategoryFeedback,
} from "../controllers/expense.controller";
import { verifyJWT } from "../middleware/auth.middleware";

const router: Router = Router();

// All routes require authentication
router.use(verifyJWT);

// Analytics and reports (must come before /:id routes)
router.route("/stats")
  .get(getExpenseStats);     // GET /api/v1/expense/stats - Get expense statistics

router.route("/trends/monthly")
  .get(getMonthlyExpenseTrends); // GET /api/v1/expense/trends/monthly - Get monthly trends

router.route("/download/excel")
  .get(downloadExpenseExcel); // GET /api/v1/expense/download/excel - Download Excel report

// ML prediction endpoints
router.route("/predict-category")
  .post(predictExpenseCategory); // POST /api/v1/expense/predict-category - Predict expense category

router.route("/feedback-category")
  .post(sendExpenseCategoryFeedback); // POST /api/v1/expense/feedback-category - Send category feedback

// Category-based filtering
router.route("/category/:category")
  .get(getExpensesByCategory); // GET /api/v1/expense/category/:category - Get expenses by category

// CRUD operations
router.route("/")
  .post(addExpense)          // POST /api/v1/expense - Add new expense
  .get(getAllExpenses);      // GET /api/v1/expense - Get all expenses (with pagination)

router.route("/:id")
  .get(getExpenseById)       // GET /api/v1/expense/:id - Get expense by ID
  .put(updateExpense)        // PUT /api/v1/expense/:id - Update expense
  .delete(deleteExpense);    // DELETE /api/v1/expense/:id - Delete expense

export default router;