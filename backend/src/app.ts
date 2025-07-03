import express, { Application } from "express";
import cors from "cors";

const app: Application = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

// Routes
// import authRouter from "./routes/auth.routes.js";
// import dashboardRouter from "./routes/dashboard.routes.js";
// import expenseRouter from "./routes/expense.routes.js";
// import incomeRouter from "./routes/income.routes.js";
// app.use("/api/v1/auth", authRouter);
// app.use("/api/v1/dashboard", dashboardRouter);
// app.use("/api/v1/expense", expenseRouter);
// app.use("/api/v1/income", incomeRouter);

export default app;
