import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';

class RBACService {
  /**
   * Check if user has a specific role
   * @param {string} userId - User ID
   * @param {string} roleName - Role name to check
   * @returns {Promise<boolean>} True if user has the role
   */
  async hasRole(userId, roleName) {
    try {
      if (!userId || !roleName) {
        return false;
      }

      const userRoles = await pb.collection('user_roles').getFullList({
        filter: `userId = "${userId}" && role.name = "${roleName}"`,
        expand: 'role',
      });

      return userRoles.length > 0;
    } catch (error) {
      logger.error(`Error checking role ${roleName} for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Check if user has a specific permission
   * @param {string} userId - User ID
   * @param {string} permissionName - Permission name to check
   * @returns {Promise<boolean>} True if user's role has the permission
   */
  async hasPermission(userId, permissionName) {
    try {
      if (!userId || !permissionName) {
        return false;
      }

      // Get user's role
      const userRoles = await pb.collection('user_roles').getFullList({
        filter: `userId = "${userId}"`,
        expand: 'role',
      });

      if (userRoles.length === 0) {
        return false;
      }

      const userRole = userRoles[0];
      const roleId = userRole.expand?.role?.id || userRole.role;

      // Check if role has the permission
      const rolePermissions = await pb.collection('role_permissions').getFullList({
        filter: `roleId = "${roleId}" && permission.name = "${permissionName}"`,
        expand: 'permission',
      });

      return rolePermissions.length > 0;
    } catch (error) {
      logger.error(`Error checking permission ${permissionName} for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Get user's role object
   * @param {string} userId - User ID
   * @returns {Promise<object|null>} Role object with id, name, description or null if not found
   */
  async getUserRole(userId) {
    try {
      if (!userId) {
        return null;
      }

      const userRoles = await pb.collection('user_roles').getFullList({
        filter: `userId = "${userId}"`,
        expand: 'role',
      });

      if (userRoles.length === 0) {
        return null;
      }

      const userRole = userRoles[0];
      const role = userRole.expand?.role;

      if (!role) {
        return null;
      }

      return {
        id: role.id,
        name: role.name,
        description: role.description || null,
      };
    } catch (error) {
      logger.error(`Error getting role for user ${userId}:`, error);
      return null;
    }
  }
}

export default new RBACService();
