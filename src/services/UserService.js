import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';

class UserService {
  /**
   * Get all users
   * @returns {Promise<Array>} Array of user objects with id, email, name, role
   */
  async getAllUsers() {
    try {
      const users = await pb.collection('users').getFullList({
        expand: 'role',
      });

      return users.map((user) => ({
        id: user.id,
        email: user.email,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.expand?.role ? {
          id: user.expand.role.id,
          name: user.expand.role.name,
        } : null,
      }));
    } catch (error) {
      logger.error('Error fetching all users:', error);
      throw error;
    }
  }

  /**
   * Get user by ID
   * @param {string} userId - User ID
   * @returns {Promise<object|null>} User object with id, email, name, role or null if not found
   */
  async getUserById(userId) {
    try {
      if (!userId) {
        return null;
      }

      const user = await pb.collection('users').getOne(userId, {
        expand: 'role',
      });

      return {
        id: user.id,
        email: user.email,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.expand?.role ? {
          id: user.expand.role.id,
          name: user.expand.role.name,
        } : null,
      };
    } catch (error) {
      if (error.status === 404) {
        logger.warn(`User ${userId} not found`);
        return null;
      }
      logger.error(`Error fetching user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Update user role
   * @param {string} userId - User ID
   * @param {string} roleId - Role ID to assign
   * @returns {Promise<object>} Updated user object with expanded role
   */
  async updateUserRole(userId, roleId) {
    try {
      if (!userId || !roleId) {
        throw new Error('User ID and Role ID are required');
      }

      const updatedUser = await pb.collection('users').update(userId, {
        role: roleId,
      }, {
        expand: 'role',
      });

      return {
        id: updatedUser.id,
        email: updatedUser.email,
        name: `${updatedUser.firstName || ''} ${updatedUser.lastName || ''}`.trim(),
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: updatedUser.expand?.role ? {
          id: updatedUser.expand.role.id,
          name: updatedUser.expand.role.name,
        } : null,
      };
    } catch (error) {
      logger.error(`Error updating role for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Delete user
   * @param {string} userId - User ID
   * @returns {Promise<object>} Success message
   */
  async deleteUser(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      await pb.collection('users').delete(userId);

      logger.info(`User ${userId} deleted`);

      return {
        success: true,
        message: 'User deleted',
      };
    } catch (error) {
      logger.error(`Error deleting user ${userId}:`, error);
      throw error;
    }
  }
}

export default new UserService();
