/**
 * questions.js
 * API endpoints for question management.
 * Routes: POST, GET, PUT, DELETE /questions
 * Authorization: Teachers can create/edit/delete, students can view
 * Used by: Frontend question pages
 */

import { Router } from 'express';
import QuestionService from '../services/QuestionService.js';
import { validateRequest, schemas } from '../middleware/validationMiddleware.js';
import { requireRole } from '../middleware/rbacMiddleware.js';
import logger from '../utils/logger.js';

const router = Router();

/**
 * POST /questions
 * Create a new question (teacher only)
 */
router.post(
  '/',
  requireRole('teacher'),
  validateRequest(schemas.createQuestion),
  async (req, res) => {
    const userId = req.user?.id;
    const question = await QuestionService.createQuestion(req.validated, userId);

    res.status(201).json({
      success: true,
      question,
    });
  },
);

/**
 * GET /questions
 * Get all questions with optional filters
 * Query params: subject, difficulty, type, page, pageSize
 */
router.get('/', async (req, res) => {
  const { subject, difficulty, type, page = 1, pageSize = 50 } = req.query;

  const filters = {};
  if (subject) filters.subject = subject;
  if (difficulty) filters.difficulty = difficulty;
  if (type) filters.type = type;

  const result = await QuestionService.getAllQuestions(
    filters,
    parseInt(page),
    parseInt(pageSize),
  );

  res.json({
    success: true,
    questions: result.items,
    pagination: {
      page: result.page,
      pageSize: result.perPage,
      total: result.totalItems,
      totalPages: result.totalPages,
    },
  });
});

/**
 * GET /questions/:id
 * Get a single question by ID
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const question = await QuestionService.getQuestion(id);

  if (!question) {
    throw new Error('Question not found');
  }

  res.json({
    success: true,
    question,
  });
});

/**
 * PUT /questions/:id
 * Update a question (teacher only)
 */
router.put(
  '/:id',
  requireRole('teacher'),
  validateRequest(schemas.updateQuestion),
  async (req, res) => {
    const { id } = req.params;
    const question = await QuestionService.updateQuestion(id, req.validated);

    res.json({
      success: true,
      question,
    });
  },
);

/**
 * DELETE /questions/:id
 * Delete a question (teacher only)
 */
router.delete('/:id', requireRole('teacher'), async (req, res) => {
  const { id } = req.params;
  await QuestionService.deleteQuestion(id);

  res.json({
    success: true,
    message: 'Question deleted',
  });
});

/**
 * POST /questions/bulk-upload
 * Bulk upload questions from CSV (teacher only)
 * Body: { csv: "CSV string" }
 */
router.post('/bulk-upload', requireRole('teacher'), async (req, res) => {
  const { csv } = req.body;

  if (!csv) {
    throw new Error('CSV data is required');
  }

  const userId = req.user?.id;
  const result = await QuestionService.bulkUploadQuestions(csv, userId);

  res.status(201).json({
    success: true,
    ...result,
  });
});

export default router;
