import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { initializeDatabase } from "./db.js";
import usersRouter from "../routes/users.js";
import jobsRouter from "../routes/jobs.js";
import applicationsRouter from "../routes/applications.js";
import contactsRouter from "../routes/contacts.js";
import superadminRouter from "../routes/superadmin.js";
import schoolRouter from "../routes/school.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: [
    "https://loyalty-hr.vercel.app",
    "https://www.loyaltyhr.com",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
  ]
}));
app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Routes
app.use("/api/auth", usersRouter);
app.use("/api/jobs", jobsRouter);
app.use("/api/applications", applicationsRouter);
app.use("/api/contacts", contactsRouter);
app.use("/api/courses", schoolRouter);
app.use("/api/superadmin", superadminRouter);

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

// Initialize database and start server
async function startServer() {
  try {
    await initializeDatabase();
    console.log("✓ Database initialized");

    app.listen(PORT, () => {
      console.log(`✓ Server running on http://localhost:${PORT}`);
      console.log(`✓ API base: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
