import express from 'express';
import cookieParser from 'cookie-parser';
import { requestIdMiddleware } from './middlewares/request-id.js';
import { securityHeadersMiddleware } from './middlewares/security-headers.js';
import { corsMiddleware } from './middlewares/cors.js';
import { notFoundMiddleware } from './middlewares/not-found.js';
import { errorHandlerMiddleware } from './middlewares/error-handler.js';
import routes from './routes/index.js';

const app = express();

// 1. Request correlation ID middleware (early tracking)
app.use(requestIdMiddleware);

// 2. HTTP Security headers (defense in depth)
app.use(securityHeadersMiddleware);

// 3. CORS configuration middleware
app.use(corsMiddleware);

// 4. Body parsing middleware with size limits (100kb payload ceiling)
app.use(express.json({ limit: '100kb' }));

// 5. Cookie parsing middleware for HttpOnly refresh tokens
app.use(cookieParser());

// 5. Centralized routing (mounts /health, /, and /api/v1)
app.use(routes);

// 6. 404 handler for unmatched routes
app.use(notFoundMiddleware);

// 7. Centralized error handling middleware
app.use(errorHandlerMiddleware);

export default app;
