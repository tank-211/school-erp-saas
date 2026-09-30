import path from "path";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import http from "http";
import { Server } from "socket.io";
import taskRoutes from "./routes/taskRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import leadRoutes from "./routes/leadRoutes.js";
import activityRoutes from "./routes/activityRoutes.js";
import communicationRoutes from "./routes/communicationRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import dotenv from "dotenv";
dotenv.config();
import { notFoundHandler, errorHandler } from "./middlewares/errorHandler.js";
import { successResponse } from "./utils/response.js";
import applicationRoutes from "./routes/applicationRoutes.js";
import pipelineRoutes from "./routes/pipelineRoutes.js";


const app = express();

// Behind Render's proxy: use the visitor's IP (for login rate limits), not the proxy's
app.set("trust proxy", 1);

// 🔥 VERY IMPORTANT — FIRST
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);

      const allowed = [
        "http://localhost:5173",
        "https://school-erp-saas-odbv.onrender.com",
        "https://school-erp-saas-new.onrender.com",
        "https://school-erp-saas-iota.vercel.app",
      ];

      if (
        allowed.includes(origin) ||
        origin.endsWith(".vercel.app")
      ) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(helmet());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// /uploads is no longer served publicly: it holds application documents and
// bulk-import CSVs (lead phone numbers). No LEAD screen links to these files.
app.use("/api/tasks", taskRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/pipeline", pipelineRoutes);

// THEN security + cors



// Health check
app.get("/api/health", (req, res) => {
  res.json(successResponse({ status: "OK" }, "Health check passed"));
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/communications", communicationRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/notifications", notificationRoutes);
import userRoutes from "./routes/userRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";

app.use("/api/users", userRoutes);
// Reports and dropdown lookups, from the school's own records
app.use("/api/reports", reportRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// 🔥 SOCKET SETUP
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

global.io = io;

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// ✅ ONLY ONE PORT DECLARATION
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
