const express = require("express");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");

const env = require("./config/env");
const routes = require("./routes");
const errorHandler = require("./middlewares/errorHandler");
const notFoundHandler = require("./middlewares/notFoundHandler");

const app = express();

/* ==========================================
   Security & Middlewares
========================================== */

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginEmbedderPolicy: false,
    originAgentCluster: false,
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  })
);

app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logging Middleware (if DEBUG is enabled)
if (env.debug) {
  app.use((req, res, next) => {
    const start = Date.now();
    const { method, url, body, query } = req;
    
    // Mask sensitive fields
    const safeBody = { ...body };
    const mask = (obj) => {
      for (const key in obj) {
        if (key.toLowerCase().includes('password')) {
          obj[key] = '********';
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          mask(obj[key]);
        }
      }
    };
    mask(safeBody);

    res.on('finish', () => {
      const duration = Date.now() - start;
      const statusColor = res.statusCode >= 400 ? '\x1b[31m' : '\x1b[32m';
      console.log(
        `\x1b[35m[API]\x1b[0m \x1b[36m${method}\x1b[0m ${url} - ${statusColor}${res.statusCode}\x1b[0m (${duration}ms)`
      );
      if (Object.keys(safeBody).length > 0) {
        console.log(`  \x1b[90mBody:\x1b[0m`, JSON.stringify(safeBody));
      }
      if (Object.keys(query).length > 0) {
        console.log(`  \x1b[90mQuery:\x1b[0m`, JSON.stringify(query));
      }
    });
    next();
  });
}

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