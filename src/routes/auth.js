import { Router } from 'express';
import AuthService from '../services/AuthService.js';
import TokenService from '../services/TokenService.js';
import OTPService from '../services/OTPService.js';
import GoogleOAuthService from '../services/GoogleOAuthService.js';
import { validateRequest, schemas } from '../middleware/validationMiddleware.js';
import { authLimiter, otpLimiter, passwordResetLimiter } from '../middleware/rateLimitMiddleware.js';
import authMiddleware from '../middleware/authMiddleware.js';
import logger from '../utils/logger.js';
import pb from '../utils/pocketbaseClient.js';

const router = Router();

router.post('/register', validateRequest(schemas.register), async (req, res) => {
  const { email, password, firstName, lastName } = req.validated;
  const result = await AuthService.registerUser(email, password, firstName, lastName);
  res.status(201).json({
    success: true,
    user: result.user,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });
});

router.post('/login', authLimiter, validateRequest(schemas.login), async (req, res) => {
  const { email, password } = req.validated;
  const result = await AuthService.loginUser(email, password);
  res.json({
    success: true,
    user: result.user,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });
});

router.post('/google-oauth', validateRequest(schemas.googleOAuth), async (req, res) => {
  const { idToken } = req.validated;
  const googleProfile = await GoogleOAuthService.verifyGoogleIdToken(idToken);
  const user = await GoogleOAuthService.findOrCreateUserFromGoogle(googleProfile);
  await GoogleOAuthService.updateGoogleOAuthAccount(user.id, googleProfile);
  const accessToken = TokenService.generateAccessToken(user.id);
  const refreshToken = TokenService.generateRefreshToken(user.id);
  const isNewUser = !user.emailVerified;
  res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    },
    accessToken,
    refreshToken,
    isNewUser,
  });
});

router.post('/otp-request', otpLimiter, validateRequest(schemas.otpRequest), async (req, res) => {
  const { email } = req.validated;
  const code = OTPService.generateOTP(6);
  await OTPService.storeOTP(email, code);
  await OTPService.sendOTPEmail(email, code);
  res.json({
    success: true,
    message: 'OTP sent to email',
  });
});

router.post('/otp-verify', validateRequest(schemas.otpVerify), async (req, res) => {
  const { email, code } = req.validated;
  await OTPService.verifyOTP(email, code);
  const result = await AuthService.verifyOTP(email, code);
  res.json({
    success: true,
    user: result.user,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });
});

router.post(
  '/forgot-password',
  passwordResetLimiter,
  validateRequest(schemas.forgotPassword),
  async (req, res) => {
    const { email } = req.validated;
    const users = await pb.collection('users').getFullList({
      filter: `email = "${email}"`,
    });
    if (users.length > 0) {
      const user = users[0];
      const resetToken = await AuthService.generatePasswordResetToken(user.id);
      logger.info(`Password reset token generated for ${email}`);
    }
    res.json({
      success: true,
      message: 'Password reset email sent',
    });
  },
);

router.post('/reset-password', validateRequest(schemas.resetPassword), async (req, res) => {
  const { token, newPassword } = req.validated;
  await AuthService.resetPassword(token, newPassword);
  res.json({
    success: true,
    message: 'Password reset successfully',
  });
});

router.post(
  '/change-password',
  authMiddleware,
  validateRequest(schemas.changePassword),
  async (req, res) => {
    const { oldPassword, newPassword } = req.validated;
    const userId = req.user.id;
    await AuthService.changePassword(userId, oldPassword, newPassword);
    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  },
);

router.post('/refresh-token', validateRequest(schemas.refreshToken), async (req, res) => {
  const { refreshToken } = req.validated;
  const decoded = TokenService.verifyRefreshToken(refreshToken);
  const newAccessToken = TokenService.generateAccessToken(decoded.userId);
  const newRefreshToken = TokenService.generateRefreshToken(decoded.userId);
  res.json({
    success: true,
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  });
});

router.post('/logout', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  await AuthService.logoutUser(userId);
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

router.get('/me', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const user = await pb.collection('users').getOne(userId, {
    expand: 'organization,roles',
  });
  res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      organization: user.expand?.organization || null,
      roles: user.expand?.roles || [],
    },
  });
});

export default router;
