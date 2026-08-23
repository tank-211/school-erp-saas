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
console.log("EMAIL_USER =", process.env.EMAIL_USER);
console.log("DATABASE_URL =", process.env.DATABASE_URL);
console.log("JWT_SECRET =", process.env.JWT_SECRET);
import { notFoundHandler, errorHandler } from "./middlewares/errorHandler.js";
import { successResponse } from "./utils/response.js";
import applicationRoutes from "./routes/applicationRoutes.js";
import pipelineRoutes from "./routes/pipelineRoutes.js";


const app = express();

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
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
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

app.use("/api/users", userRoutes);

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
