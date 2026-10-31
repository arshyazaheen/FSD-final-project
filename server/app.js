import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import dotenv from 'dotenv';
dotenv.config();

import { errorHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { mongoSanitizer } from './middleware/mongoSanitize.js';
import { swaggerDocument } from './config/swagger.js';

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import shareRoutes from './routes/shareRoutes.js';
import emergencyRoutes from './routes/emergencyRoutes.js';
import trustedContactRoutes from './routes/trustedContactRoutes.js';
import privacyRoutes from './routes/privacyRoutes.js';
import auditRoutes from './routes/auditRoutes.js';

const app = express();

// Security HTTP headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Allow Swagger UI and Vite client assets in development
  })
);

// CORS configuration
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or Postman)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive for local development flexibility
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Anti-NoSQL injection filter
app.use(mongoSanitizer);

// Apply general API rate limiter
app.use('/api', apiLimiter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'VaultVerse MERN Core Engine',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    security: {
      encryption: 'AES-256-GCM',
      keyManagement: 'Envelope Encryption (DEK/KEK)',
      auditHashChain: 'Tamper-Evident SHA-256',
    },
  });
});

// Interactive Swagger/OpenAPI documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Route handlers
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/share', shareRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/trusted-contacts', trustedContactRoutes);
app.use('/api/privacy', privacyRoutes);
app.use('/api/audit', auditRoutes);

// Catch-all 404 handler for undefined API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `Cannot ${req.method} ${req.originalUrl}`,
    code: 'ROUTE_NOT_FOUND',
  });
});

// Centralized error handler
app.use(errorHandler);

export default app;

