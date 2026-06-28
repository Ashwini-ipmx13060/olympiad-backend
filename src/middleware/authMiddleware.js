import TokenService from '../services/TokenService.js';
import logger from '../utils/logger.js';

export default async function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
      const error = new Error('Missing or invalid authorization header');
      error.statusCode = 401;
      throw error;
    }

    const token = header.slice('Bearer '.length).trim();

    const decoded = TokenService.verifyAccessToken(token);

    req.user = {
      id: decoded.userId,
      organizationId: decoded.organizationId || null,
    };

    return next();
  } catch (error) {
    logger.error('Auth middleware error:', error.message);
    const err = new Error(error.message || 'Unauthorized');
    err.statusCode = 401;
    throw err;
  }
}
