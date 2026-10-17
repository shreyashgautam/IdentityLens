import express from 'express';
import { requestIdMiddleware } from './middlewares/requestId.middleware.js';
import { corsMiddleware } from './middlewares/cors.middleware.js';
import { notFoundMiddleware } from './middlewares/notFound.middleware.js';
import { errorHandlerMiddleware } from './middlewares/errorHandler.middleware.js';
import routes from './routes/index.js';

const app = express();

// 1. Request correlation ID middleware
app.use(requestIdMiddleware);

// 2. CORS configuration middleware
app.use(corsMiddleware);

// 3. Body parsing middleware with size limits
app.use(express.json({ limit: '100kb' }));

// 4. Centralized routing (mounts /health and /api/v1)
app.use(routes);

// 5. 404 handler for unmatched routes
app.use(notFoundMiddleware);

// 6. Centralized error handling middleware
app.use(errorHandlerMiddleware);

export default app;
