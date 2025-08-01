import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import multer from "multer";
import ApiErrors from "./utils/ApiErrors";

const app: Application = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3003",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
    exposedHeaders: ["Set-Cookie"],
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(multer().none());
app.use(cookieParser());

// Routes
import authRouter from "./routes/user.routes";
import dashboardRouter from "./routes/dashboard.routes";
import expenseRouter from "./routes/expense.routes";
import incomeRouter from "./routes/income.routes";
import anomalyRouter from "./routes/anomaly.routes";

app.use("/api/v1/user", authRouter);
app.use("/api/v1/dashboard", dashboardRouter);
app.use("/api/v1/expense", expenseRouter);
app.use("/api/v1/income", incomeRouter);
app.use("/api/v1/anomaly", anomalyRouter);

// Global error handler
const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ApiErrors) {
    res.status(err.statusCode).json({
      statusCode: err.statusCode,
      message: err.message,
      success: false,
      data: null,
      errors: err.errors
    });
    return;
  }
  
  // Handle validation errors
  if (err.name === 'ValidationError') {
    res.status(400).json({
      statusCode: 400,
      message: "Validation failed",
      success: false,
      data: null,
      errors: Object.values(err.errors).map((e: any) => e.message)
    });
    return;
  }
  
  // Handle JSON parsing errors
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      statusCode: 400,
      message: "Invalid JSON format",
      success: false,
      data: null,
      errors: ["Malformed JSON in request body"]
    });
    return;
  }
  
  // Default error response
  console.error('Unhandled error:', err);
  res.status(500).json({
    statusCode: 500,
    message: "Internal server error",
    success: false,
    data: null,
    errors: []
  });
};

app.use(errorHandler);

export default app;
