import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { env } from './config/env.js';

const app = express();

// Request ID middleware
app.use((req, res, next) => {
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  req.id = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
});

// CORS configuration
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true
}));

// Body parser with size limit
app.use(express.json({ limit: '100kb' }));

// Health check endpoint (outside versioned prefix as per docs/api-contract.md)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'ivip-mini-backend',
    version: '0.1.0'
  });
});

// Root route
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'IVIP Mini API Server',
    health: '/health',
    version: 'v1'
  });
});

// 404 Not Found handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl}`,
      request_id: req.id
    }
  });
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error(`[${req.id}] Error:`, err);
  const status = err.status || 500;
  res.status(status).json({
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'An unexpected error occurred',
      request_id: req.id
    }
  });
});

export default app;
