import { Router } from 'express';
import RBACService from '../services/RBACService.js';

const router = Router();

/**
 * GET /my-role
 * Get the authenticated user's role
 */
router.get('/my-role', async (req, res) => {
  if (!req.user || !req.user.id) {
    throw new Error('User not authenticated');
  }

  const role = await RBACService.getUserRole(req.user.id);

  res.json({
    success: true,
    role,
  });
});

/**
 * GET /check-permission
 * Check if user has a specific permission
 * Query params: permission=<permissionName>
 */
router.get('/check-permission', async (req, res) => {
  if (!req.user || !req.user.id) {
    throw new Error('User not authenticated');
  }

  const { permission } = req.query;

  if (!permission) {
    throw new Error('Permission parameter required');
  }

  const hasPermission = await RBACService.hasPermission(req.user.id, permission);

  res.json({
    success: true,
    hasPermission,
  });
});

export default router;
