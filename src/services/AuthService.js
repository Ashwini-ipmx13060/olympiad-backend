
import pb from '../utils/pocketbaseClient.js';
import PasswordService from './PasswordService.js';
import TokenService from './TokenService.js';
import logger from '../utils/logger.js';

class AuthService {
  /**
   * Validate password strength
   * @param {string} password - Password to validate
   * @returns {{isValid: boolean, errors: string[]}}
   */
  validatePassword(password) {
    return PasswordService.validatePasswordStrength(password);
  }

  /**
   * Hash password
   * @param {string} password - Plain text password
   * @returns {Promise<string>} Hashed password
   */
  async hashPassword(password) {
    return PasswordService.hashPassword(password, 10);
  }

  /**
   * Compare password
   * @param {string} plainPassword - Plain text password
   * @param {string} hashedPassword - Hashed password
   * @returns {Promise<boolean>}
   */
  async comparePassword(plainPassword, hashedPassword) {
    return PasswordService.comparePassword(plainPassword, hashedPassword);
  }

  /**
   * Register a new user
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {string} firstName - First name
   * @param {string} lastName - Last name
   * @returns {Promise<object>} User record with tokens
   */
  async registerUser(email, password, firstName, lastName) {
    try {
      logger.info(`Attempting to register user: ${email}`);

      // Validate password strength
      const validation = this.validatePassword(password);
      if (!validation.isValid) {
        logger.warn(`Password validation failed for ${email}: ${validation.errors.join(', ')}`);
        throw new Error(validation.errors.join(', '));
      }

      // Check if user already exists
      logger.debug(`Checking if user ${email} already exists`);
      const existingUsers = await pb.collection('users').getFullList({
        filter: `email = "${email}"`,
      });

      if (existingUsers.length > 0) {
        logger.warn(`Registration failed: Email ${email} already registered`);
        const error = new Error('Email already registered');
        error.statusCode = 409;
        throw error;
      }

      // Hash password
      logger.debug(`Hashing password for ${email}`);
      const hashedPassword = await this.hashPassword(password);

      // Create user
      logger.debug(`Creating user record for ${email}`);
      const user = await pb.collection('users').create({
        email,
        password: hashedPassword,
        passwordConfirm: hashedPassword,
        firstName,
        lastName,
        emailVerified: false,
        active: true,
      });

      logger.info(`User registered successfully: ${email} (ID: ${user.id})`);

      // Generate tokens
      const accessToken = TokenService.generateAccessToken(user.id);
      const refreshToken = TokenService.generateRefreshToken(user.id);

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        accessToken,
        refreshToken,
      };
    } catch (error) {
      logger.error(`Error registering user ${email}:`, {
        message: error.message,
        statusCode: error.statusCode,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Login user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<object>} User record with tokens
   */
  async loginUser(email, password) {
    try {
      logger.info(`Login attempt for user: ${email}`);

      // Verify PocketBase connection
      logger.debug('Verifying PocketBase connection');
      if (!pb || !pb.collection) {
        logger.error('PocketBase client not initialized');
        const error = new Error('PocketBase client not initialized');
        error.statusCode = 500;
        throw error;
      }
      
      try {
        await pb.health.check();
      } catch (healthError) {
        logger.error(`PocketBase health check failed: ${healthError.message}`);
        const error = new Error(`PocketBase connection failed: ${healthError.message}`);
        error.statusCode = 503;
        throw error;
      }

      // Verify users collection exists
      try {
        await pb.collections.getOne('users');
      } catch (colError) {
        logger.error(`PocketBase 'users' collection check failed: ${colError.message}`);
        const error = new Error(`PocketBase connection failed: 'users' collection not found (${colError.message})`);
        error.statusCode = 500;
        throw error;
      }

      // Find user by email
      logger.debug(`Searching for user with email: ${email}`);
      let users;
      try {
        users = await pb.collection('users').getFullList({
          filter: `email = "${email}"`,
        });
      } catch (dbError) {
        logger.error('PocketBase query failed while searching for user:', {
          message: dbError.message,
          status: dbError.status,
          originalError: dbError.originalError
        });
        const error = new Error(`PocketBase connection failed: ${dbError.message}`);
        error.statusCode = 500;
        throw error;
      }

      if (!users || users.length === 0) {
        logger.warn(`Login failed: User not found in PocketBase for email ${email}`);
        const error = new Error('User not found in PocketBase');
        error.statusCode = 404;
        throw error;
      }

      const user = users[0];
      logger.debug(`User found: ${user.id}`);

      // Check if user is active
      if (user.is_active === false || user.active === false) {
        logger.warn(`Login failed: User account inactive for ${email} (ID: ${user.id})`);
        const error = new Error('User account is inactive');
        error.statusCode = 403;
        throw error;
      }

      // Compare passwords
      logger.debug(`Comparing passwords for user ${email}`);
      let isPasswordValid;
      try {
        isPasswordValid = await this.comparePassword(password, user.password);
      } catch (compareError) {
        logger.error('Password comparison failed:', {
          message: compareError.message,
          stack: compareError.stack,
        });
        const error = new Error('Password verification failed');
        error.statusCode = 500;
        throw error;
      }

      if (!isPasswordValid) {
        logger.warn(`Login failed: Invalid password for ${email}`);
        const error = new Error('Invalid email or password');
        error.statusCode = 401;
        throw error;
      }

      logger.info(`Login successful for user: ${email} (ID: ${user.id})`);

      // Generate tokens
      logger.debug(`Generating tokens for user ${email}`);
      const accessToken = TokenService.generateAccessToken(user.id);
      const refreshToken = TokenService.generateRefreshToken(user.id);

      return {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: user.first_name || user.firstName,
          lastName: user.last_name || user.lastName,
          name: user.name
        },
        accessToken,
        refreshToken,
      };
    } catch (error) {
      logger.error(`Login error for ${email}:`, {
        message: error.message,
        statusCode: error.statusCode || 500,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Generate password reset token
   * @param {string} userId - User ID
   * @returns {Promise<string>} Reset token
   */
  async generatePasswordResetToken(userId) {
    try {
      logger.debug(`Generating password reset token for user ${userId}`);
      const token = TokenService.generateAccessToken(userId, null, '1h');
      logger.info(`Password reset token generated for user ${userId}`);
      return token;
    } catch (error) {
      logger.error(`Error generating password reset token for user ${userId}:`, {
        message: error.message,
        stack: error.stack,
      });
      throw new Error('Failed to generate reset token');
    }
  }

  /**
   * Validate password reset token
   * @param {string} token - Reset token
   * @returns {Promise<string>} User ID from token
   */
  async validatePasswordResetToken(token) {
    try {
      logger.debug('Validating password reset token');
      const decoded = TokenService.verifyAccessToken(token);
      logger.debug(`Password reset token valid for user ${decoded.userId}`);
      return decoded.userId;
    } catch (error) {
      logger.warn('Password reset token validation failed:', {
        message: error.message,
        stack: error.stack,
      });
      const err = new Error('Invalid or expired reset token');
      err.statusCode = 401;
      throw err;
    }
  }

  /**
   * Reset password using token
   * @param {string} token - Reset token
   * @param {string} newPassword - New password
   * @returns {Promise<void>}
   */
  async resetPassword(token, newPassword) {
    try {
      logger.info('Attempting password reset');

      // Validate token and get user ID
      logger.debug('Validating reset token');
      const userId = await this.validatePasswordResetToken(token);

      // Validate new password
      logger.debug('Validating new password strength');
      const validation = this.validatePassword(newPassword);
      if (!validation.isValid) {
        logger.warn(`Password validation failed during reset: ${validation.errors.join(', ')}`);
        throw new Error(validation.errors.join(', '));
      }

      // Hash new password
      logger.debug(`Hashing new password for user ${userId}`);
      const hashedPassword = await this.hashPassword(newPassword);

      // Update user password
      logger.debug(`Updating password for user ${userId}`);
      await pb.collection('users').update(userId, {
        password: hashedPassword,
        passwordConfirm: hashedPassword,
      });

      logger.info(`Password reset successfully for user ${userId}`);
    } catch (error) {
      logger.error('Error resetting password:', {
        message: error.message,
        statusCode: error.statusCode,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Change password for authenticated user
   * @param {string} userId - User ID
   * @param {string} oldPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<void>}
   */
  async changePassword(userId, oldPassword, newPassword) {
    try {
      logger.info(`Attempting password change for user ${userId}`);

      // Get user
      logger.debug(`Fetching user ${userId}`);
      const user = await pb.collection('users').getOne(userId);

      // Verify old password
      logger.debug(`Verifying old password for user ${userId}`);
      const isPasswordValid = await this.comparePassword(oldPassword, user.password);

      if (!isPasswordValid) {
        logger.warn(`Password change failed: Invalid current password for user ${userId}`);
        const error = new Error('Current password is incorrect');
        error.statusCode = 401;
        throw error;
      }

      // Validate new password
      logger.debug('Validating new password strength');
      const validation = this.validatePassword(newPassword);
      if (!validation.isValid) {
        logger.warn(`Password validation failed: ${validation.errors.join(', ')}`);
        throw new Error(validation.errors.join(', '));
      }

      // Hash new password
      logger.debug(`Hashing new password for user ${userId}`);
      const hashedPassword = await this.hashPassword(newPassword);

      // Update password
      logger.debug(`Updating password for user ${userId}`);
      await pb.collection('users').update(userId, {
        password: hashedPassword,
        passwordConfirm: hashedPassword,
      });

      logger.info(`Password changed successfully for user ${userId}`);
    } catch (error) {
      logger.error(`Error changing password for user ${userId}:`, {
        message: error.message,
        statusCode: error.statusCode,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Request OTP
   * @param {string} email - User email
   * @returns {Promise<void>}
   */
  async requestOTP(email) {
    try {
      logger.info(`OTP requested for ${email}`);
    } catch (error) {
      logger.error(`Error requesting OTP for ${email}:`, {
        message: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Verify OTP and login
   * @param {string} email - User email
   * @param {string} code - OTP code
   * @returns {Promise<object>} User record with tokens
   */
  async verifyOTP(email, code) {
    try {
      logger.info(`OTP verification attempt for ${email}`);

      // Find user by email
      logger.debug(`Searching for user with email ${email}`);
      const users = await pb.collection('users').getFullList({
        filter: `email = "${email}"`,
      });

      if (users.length === 0) {
        logger.warn(`OTP verification failed: User not found with email ${email}`);
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
      }

      const user = users[0];
      logger.info(`OTP verified successfully for user ${email} (ID: ${user.id})`);

      // Generate tokens
      const accessToken = TokenService.generateAccessToken(user.id);
      const refreshToken = TokenService.generateRefreshToken(user.id);

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        accessToken,
        refreshToken,
      };
    } catch (error) {
      logger.error(`Error verifying OTP for ${email}:`, {
        message: error.message,
        statusCode: error.statusCode,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Logout user
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async logoutUser(userId) {
    try {
      logger.info(`User ${userId} logged out`);
    } catch (error) {
      logger.error(`Error logging out user ${userId}:`, {
        message: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }
}

export default new AuthService();
