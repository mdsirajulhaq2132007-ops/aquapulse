require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/db');
const socketConfig = require('./config/socket');

const authRoutes = require('./routes/auth');
const villageRoutes = require('./routes/villages');
const sourceRoutes = require('./routes/sources');
const sensorRoutes = require('./routes/sensors');
const readingsRoutes = require('./routes/readings');
const dashboardRoutes = require('./routes/dashboard');
const alertRoutes = require('./routes/alerts');
const analyticsRoutes = require('./routes/analytics');

const app = express();
const httpServer = http.createServer(app);

// Initialize Socket.IO
socketConfig.init(httpServer);

// Connect to database
connectDB();

// Security & compression
app.use(helmet({ crossOriginEmbedderPolicy: false }));
app.use(compression());

// CORS — accept localhost:5173 (Vite) and localhost:5174 (fallback)
const corsOptions = {
  origin: (origin, callback) => {
    const allowed = [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5173',
      process.env.CLIENT_URL,
    ].filter(Boolean);
    // Allow requests with no origin (curl, Postman, same-origin via proxy)
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-device-key'],
};
app.use(cors(corsOptions));
// cors() handles OPTIONS pre-flight automatically



// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// Logging (dev only)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), environment: process.env.NODE_ENV });
});

// API Routes
app.use('/api/auth',      authRoutes);
app.use('/api/villages',  villageRoutes);
app.use('/api/sources',   sourceRoutes);
app.use('/api/sensors',   sensorRoutes);
app.use('/api/readings',  readingsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/alerts',    alertRoutes);
app.use('/api/analytics', analyticsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 AquaPulse Server running on port ${PORT}`);
  console.log(`📡 WebSocket ready`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
});
