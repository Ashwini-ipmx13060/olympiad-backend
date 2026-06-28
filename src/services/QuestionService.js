/**
 * QuestionService.js
 * Handles all question-related database operations.
 * Methods: create, read, update, delete, list, bulk upload
 * Used by: questions.js routes
 * Dependencies: pocketbaseClient, logger
 */

import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';

class QuestionService {
  /**
   * Build filter string for PocketBase query
   * @param {object} filters - Filter criteria
   * @returns {string} Filter string for PocketBase
   */
  buildFilterString(filters) {
    const conditions = [];

    if (filters.subject) {
      conditions.push(`subject = "${filters.subject}"`);
    }

    if (filters.difficulty) {
      conditions.push(`difficulty = "${filters.difficulty}"`);
    }

    if (filters.type) {
      conditions.push(`questionType = "${filters.type}"`);
    }

    return conditions.length > 0 ? conditions.join(' && ') : '';
  }

  /**
   * Create a new question
   * @param {object} data - Question data
   * @param {string} userId - User ID of question creator
   * @returns {Promise<object>} Created question record
   */
  async createQuestion(data, userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const questionData = {
        ...data,
        createdBy: userId,
      };

      const question = await pb.collection('questions').create(questionData);

      logger.info(`Question created: ${question.id} by user ${userId}`);

      return question;
    } catch (error) {
      logger.error('Error creating question:', error);
      throw error;
    }
  }

  /**
   * Get a single question by ID
   * @param {string} id - Question ID
   * @returns {Promise<object|null>} Question record or null if not found
   */
  async getQuestion(id) {
    try {
      if (!id) {
        throw new Error('Question ID is required');
      }

      const question = await pb.collection('questions').getOne(id, {
        expand: 'createdBy',
      });

      return question;
    } catch (error) {
      if (error.status === 404) {
        logger.warn(`Question ${id} not found`);
        return null;
      }
      logger.error(`Error fetching question ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get all questions with optional filters
   * @param {object} filters - Filter criteria (subject, difficulty, type)
   * @param {number} page - Page number (default: 1)
   * @param {number} pageSize - Items per page (default: 50)
   * @returns {Promise<object>} Paginated questions with metadata
   */
  async getAllQuestions(filters = {}, page = 1, pageSize = 50) {
    try {
      const filterString = this.buildFilterString(filters);

      const result = await pb.collection('questions').getList(page, pageSize, {
        filter: filterString,
        expand: 'createdBy',
        sort: '-created',
      });

      return result;
    } catch (error) {
      logger.error('Error fetching questions:', error);
      throw error;
    }
  }

  /**
   * Update a question
   * @param {string} id - Question ID
   * @param {object} data - Updated question data
   * @returns {Promise<object>} Updated question record
   */
  async updateQuestion(id, data) {
    try {
      if (!id) {
        throw new Error('Question ID is required');
      }

      const question = await pb.collection('questions').update(id, data, {
        expand: 'createdBy',
      });

      logger.info(`Question updated: ${id}`);

      return question;
    } catch (error) {
      if (error.status === 404) {
        logger.warn(`Question ${id} not found`);
        const err = new Error('Question not found');
        err.statusCode = 404;
        throw err;
      }
      logger.error(`Error updating question ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a question
   * @param {string} id - Question ID
   * @returns {Promise<void>}
   */
  async deleteQuestion(id) {
    try {
      if (!id) {
        throw new Error('Question ID is required');
      }

      await pb.collection('questions').delete(id);

      logger.info(`Question deleted: ${id}`);
    } catch (error) {
      if (error.status === 404) {
        logger.warn(`Question ${id} not found`);
        const err = new Error('Question not found');
        err.statusCode = 404;
        throw err;
      }
      logger.error(`Error deleting question ${id}:`, error);
      throw error;
    }
  }

  /**
   * Parse CSV data and create multiple questions
   * @param {string} csvData - CSV string with question data
   * @param {string} userId - User ID of bulk uploader
   * @returns {Promise<Array>} Array of created question records
   */
  async bulkUploadQuestions(csvData, userId) {
    try {
      if (!csvData || typeof csvData !== 'string') {
        throw new Error('CSV data is required');
      }

      if (!userId) {
        throw new Error('User ID is required');
      }

      // Parse CSV
      const lines = csvData.trim().split('\n');
      if (lines.length < 2) {
        throw new Error('CSV must contain header and at least one data row');
      }

      // Parse header
      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const requiredHeaders = ['title', 'questiontext', 'questiontype', 'correctanswer', 'difficulty', 'subject'];
      const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));

      if (missingHeaders.length > 0) {
        throw new Error(`Missing required CSV headers: ${missingHeaders.join(', ')}`);
      }

      // Parse data rows
      const createdQuestions = [];
      const errors = [];

      for (let i = 1; i < lines.length; i++) {
        try {
          const values = lines[i].split(',').map((v) => v.trim());
          const row = {};

          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });

          // Validate required fields
          if (!row.title || !row.questiontext || !row.questiontype || !row.correctanswer || !row.difficulty || !row.subject) {
            errors.push(`Row ${i + 1}: Missing required fields`);
            continue;
          }

          // Parse options if present
          const optionsIndex = headers.indexOf('options');
          let options = [];
          if (optionsIndex !== -1 && values[optionsIndex]) {
            options = values[optionsIndex].split('|').map((o) => o.trim());
          }

          // Create question
          const question = await this.createQuestion(
            {
              title: row.title,
              questionText: row.questiontext,
              questionType: row.questiontype,
              correctAnswer: row.correctanswer,
              difficulty: row.difficulty,
              subject: row.subject,
              ...(options.length > 0 && { options }),
            },
            userId,
          );

          createdQuestions.push(question);
        } catch (error) {
          errors.push(`Row ${i + 1}: ${error.message}`);
        }
      }

      if (errors.length > 0) {
        logger.warn(`Bulk upload completed with errors: ${errors.join('; ')}`);
      }

      logger.info(`Bulk uploaded ${createdQuestions.length} questions by user ${userId}`);

      return {
        created: createdQuestions,
        errors,
        total: createdQuestions.length,
      };
    } catch (error) {
      logger.error('Error bulk uploading questions:', error);
      throw error;
    }
  }
}

export default new QuestionService();
