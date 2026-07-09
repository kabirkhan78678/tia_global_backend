const express = require("express");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");

const routes = require("./routes");
const errorHandler = require("./middlewares/errorHandler");
const notFoundHandler = require("./middlewares/notFoundHandler");

const app = express();

/* ==========================================
   Security & Middlewares
========================================== */

app.use(helmet());
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "../public")));

/* ==========================================
   Root Endpoint
========================================== */

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    application: "TIA Global API",
    version: "1.0.0",
    status: "Running",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    message: "Welcome to the TIA Global Backend API.",
    endpoints: {
      health: "/health",
      api: "/api"
    }
  });
});

/* ==========================================
   Health Check
========================================== */

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    application: "TIA Global API",
    status: "Healthy",
    uptime: `${Math.floor(process.uptime())} seconds`,
    timestamp: new Date().toISOString()
  });
});

/* ==========================================
   Reset Password Page
========================================== */

app.get("/reset-password", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/reset-password.html"));
});

/* ==========================================
   API Routes
========================================== */

app.use("/api", routes);

/* ==========================================
   404 Handler
========================================== */

app.use(notFoundHandler);

/* ==========================================
   Global Error Handler
========================================== */

app.use(errorHandler);

module.exports = app;