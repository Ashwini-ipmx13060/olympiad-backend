import Joi from 'joi';
import logger from '../utils/logger.js';

/**
 * Create a validation middleware
 * @param {Joi.Schema} schema - Joi validation schema
 * @returns {Function} Express middleware
 */
export function validateRequest(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      logger.warn('Validation error:', errors);
      const err = new Error('Validation failed');
      err.statusCode = 400;
      err.details = errors;
      throw err;
    }

    req.validated = value;
    return next();
  };
}

export const schemas = {
  register: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Email must be a valid email address',
        'any.required': 'Email is required',
      }),
    password: Joi.string()
      .min(8)
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters long',
        'any.required': 'Password is required',
      }),
    firstName: Joi.string()
      .required()
      .messages({
        'any.required': 'First name is required',
      }),
    lastName: Joi.string()
      .required()
      .messages({
        'any.required': 'Last name is required',
      }),
  }),

  login: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Email must be a valid email address',
        'any.required': 'Email is required',
      }),
    password: Joi.string()
      .min(6)
      .required()
      .messages({
        'string.min': 'Password must be at least 6 characters long',
        'any.required': 'Password is required',
      }),
  }),

  googleOAuth: Joi.object({
    idToken: Joi.string()
      .required()
      .messages({
        'any.required': 'ID token is required',
      }),
  }),

  otpRequest: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Email must be a valid email address',
        'any.required': 'Email is required',
      }),
  }),

  otpVerify: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Email must be a valid email address',
        'any.required': 'Email is required',
      }),
    code: Joi.string()
      .length(6)
      .required()
      .messages({
        'string.length': 'OTP code must be exactly 6 characters',
        'any.required': 'OTP code is required',
      }),
  }),

  forgotPassword: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Email must be a valid email address',
        'any.required': 'Email is required',
      }),
  }),

  resetPassword: Joi.object({
    token: Joi.string()
      .required()
      .messages({
        'any.required': 'Reset token is required',
      }),
    newPassword: Joi.string()
      .min(8)
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters long',
        'any.required': 'New password is required',
      }),
  }),

  changePassword: Joi.object({
    oldPassword: Joi.string()
      .required()
      .messages({
        'any.required': 'Current password is required',
      }),
    newPassword: Joi.string()
      .min(8)
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters long',
        'any.required': 'New password is required',
      }),
  }),

  refreshToken: Joi.object({
    refreshToken: Joi.string()
      .required()
      .messages({
        'any.required': 'Refresh token is required',
      }),
  }),

  createQuestion: Joi.object({
    title: Joi.string()
      .required()
      .messages({
        'any.required': 'Question title is required',
      }),
    questionText: Joi.string()
      .required()
      .messages({
        'any.required': 'Question text is required',
      }),
    questionType: Joi.string()
      .valid('multiple-choice', 'short-answer', 'essay')
      .required()
      .messages({
        'any.only': 'Question type must be one of: multiple-choice, short-answer, essay',
        'any.required': 'Question type is required',
      }),
    options: Joi.array()
      .items(Joi.string())
      .messages({
        'array.base': 'Options must be an array of strings',
      }),
    correctAnswer: Joi.string()
      .required()
      .messages({
        'any.required': 'Correct answer is required',
      }),
    difficulty: Joi.string()
      .valid('easy', 'medium', 'hard')
      .required()
      .messages({
        'any.only': 'Difficulty must be one of: easy, medium, hard',
        'any.required': 'Difficulty is required',
      }),
    subject: Joi.string()
      .required()
      .messages({
        'any.required': 'Subject is required',
      }),
  }),

  updateQuestion: Joi.object({
    title: Joi.string(),
    questionText: Joi.string(),
    questionType: Joi.string()
      .valid('multiple-choice', 'short-answer', 'essay')
      .messages({
        'any.only': 'Question type must be one of: multiple-choice, short-answer, essay',
      }),
    options: Joi.array()
      .items(Joi.string())
      .messages({
        'array.base': 'Options must be an array of strings',
      }),
    correctAnswer: Joi.string(),
    difficulty: Joi.string()
      .valid('easy', 'medium', 'hard')
      .messages({
        'any.only': 'Difficulty must be one of: easy, medium, hard',
      }),
    subject: Joi.string(),
  }).min(1).messages({
    'object.min': 'At least one field must be provided for update',
  }),

  createTest: Joi.object({
    title: Joi.string()
      .required()
      .messages({
        'any.required': 'Test title is required',
      }),
    description: Joi.string()
      .messages({
        'string.base': 'Description must be a string',
      }),
    subject: Joi.string()
      .required()
      .messages({
        'any.required': 'Subject is required',
      }),
    duration: Joi.number()
      .required()
      .messages({
        'number.base': 'Duration must be a number',
        'any.required': 'Duration is required',
      }),
    passingScore: Joi.number()
      .min(0)
      .max(100)
      .required()
      .messages({
        'number.base': 'Passing score must be a number',
        'number.min': 'Passing score must be at least 0',
        'number.max': 'Passing score must not exceed 100',
        'any.required': 'Passing score is required',
      }),
  }),

  updateTest: Joi.object({
    title: Joi.string(),
    description: Joi.string(),
    subject: Joi.string(),
    duration: Joi.number(),
    passingScore: Joi.number()
      .min(0)
      .max(100)
      .messages({
        'number.min': 'Passing score must be at least 0',
        'number.max': 'Passing score must not exceed 100',
      }),
  }).min(1).messages({
    'object.min': 'At least one field must be provided for update',
  }),

  addQuestions: Joi.object({
    questionIds: Joi.array()
      .items(Joi.string())
      .required()
      .messages({
        'array.base': 'Question IDs must be an array of strings',
        'any.required': 'Question IDs are required',
      }),
  }),

  startTest: Joi.object({
    testId: Joi.string()
      .required()
      .messages({
        'any.required': 'Test ID is required',
      }),
  }),

  submitAnswer: Joi.object({
    questionId: Joi.string()
      .required()
      .messages({
        'any.required': 'Question ID is required',
      }),
    answer: Joi.string()
      .required()
      .messages({
        'any.required': 'Answer is required',
      }),
  }),
};
