import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import logger from '../utils/logger.js';

class PasswordService {
  /**
   * Hash a password using bcrypt
   * @param {string} password - Plain text password
   * @param {number} rounds - Bcrypt rounds (default: 10)
   * @returns {Promise<string>} Hashed password
   */
  async hashPassword(password, rounds = 10) {
    try {
      const salt = await bcrypt.genSalt(rounds);
      return await bcrypt.hash(password, salt);
    } catch (error) {
      logger.error('Error hashing password:', error);
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Compare plain password with hashed password
   * @param {string} plainPassword - Plain text password
   * @param {string} hashedPassword - Hashed password
   * @returns {Promise<boolean>} True if passwords match
   */
  async comparePassword(plainPassword, hashedPassword) {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      logger.error('Error comparing passwords:', error);
      return false;
    }
  }

  /**
   * Validate password strength
   * @param {string} password - Password to validate
   * @returns {{isValid: boolean, errors: string[]}} Validation result
   */
  validatePasswordStrength(password) {
    const errors = [];

    if (!password || password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate a secure random token
   * @param {number} length - Token length in bytes (default: 32)
   * @returns {string} Hex-encoded random token
   */
  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }
}

export default new PasswordService();