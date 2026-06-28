import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';

class TokenService {
  /**
   * Generate access token
   * @param {string} userId - User ID
   * @param {string} organizationId - Organization ID (optional)
   * @param {string} expiresIn - Expiration time (default: 1h)
   * @returns {string} JWT access token
   */
  generateAccessToken(userId, organizationId = null, expiresIn = '1h') {
    try {
      const payload = {
        userId,
        ...(organizationId && { organizationId }),
        type: 'access',
      };

      return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: expiresIn || process.env.JWT_EXPIRATION || '1h',
        issuer: 'olympiad-api',
      });
    } catch (error) {
      logger.error('Error generating access token:', error);
      throw new Error('Failed to generate access token');
    }
  }

  /**
   * Generate refresh token
   * @param {string} userId - User ID
   * @param {string} expiresIn - Expiration time (default: 7d)
   * @returns {string} JWT refresh token
   */
  generateRefreshToken(userId, expiresIn = '7d') {
    try {
      const payload = {
        userId,
        type: 'refresh',
      };

      return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
        expiresIn: expiresIn || process.env.JWT_REFRESH_EXPIRATION || '7d',
        issuer: 'olympiad-api',
      });
    } catch (error) {
      logger.error('Error generating refresh token:', error);
      throw new Error('Failed to generate refresh token');
    }
  }

  /**
   * Verify access token
   * @param {string} token - JWT token
   * @returns {object} Decoded token payload
   */
  verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET, {
        issuer: 'olympiad-api',
      });

      if (decoded.type !== 'access') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      logger.error('Error verifying access token:', error.message);
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Verify refresh token
   * @param {string} token - JWT token
   * @returns {object} Decoded token payload
   */
  verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET, {
        issuer: 'olympiad-api',
      });

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      logger.error('Error verifying refresh token:', error.message);
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Decode token without verification (for debugging)
   * @param {string} token - JWT token
   * @returns {object} Decoded token payload
   */
  decodeToken(token) {
    try {
      return jwt.decode(token);
    } catch (error) {
      logger.error('Error decoding token:', error);
      return null;
    }
  }

  /**
   * Check if token is expired
   * @param {string} token - JWT token
   * @returns {boolean} True if token is expired
   */
  isTokenExpired(token) {
    try {
      const decoded = jwt.decode(token);
      if (!decoded || !decoded.exp) return true;
      return decoded.exp * 1000 < Date.now();
    } catch (error) {
      return true;
    }
  }
}

export default new TokenService();
