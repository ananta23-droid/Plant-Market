import dotenv from 'dotenv';
dotenv.config(); // Must be first — loads env vars before anything reads them

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
// import rateLimit from 'express-rate-limit';

import path from 'path';
import { fileURLToPath } from 'url';
import logger from './utils/logger.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import adminRoutes from './routes/admin.js';
import cartRoutes from './routes/cart.js';
import paymentRoutes from './routes/payment.js';

// dotenv already loaded at top of file

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 5000;

// 1. Security Middlewares
// Configure helmet with a custom CSP that allows:
//   - Images from localhost:5000 (locally saved product uploads)
//   - Images from any HTTPS source (vendor-pasted external URLs)
//   - data: URIs (inline images / base64)
// Also disable Cross-Origin-Resource-Policy (CORP) — its default value
// 'same-origin' blocks the browser from loading localhost:5000 images on
// the frontend page at localhost:5173, even when CORS is explicitly allowed.
const clientOrigin = process.env.CLIENT_URL || 'http://localhost:5173';
const serverOrigin = `http://localhost:${process.env.PORT || 5000}`;
app.use(
  helmet({
    crossOriginResourcePolicy: false, // allow cross-origin image loads
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        // Allow images from self, the backend server, any https, and data URIs
        'img-src': ["'self'", serverOrigin, clientOrigin, 'https:', 'data:'],
      },
    },
  })
);

// Allow the Vite dev server (5173) and any CLIENT_URL set in .env
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean); // remove undefined/null entries

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, mobile apps)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin '${origin}' not allowed`));
  },
  credentials: true,
}));

// Serve locally uploaded product images AFTER CORS so cross-origin
// image requests from the frontend (port 5173) include the correct
// Access-Control-Allow-Origin header.
app.use('/uploads', express.static(path.join(__dirname, '..', 'public', 'uploads')));

// Rate limiter: Max 100 requests per 15 minutes (Disabled for development)
/*
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100, 
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes',
    error: {
      code: 'TOO_MANY_REQUESTS',
      details: 'Rate limit exceeded'
    }
  }
});
app.use('/api', limiter);
*/

// 2. Request Parsing Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`);
  next();
});

// 3. API Routes version 1
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/payment', paymentRoutes);

// Root path diagnostic route
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'System is healthy and online',
    data: {
      timestamp: new Date().toISOString()
    }
  });
});

// 4. Not Found (404) Route Handler
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  error.code = 'NOT_FOUND';
  next(error);
});

// 5. Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  
  logger.error(`${err.message} [Code: ${errorCode}]`, err);

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    error: {
      code: errorCode,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }
  });
});

app.listen(PORT, () => {
  logger.info(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

export default app;
