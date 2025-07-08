import express, { Application } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import multer from "multer";

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

app.use("/api/v1/user", authRouter);
app.use("/api/v1/dashboard", dashboardRouter);
app.use("/api/v1/expense", expenseRouter);
app.use("/api/v1/income", incomeRouter);

export default app;
