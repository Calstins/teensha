// middleware/validation.js - COMPLETE VERSION
import { body, param, query, validationResult } from 'express-validator';

// ============================================
// EXPRESS-VALIDATOR RULES
// ============================================

// Common validation rules
export const validateEmail = body('email')
  .isEmail()
  .normalizeEmail()
  .withMessage('Must be a valid email address');

export const validatePassword = body('password')
  .isLength({ min: 6 })
  .withMessage('Password must be at least 6 characters long');

export const validateName = body('name')
  .trim()
  .isLength({ min: 2, max: 50 })
  .withMessage('Name must be between 2 and 50 characters');

export const validateAge = body('age')
  .isInt({ min: 13, max: 19 })
  .withMessage('Age must be between 13 and 19');

export const validateObjectId = (field) =>
  param(field).isMongoId().withMessage(`Invalid ${field} format`);

export const validateYear = (field) =>
  query(field)
    .optional()
    .isInt({ min: 2020, max: 2030 })
    .withMessage('Year must be between 2020 and 2030');

export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];

// Task type validation
export const validateTaskType = body('taskType')
  .isIn(['TEXT', 'IMAGE', 'VIDEO', 'QUIZ', 'FORM', 'PICK_ONE', 'CHECKLIST'])
  .withMessage('Invalid task type');

// Badge status validation
export const validateBadgeStatus = body('status')
  .optional()
  .isIn(['AVAILABLE', 'PURCHASED', 'EARNED'])
  .withMessage('Invalid badge status');

export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }
  next();
};

export const validateSubmissionStatus = [
  body('status')
    .isIn(['APPROVED', 'REJECTED', 'PENDING'])
    .withMessage('Status must be APPROVED, REJECTED, or PENDING'),
  body('score')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Score must be a positive integer'),
  body('reviewNote')
    .optional()
    .isString()
    .withMessage('Review note must be a string'),
];

export const validateChallenge = [
  body('year').isInt({ min: 2024 }).withMessage('Valid year required'),
  body('month').isInt({ min: 1, max: 12 }).withMessage('Valid month required'),
  body('theme').trim().notEmpty().withMessage('Theme is required'),
  body('instructions').trim().notEmpty().withMessage('Instructions required'),
  body('goLiveDate').isISO8601().withMessage('Valid go live date required'),
  body('closingDate').isISO8601().withMessage('Valid closing date required'),
];

export const validateTask = [
  body('challengeId').isMongoId().withMessage('Valid challenge ID required'),
  body('tabName').trim().notEmpty().withMessage('Tab name is required'),
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('taskType')
    .isIn(['TEXT', 'IMAGE', 'VIDEO', 'QUIZ', 'FORM', 'PICK_ONE', 'CHECKLIST'])
    .withMessage('Valid task type required'),
];

// ============================================
// CUSTOM TASK SUBMISSION VALIDATORS
// ============================================

/**
 * Validates TEXT task submission
 * @param {Object|string} content - Already parsed content object or text string
 * @returns {string|null} Error message or null if valid
 */
export const validateTextSubmission = (content) => {
  console.log('📝 validateTextSubmission:', { content, type: typeof content });

  // content can be either the text string directly or an object with text property
  const text = typeof content === 'object' ? content.text : content;

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return 'Text content is required and cannot be empty';
  }

  if (text.trim().length < 10) {
    return 'Text content must be at least 10 characters';
  }

  return null;
};

/**
 * Validates VIDEO task submission
 * @param {Object|string} content - Already parsed content object or URL string
 * @returns {string|null} Error message or null if valid
 */
export const validateVideoSubmission = (content) => {
  console.log('🎥 validateVideoSubmission:', { content, type: typeof content });

  // content can be either the URL string directly or an object with videoUrl property
  const videoUrl = typeof content === 'object' ? content.videoUrl : content;

  if (!videoUrl || typeof videoUrl !== 'string') {
    return 'Video URL is required';
  }

  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
  const vimeoRegex = /^(https?:\/\/)?(www\.)?vimeo\.com\/.+$/;

  if (!youtubeRegex.test(videoUrl) && !vimeoRegex.test(videoUrl)) {
    return 'Please provide a valid YouTube or Vimeo URL';
  }

  return null;
};

/**
 * Detects video platform from URL
 * @param {string} url - Video URL
 * @returns {string} Platform name
 */
export const detectVideoPlatform = (url) => {
  if (!url) return 'unknown';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('vimeo.com')) return 'vimeo';
  return 'unknown';
};

/**
 * Validates QUIZ task submission
 * @param {Object} content - Already parsed content object
 * @param {Object} taskOptions - Task options with questions
 * @returns {string|null} Error message or null if valid
 */
export const validateQuizSubmission = (content, taskOptions) => {
  console.log('🎯 validateQuizSubmission:', { content, taskOptions });

  // content is already parsed, so it's an object
  const answers = content.answers || content;

  if (!answers || typeof answers !== 'object') {
    return 'Quiz answers must be an object';
  }

  if (
    !taskOptions ||
    !taskOptions.questions ||
    !Array.isArray(taskOptions.questions)
  ) {
    return 'Invalid quiz configuration';
  }

  // Check if all questions are answered
  for (const question of taskOptions.questions) {
    if (!answers[question.id]) {
      return `Question "${question.text}" must be answered`;
    }

    // Validate the answer is one of the valid options
    if (question.options && !question.options.includes(answers[question.id])) {
      return `Invalid answer for question "${question.text}"`;
    }
  }

  return null;
};

/**
 * Validates FORM task submission
 * @param {Object} content - Already parsed content object
 * @param {Object} taskOptions - Task options with fields
 * @returns {string|null} Error message or null if valid
 */
export const validateFormSubmission = (content, taskOptions) => {
  console.log('📋 validateFormSubmission:', { content, taskOptions });

  // content is already parsed, so it's an object
  const responses = content.responses || content;

  if (!responses || typeof responses !== 'object') {
    return 'Form responses must be an object';
  }

  if (
    !taskOptions ||
    !taskOptions.fields ||
    !Array.isArray(taskOptions.fields)
  ) {
    return 'Invalid form configuration';
  }

  // Check required fields
  for (const field of taskOptions.fields) {
    if (
      field.required &&
      (!responses[field.id] || responses[field.id].trim() === '')
    ) {
      return `Field "${field.label}" is required`;
    }

    // Validate email fields
    if (field.type === 'email' && responses[field.id]) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(responses[field.id])) {
        return `Please provide a valid email for "${field.label}"`;
      }
    }

    // Validate number fields
    if (field.type === 'number' && responses[field.id]) {
      if (isNaN(responses[field.id])) {
        return `"${field.label}" must be a valid number`;
      }
    }
  }

  return null;
};

/**
 * Validates PICK_ONE task submission
 * @param {Object|string} content - Already parsed content object or option string
 * @param {Object} taskOptions - Task options with available options
 * @returns {string|null} Error message or null if valid
 */
export const validatePickOneSubmission = (content, taskOptions) => {
  console.log('☝️ validatePickOneSubmission:', { content, taskOptions });

  // content is already parsed, so it's an object
  const selectedOption = content.selectedOption || content;

  if (!selectedOption || typeof selectedOption !== 'string') {
    return 'Please select an option';
  }

  if (
    !taskOptions ||
    !taskOptions.options ||
    !Array.isArray(taskOptions.options)
  ) {
    return 'Invalid pick one configuration';
  }

  // Validate that selected option exists
  const validOption = taskOptions.options.find(
    (opt) => opt.id === selectedOption
  );
  if (!validOption) {
    return 'Invalid option selected';
  }

  return null;
};

/**
 * Validates CHECKLIST task submission
 * @param {Object} content - Already parsed content object with checkedItems array
 * @param {Object} taskOptions - Task options with items array
 * @returns {string|null} Error message or null if valid
 */
export const validateChecklistSubmission = (content, taskOptions) => {
  console.log('✅ validateChecklistSubmission called:', {
    content,
    contentType: typeof content,
    hasCheckedItems: 'checkedItems' in content,
    taskOptions,
  });

  // ✅ CRITICAL: content is already parsed, so it's an object with checkedItems property
  const checkedItems = content.checkedItems;

  console.log('✅ Extracted checkedItems:', {
    checkedItems,
    type: typeof checkedItems,
    isArray: Array.isArray(checkedItems),
    length: checkedItems?.length,
  });

  // Validate checkedItems exists
  if (!checkedItems) {
    console.error('❌ No checkedItems found in content');
    return 'Checklist items are required';
  }

  // ✅ CRITICAL: Validate checkedItems is an array
  if (!Array.isArray(checkedItems)) {
    console.error('❌ checkedItems is not an array:', typeof checkedItems);
    return 'Checklist must be an array';
  }

  // Validate array is not empty
  if (checkedItems.length === 0) {
    console.error('❌ checkedItems array is empty');
    return 'Please check at least one item';
  }

  // Validate task options
  if (!taskOptions || !taskOptions.items || !Array.isArray(taskOptions.items)) {
    console.error('❌ Invalid task options:', taskOptions);
    return 'Invalid checklist configuration';
  }

  // Validate all checked items exist in the task options
  const validItemIds = taskOptions.items.map((item) => {
    // Handle different ID field names
    return item.id || item._id || item.itemId;
  });

  console.log('✅ Valid item IDs from options:', validItemIds);

  for (const itemId of checkedItems) {
    if (!validItemIds.includes(itemId)) {
      console.error('❌ Invalid item ID:', itemId);
      return `Invalid checklist item: ${itemId}`;
    }
  }

  console.log('✅ Checklist validation passed');
  return null;
};

/**
 * Validates IMAGE submission files
 * @param {Array} files - Array of uploaded files
 * @returns {string|null} Error message or null if valid
 */
export const validateImageSubmission = (files) => {
  if (!files || files.length === 0) {
    return 'At least one image is required';
  }

  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  for (const file of files) {
    if (file.size > maxSize) {
      return `File ${file.originalname} exceeds maximum size of 5MB`;
    }

    if (!allowedTypes.includes(file.mimetype)) {
      return `File ${file.originalname} has invalid type. Only JPEG, PNG, and WebP are allowed`;
    }
  }

  return null;
};

/**
 * Validates submission score
 * @param {number} score - Score value
 * @param {number} maxScore - Maximum allowed score
 * @returns {string|null} Error message or null if valid
 */
export const validateScore = (score, maxScore) => {
  if (score === null || score === undefined) {
    return null; // Score is optional
  }

  const numScore = parseInt(score);
  if (isNaN(numScore)) {
    return 'Score must be a number';
  }

  if (numScore < 0) {
    return 'Score cannot be negative';
  }

  if (numScore > maxScore) {
    return `Score cannot exceed maximum of ${maxScore}`;
  }

  return null;
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Safely parses JSON content
 * @param {string|Object} content - Content to parse
 * @returns {Object} Parsed content object
 */
export const parseSubmissionContent = (content) => {
  if (typeof content === 'string') {
    try {
      return JSON.parse(content);
    } catch (error) {
      console.error('Failed to parse content:', error);
      throw new Error('Invalid JSON format');
    }
  }
  return content;
};
