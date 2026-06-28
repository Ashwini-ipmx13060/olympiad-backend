/**
 * TestService.js
 * Handles all test-related database operations.
 * Methods: create, read, update, delete, list, publish, add/remove questions
 * Used by: tests.js routes
 * Dependencies: pocketbaseClient, logger
 */

import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';

class TestService {
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

    if (filters.status) {
      conditions.push(`status = "${filters.status}"`);
    }

    return conditions.length > 0 ? conditions.join(' && ') : '';
  }

  /**
   * Create a new test
   * @param {object} data - Test data
   * @param {string} userId - User ID of test creator
   * @returns {Promise<object>} Created test record
   */
  async createTest(data, userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const testData = {
        ...data,
        createdBy: userId,
        status: 'draft',
      };

      const test = await pb.collection('tests').create(testData);

      logger.info(`Test created: ${test.id} by user ${userId}`);

      return test;
    } catch (error) {
      logger.error('Error creating test:', error);
      throw error;
    }
  }

  /**
   * Get a single test by ID
   * @param {string} id - Test ID
   * @returns {Promise<object|null>} Test record or null if not found
   */
  async getTest(id) {
    try {
      if (!id) {
        throw new Error('Test ID is required');
      }

      const test = await pb.collection('tests').getOne(id, {
        expand: 'questions,createdBy',
      });

      return test;
    } catch (error) {
      if (error.status === 404) {
        logger.warn(`Test ${id} not found`);
        return null;
      }
      logger.error(`Error fetching test ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get all tests with optional filters
   * @param {object} filters - Filter criteria (subject, status)
   * @param {number} page - Page number (default: 1)
   * @param {number} pageSize - Items per page (default: 50)
   * @returns {Promise<object>} Paginated tests with metadata
   */
  async getAllTests(filters = {}, page = 1, pageSize = 50) {
    try {
      const filterString = this.buildFilterString(filters);

      const result = await pb.collection('tests').getList(page, pageSize, {
        filter: filterString,
        expand: 'questions,createdBy',
        sort: '-created',
      });

      return result;
    } catch (error) {
      logger.error('Error fetching tests:', error);
      throw error;
    }
  }

  /**
   * Update a test
   * @param {string} id - Test ID
   * @param {object} data - Updated test data
   * @returns {Promise<object>} Updated test record
   */
  async updateTest(id, data) {
    try {
      if (!id) {
        throw new Error('Test ID is required');
      }

      const test = await pb.collection('tests').update(id, data, {
        expand: 'questions,createdBy',
      });

      logger.info(`Test updated: ${id}`);

      return test;
    } catch (error) {
      if (error.status === 404) {
        logger.warn(`Test ${id} not found`);
        const err = new Error('Test not found');
        err.statusCode = 404;
        throw err;
      }
      logger.error(`Error updating test ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a test
   * @param {string} id - Test ID
   * @returns {Promise<void>}
   */
  async deleteTest(id) {
    try {
      if (!id) {
        throw new Error('Test ID is required');
      }

      await pb.collection('tests').delete(id);

      logger.info(`Test deleted: ${id}`);
    } catch (error) {
      if (error.status === 404) {
        logger.warn(`Test ${id} not found`);
        const err = new Error('Test not found');
        err.statusCode = 404;
        throw err;
      }
      logger.error(`Error deleting test ${id}:`, error);
      throw error;
    }
  }

  /**
   * Publish a test (change status from draft to published)
   * @param {string} id - Test ID
   * @returns {Promise<object>} Updated test record
   */
  async publishTest(id) {
    try {
      if (!id) {
        throw new Error('Test ID is required');
      }

      const test = await pb.collection('tests').update(
        id,
        { status: 'published' },
        {
          expand: 'questions,createdBy',
        },
      );

      logger.info(`Test published: ${id}`);

      return test;
    } catch (error) {
      if (error.status === 404) {
        logger.warn(`Test ${id} not found`);
        const err = new Error('Test not found');
        err.statusCode = 404;
        throw err;
      }
      logger.error(`Error publishing test ${id}:`, error);
      throw error;
    }
  }

  /**
   * Add questions to a test
   * @param {string} testId - Test ID
   * @param {Array<string>} questionIds - Array of question IDs to add
   * @returns {Promise<object>} Updated test record
   */
  async addQuestionsToTest(testId, questionIds) {
    try {
      if (!testId) {
        throw new Error('Test ID is required');
      }

      if (!Array.isArray(questionIds) || questionIds.length === 0) {
        throw new Error('Question IDs array is required and must not be empty');
      }

      // Get current test to get existing questions
      const test = await pb.collection('tests').getOne(testId);
      const currentQuestions = test.questions || [];

      // Merge with new questions (avoid duplicates)
      const mergedQuestions = [...new Set([...currentQuestions, ...questionIds])];

      // Update test with merged questions
      const updatedTest = await pb.collection('tests').update(
        testId,
        { questions: mergedQuestions },
        {
          expand: 'questions,createdBy',
        },
      );

      logger.info(`Added ${questionIds.length} questions to test ${testId}`);

      return updatedTest;
    } catch (error) {
      if (error.status === 404) {
        logger.warn(`Test ${testId} not found`);
        const err = new Error('Test not found');
        err.statusCode = 404;
        throw err;
      }
      logger.error(`Error adding questions to test ${testId}:`, error);
      throw error;
    }
  }

  /**
   * Remove a question from a test
   * @param {string} testId - Test ID
   * @param {string} questionId - Question ID to remove
   * @returns {Promise<object>} Updated test record
   */
  async removeQuestionFromTest(testId, questionId) {
    try {
      if (!testId) {
        throw new Error('Test ID is required');
      }

      if (!questionId) {
        throw new Error('Question ID is required');
      }

      // Get current test
      const test = await pb.collection('tests').getOne(testId);
      const currentQuestions = test.questions || [];

      // Remove the question
      const updatedQuestions = currentQuestions.filter((id) => id !== questionId);

      // Update test
      const updatedTest = await pb.collection('tests').update(
        testId,
        { questions: updatedQuestions },
        {
          expand: 'questions,createdBy',
        },
      );

      logger.info(`Removed question ${questionId} from test ${testId}`);

      return updatedTest;
    } catch (error) {
      if (error.status === 404) {
        logger.warn(`Test ${testId} not found`);
        const err = new Error('Test not found');
        err.statusCode = 404;
        throw err;
      }
      logger.error(`Error removing question from test ${testId}:`, error);
      throw error;
    }
  }
}

export default new TestService();
