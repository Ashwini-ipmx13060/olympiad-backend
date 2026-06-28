/**
 * ResultsService.js
 * Handles all test result-related database operations.
 * Methods: start test, submit answer, submit test, get results, calculate score
 * Used by: results.js routes
 * Dependencies: pocketbaseClient, logger
 */

import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';

class ResultsService {
  /**
   * Start a test for a student
   * @param {string} testId - Test ID
   * @param {string} studentId - Student user ID
   * @returns {Promise<object>} Created test result record
   */
  async startTest(testId, studentId) {
    try {
      if (!testId) {
        throw new Error('Test ID is required');
      }

      if (!studentId) {
        throw new Error('Student ID is required');
      }

      const result = await pb.collection('testResults').create({
        testId,
        studentId,
        status: 'in-progress',
        startedAt: new Date().toISOString(),
        answers: {},
      });

      logger.info(`Test started: ${testId} by student ${studentId}`);

      return result;
    } catch (error) {
      logger.error('Error starting test:', error);
      throw error;
    }
  }

  /**
   * Submit an answer to a question
   * @param {string} resultId - Test result ID
   * @param {string} questionId - Question ID
   * @param {string} answer - Student's answer
   * @returns {Promise<object>} Updated test result record
   */
  async submitAnswer(resultId, questionId, answer) {
    try {
      if (!resultId) {
        throw new Error('Result ID is required');
      }

      if (!questionId) {
        throw new Error('Question ID is required');
      }

      if (answer === undefined || answer === null) {
        throw new Error('Answer is required');
      }

      // Fetch current result
      const result = await pb.collection('testResults').getOne(resultId);

      // Update answers
      const answers = result.answers || {};
      answers[questionId] = answer;

      // Update result
      const updatedResult = await pb.collection('testResults').update(resultId, {
        answers,
      }, {
        expand: 'testId,studentId',
      });

      logger.info(`Answer submitted for question ${questionId} in result ${resultId}`);

      return updatedResult;
    } catch (error) {
      if (error.status === 404) {
        logger.warn(`Result ${resultId} not found`);
        const err = new Error('Test result not found');
        err.statusCode = 404;
        throw err;
      }
      logger.error('Error submitting answer:', error);
      throw error;
    }
  }

  /**
   * Submit a test (mark as completed)
   * @param {string} resultId - Test result ID
   * @returns {Promise<object>} Updated test result record
   */
  async submitTest(resultId) {
    try {
      if (!resultId) {
        throw new Error('Result ID is required');
      }

      // Fetch current result
      const result = await pb.collection('testResults').getOne(resultId);

      if (result.status === 'submitted') {
        throw new Error('Test already submitted');
      }

      // Calculate duration in minutes
      const startedAt = new Date(result.startedAt).getTime();
      const submittedAt = Date.now();
      const duration = Math.round((submittedAt - startedAt) / 60000);

      // Update result
      const updatedResult = await pb.collection('testResults').update(resultId, {
        status: 'submitted',
        submittedAt: new Date().toISOString(),
        duration,
      }, {
        expand: 'testId,studentId',
      });

      logger.info(`Test submitted: ${resultId}`);

      return updatedResult;
    } catch (error) {
      if (error.status === 404) {
        logger.warn(`Result ${resultId} not found`);
        const err = new Error('Test result not found');
        err.statusCode = 404;
        throw err;
      }
      logger.error('Error submitting test:', error);
      throw error;
    }
  }

  /**
   * Get a single test result by ID
   * @param {string} id - Test result ID
   * @returns {Promise<object|null>} Test result record or null if not found
   */
  async getResult(id) {
    try {
      if (!id) {
        throw new Error('Result ID is required');
      }

      const result = await pb.collection('testResults').getOne(id, {
        expand: 'testId,studentId',
      });

      return result;
    } catch (error) {
      if (error.status === 404) {
        logger.warn(`Result ${id} not found`);
        return null;
      }
      logger.error(`Error fetching result ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get all test results for a student
   * @param {string} studentId - Student user ID
   * @returns {Promise<object>} Paginated results with metadata
   */
  async getStudentResults(studentId) {
    try {
      if (!studentId) {
        throw new Error('Student ID is required');
      }

      const result = await pb.collection('testResults').getList(1, 500, {
        filter: `studentId = "${studentId}"`,
        expand: 'testId,studentId',
        sort: '-submittedAt,-startedAt',
      });

      return result;
    } catch (error) {
      logger.error(`Error fetching results for student ${studentId}:`, error);
      throw error;
    }
  }

  /**
   * Get all test results for a test
   * @param {string} testId - Test ID
   * @returns {Promise<object>} Paginated results with metadata
   */
  async getTestResults(testId) {
    try {
      if (!testId) {
        throw new Error('Test ID is required');
      }

      const result = await pb.collection('testResults').getList(1, 500, {
        filter: `testId = "${testId}"`,
        expand: 'testId,studentId',
        sort: '-submittedAt,-startedAt',
      });

      return result;
    } catch (error) {
      logger.error(`Error fetching results for test ${testId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate score for a test result
   * @param {string} resultId - Test result ID
   * @returns {Promise<object>} Updated test result with score
   */
  async calculateScore(resultId) {
    try {
      if (!resultId) {
        throw new Error('Result ID is required');
      }

      // Fetch result with expanded test
      const result = await pb.collection('testResults').getOne(resultId, {
        expand: 'testId,studentId',
      });

      // Fetch test with expanded questions
      const test = await pb.collection('tests').getOne(result.testId, {
        expand: 'questions',
      });

      const answers = result.answers || {};
      const questions = test.expand?.questions || [];

      let correctCount = 0;
      let totalCount = questions.length;

      // Compare answers with correct answers
      questions.forEach((question) => {
        const studentAnswer = answers[question.id];
        if (studentAnswer && studentAnswer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase()) {
          correctCount += 1;
        }
      });

      // Calculate percentage
      const percentage = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

      // Update result with score
      const updatedResult = await pb.collection('testResults').update(resultId, {
        score: correctCount,
        totalScore: totalCount,
        percentage,
      }, {
        expand: 'testId,studentId',
      });

      logger.info(`Score calculated for result ${resultId}: ${correctCount}/${totalCount} (${percentage}%)`);

      return updatedResult;
    } catch (error) {
      if (error.status === 404) {
        logger.warn(`Result ${resultId} not found`);
        const err = new Error('Test result not found');
        err.statusCode = 404;
        throw err;
      }
      logger.error('Error calculating score:', error);
      throw error;
    }
  }
}

export default new ResultsService();
