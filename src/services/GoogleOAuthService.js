import { OAuth2Client } from 'google-auth-library';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';

class GoogleOAuthService {
  constructor() {
    this.client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }

  /**
   * Verify Google ID token
   * @param {string} idToken - Google ID token
   * @returns {Promise<object>} Decoded token payload
   */
  async verifyGoogleIdToken(idToken) {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();

      if (!payload.email_verified) {
        throw new Error('Email not verified by Google');
      }

      return {
        id: payload.sub,
        email: payload.email,
        firstName: payload.given_name || '',
        lastName: payload.family_name || '',
        picture: payload.picture,
      };
    } catch (error) {
      logger.error('Error verifying Google ID token:', error);
      throw new Error('Invalid or expired Google token');
    }
  }

  /**
   * Find or create user from Google profile
   * @param {object} googleProfile - Google profile data
   * @returns {Promise<object>} User record
   */
  async findOrCreateUserFromGoogle(googleProfile) {
    try {
      // Try to find existing user by email
      const existingUsers = await pb.collection('users').getFullList({
        filter: `email = "${googleProfile.email}"`,
      });

      if (existingUsers.length > 0) {
        return existingUsers[0];
      }

      // Create new user
      const newUser = await pb.collection('users').create({
        email: googleProfile.email,
        firstName: googleProfile.firstName,
        lastName: googleProfile.lastName,
        password: Math.random().toString(36).slice(-16),
        passwordConfirm: Math.random().toString(36).slice(-16),
        emailVerified: true,
        active: true,
      });

      return newUser;
    } catch (error) {
      logger.error('Error finding or creating user from Google:', error);
      throw new Error('Failed to process Google authentication');
    }
  }

  /**
   * Update or create OAuth account record
   * @param {string} userId - User ID
   * @param {object} googleProfile - Google profile data
   * @param {object} tokens - OAuth tokens (optional)
   * @returns {Promise<object>} OAuth account record
   */
  async updateGoogleOAuthAccount(userId, googleProfile, tokens = {}) {
    try {
      // Check if OAuth account already exists
      const existingAccounts = await pb.collection('oauth_accounts').getFullList({
        filter: `userId = "${userId}" && provider = "google"`,
      });

      const accountData = {
        userId,
        provider: 'google',
        providerUserId: googleProfile.id,
        email: googleProfile.email,
        firstName: googleProfile.firstName,
        lastName: googleProfile.lastName,
        picture: googleProfile.picture,
        ...(tokens.accessToken && { accessToken: tokens.accessToken }),
        ...(tokens.refreshToken && { refreshToken: tokens.refreshToken }),
      };

      if (existingAccounts.length > 0) {
        // Update existing account
        return await pb.collection('oauth_accounts').update(existingAccounts[0].id, accountData);
      } else {
        // Create new account
        return await pb.collection('oauth_accounts').create(accountData);
      }
    } catch (error) {
      logger.error('Error updating Google OAuth account:', error);
      throw new Error('Failed to update OAuth account');
    }
  }
}

export default new GoogleOAuthService();
