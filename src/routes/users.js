import { Router } from 'express';
import UserService from '../services/UserService.js';
import RBACService from '../services/RBACService.js';
import { requireRole } from '../middleware/rbacMiddleware.js';

const router = Router();

/**
 * GET /
 * Get all users (admin only)
 */
router.get('/', requireRole('admin'), async (req, res) => {
  const users = await UserService.getAllUsers();

  res.json({
    success: true,
    users,
  });
});

/**
 * GET /:userId
 * Get user by ID
 * Authorization: Allow if req.user.id === userId OR user has admin role
 */
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;
  const requestingUserId = req.user?.id;

  // Check authorization: allow if requesting own profile or is admin
  if (requestingUserId !== userId) {
    const isAdmin = await RBACService.hasRole(requestingUserId, 'admin');
    if (!isAdmin) {
      throw new Error('Forbidden');
    }
  }

  const user = await UserService.getUserById(userId);

  if (!user) {
    throw new Error('User not found');
  }

  res.json({
    success: true,
    user,
  });
});

/**
 * PUT /:userId/role
 * Update user role (admin only)
 * Body: { roleId }
 */
router.put('/:userId/role', requireRole('admin'), async (req, res) => {
  const { userId } = req.params;
  const { roleId } = req.body;

  if (!roleId) {
    throw new Error('roleId required');
  }

  const updatedUser = await UserService.updateUserRole(userId, roleId);

  res.json({
    success: true,
    user: updatedUser,
  });
});

/**
 * DELETE /:userId
 * Delete user (admin only)
 */
router.delete('/:userId', requireRole('admin'), async (req, res) => {
  const { userId } = req.params;

  const result = await UserService.deleteUser(userId);

  res.json(result);
});

export default router;
