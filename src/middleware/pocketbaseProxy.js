import { createProxyMiddleware } from 'http-proxy-middleware';
import logger from '../utils/logger.js';

/**
 * Create PocketBase admin panel proxy middleware
 * Forwards all /admin/* requests to PocketBase admin endpoint
 * @returns {Function} Express middleware
 */
export function createPocketBaseAdminProxy() {
  const pocketbaseUrl = process.env.POCKETBASE_URL || 'http://localhost:8090';

  logger.info(`Creating PocketBase admin proxy to ${pocketbaseUrl}/admin`);

  return createProxyMiddleware({
    target: pocketbaseUrl,
    pathRewrite: {
      '^/admin': '/admin',
    },
    changeOrigin: true,
    ws: true,
    logLevel: 'warn',
    onError: (err, req, res) => {
      logger.error('PocketBase admin proxy error:', {
        message: err.message,
        code: err.code,
        path: req.path,
        method: req.method,
      });

      res.status(503).json({
        error: 'PocketBase admin panel is unavailable',
        message: 'Unable to connect to PocketBase server',
      });
    },
    onProxyRes: (proxyRes, req, res) => {
      // Log successful proxy responses
      logger.debug(`PocketBase admin proxy response: ${proxyRes.statusCode} ${req.method} ${req.path}`);

      // Ensure proper Content-Type headers are preserved
      if (proxyRes.headers['content-type']) {
        res.setHeader('Content-Type', proxyRes.headers['content-type']);
      }
    },
  });
}
