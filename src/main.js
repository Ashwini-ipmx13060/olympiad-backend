
import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import routes from './routes/index.js';
import { errorMiddleware } from './middleware/error.js';
import { globalRateLimit } from './middleware/global-rate-limit.js';
import { createPocketBaseAdminProxy } from './middleware/pocketbaseProxy.js';
import logger from './utils/logger.js';
import { BodyLimit } from './constants/common.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.set('trust proxy', false);

process.on('uncaughtException', (error) => {
	logger.error('Uncaught exception:', error);
});
  
process.on('unhandledRejection', (reason, promise) => {
	logger.error('Unhandled rejection at:', promise, 'reason:', reason);
});

process.on('SIGINT', async () => {
	logger.info('Interrupted');
	process.exit(0);
});

process.on('SIGTERM', async () => {
	logger.info('SIGTERM signal received');

	await new Promise(resolve => setTimeout(resolve, 3000));

	logger.info('Exiting');
	process.exit();
});

// 1. Security middleware
app.use(helmet());
app.use(cors({
	origin: process.env.CORS_ORIGIN,
	credentials: true,
}));
app.use(morgan('combined'));
app.use(globalRateLimit);

// 2. Body parser
app.use(express.json({
	limit: BodyLimit,
}));
app.use(express.urlencoded({ 
	extended: true,
	limit: BodyLimit,
}));

// 3. API routes - MOUNTED AT /hcgi/api PREFIX BEFORE catch-all
app.use('/hcgi/api', routes());

// 4. PocketBase admin proxy (/admin/*) MUST BE HERE BEFORE catch-all
app.use('/admin', createPocketBaseAdminProxy());

// 5. Static file serving from apps/web/dist
app.use(express.static(path.join(__dirname, '../../web/dist')));

// 6. Catch-all route for React (Must be LAST route before error handling)
app.get('*', (req, res) => {
	res.sendFile(path.join(__dirname, '../../web/dist/index.html'));
});

// 7. Error middleware (Must be at the very end to catch errors from any route)
app.use(errorMiddleware);

const port = process.env.PORT || 3001;

app.listen(port, () => {
	logger.info(`🚀 API Server running on http://localhost:${port}`);
	logger.info(`📊 PocketBase Admin Panel available at http://localhost:${port}/admin`);
	logger.info(`📡 API endpoints available at http://localhost:${port}/hcgi/api`);
});

export default app;
