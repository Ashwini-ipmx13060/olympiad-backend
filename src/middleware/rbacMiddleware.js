import RBACService from '../services/RBACService.js';

/**
 * Middleware factory that requires a specific role
 * @param {string} roleName - Role name required
 * @returns {Function} Express middleware
 */
export function requireRole(roleName) {
  return async (req, res, next) => {
    if (!req.user || !req.user.id) {
      throw new Error('Forbidden');
    }

    const hasRole = await RBACService.hasRole(req.user.id, roleName);

    if (!hasRole) {
      throw new Error('Forbidden');
    }

    return next();
  };
}

/**
 * Middleware factory that requires a specific permission
 * @param {string} permissionName - Permission name required
 * @returns {Function} Express middleware
 */
export function requirePermission(permissionName) {
  return async (req, res, next) => {
    if (!req.user || !req.user.id) {
      throw new Error('Forbidden');
    }

    const hasPermission = await RBACService.hasPermission(req.user.id, permissionName);

    if (!hasPermission) {
      throw new Error('Forbidden');
    }

    return next();
  };
}
