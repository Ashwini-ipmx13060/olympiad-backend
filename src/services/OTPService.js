import nodemailer from 'nodemailer';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';

class OTPService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  /**
   * Initialize nodemailer transporter
   */
  initializeTransporter() {
    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } catch (error) {
      logger.error('Error initializing email transporter:', error);
    }
  }

  /**
   * Generate a random OTP code
   * @param {number} length - OTP length (default: 6)
   * @returns {string} Random OTP code
   */
  generateOTP(length = 6) {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
      otp += digits.charAt(Math.floor(Math.random() * digits.length));
    }
    return otp;
  }

  /**
   * Send OTP via email
   * @param {string} email - Recipient email
   * @param {string} code - OTP code
   * @returns {Promise<void>}
   */
  async sendOTPEmail(email, code) {
    try {
      if (!this.transporter) {
        logger.warn('Email transporter not initialized, skipping OTP email');
        return;
      }

      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@olympiad.test',
        to: email,
        subject: 'Your OTP Code',
        html: `
          <h2>Your One-Time Password</h2>
          <p>Your OTP code is: <strong>${code}</strong></p>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this code, please ignore this email.</p>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      logger.info(`OTP email sent to ${email}`);
    } catch (error) {
      logger.error('Error sending OTP email:', error);
      throw new Error('Failed to send OTP email');
    }
  }

  /**
   * Store OTP in database
   * @param {string} email - User email
   * @param {string} code - OTP code
   * @param {number} expiresIn - Expiration time in milliseconds (default: 10 minutes)
   * @returns {Promise<object>} Created OTP record
   */
  async storeOTP(email, code, expiresIn = 10 * 60 * 1000) {
    try {
      const expiresAt = new Date(Date.now() + expiresIn).toISOString();

      const record = await pb.collection('otp_codes').create({
        email,
        code,
        expiresAt,
        used: false,
      });

      return record;
    } catch (error) {
      logger.error('Error storing OTP:', error);
      throw new Error('Failed to store OTP');
    }
  }

  /**
   * Verify OTP code
   * @param {string} email - User email
   * @param {string} code - OTP code to verify
   * @returns {Promise<boolean>} True if OTP is valid
   */
  async verifyOTP(email, code) {
    try {
      const records = await pb.collection('otp_codes').getFullList({
        filter: `email = "${email}" && code = "${code}" && used = false`,
      });

      if (records.length === 0) {
        throw new Error('Invalid OTP code');
      }

      const otpRecord = records[0];
      const expiresAt = new Date(otpRecord.expiresAt).getTime();

      if (expiresAt < Date.now()) {
        throw new Error('OTP code has expired');
      }

      // Mark OTP as used
      await pb.collection('otp_codes').update(otpRecord.id, { used: true });

      return true;
    } catch (error) {
      logger.error('Error verifying OTP:', error);
      throw error;
    }
  }
}

export default new OTPService();
