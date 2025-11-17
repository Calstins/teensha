// middleware/validation.js
import { validationResult } from 'express-validator';

export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((error) => ({
        field: error.path,
        message: error.msg,
        value: error.value,
      })),
    });
  }

  next();
};

export function validateTextSubmission(content) {
  if (!content || typeof content !== 'string') {
    return 'Text content is required';
  }
  if (content.trim().length < 10) {
    return 'Text must be at least 10 characters long';
  }
  if (content.length > 5000) {
    return 'Text must not exceed 5000 characters';
  }
  return null;
}

export function validateVideoSubmission(content) {
  if (!content || typeof content !== 'string') {
    return 'Video URL is required';
  }

  const videoUrlPattern =
    /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com)\/.+$/i;

  if (!videoUrlPattern.test(content)) {
    return 'Invalid video URL. Must be from YouTube, Vimeo, or Dailymotion';
  }

  return null;
}

export function detectVideoPlatform(url) {
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return 'YouTube';
  }
  if (url.includes('vimeo.com')) {
    return 'Vimeo';
  }
  if (url.includes('dailymotion.com')) {
    return 'Dailymotion';
  }
  return 'Unknown';
}

export function validateQuizSubmission(content, taskOptions) {
  if (!content) {
    return 'Quiz answers are required';
  }

  let answers;
  try {
    answers = JSON.parse(content);
  } catch (e) {
    return 'Invalid quiz answers format';
  }

  if (!Array.isArray(answers)) {
    return 'Quiz answers must be an array';
  }

  const questions = taskOptions?.questions || [];
  if (answers.length !== questions.length) {
    return `Expected ${questions.length} answers, got ${answers.length}`;
  }

  // Validate each answer has required fields
  for (let i = 0; i < answers.length; i++) {
    if (!answers[i].questionId || answers[i].answer === undefined) {
      return `Answer ${i + 1} is incomplete`;
    }
  }

  return null;
}

export function validateFormSubmission(content, taskOptions) {
  if (!content) {
    return 'Form responses are required';
  }

  let responses;
  try {
    responses = JSON.parse(content);
  } catch (e) {
    return 'Invalid form responses format';
  }

  if (typeof responses !== 'object' || Array.isArray(responses)) {
    return 'Form responses must be an object';
  }

  const fields = taskOptions?.fields || [];
  const requiredFields = fields.filter((f) => f.required);

  // Check all required fields are present
  for (const field of requiredFields) {
    if (!responses[field.id] || responses[field.id].trim() === '') {
      return `Field "${field.label}" is required`;
    }
  }

  return null;
}

export function validatePickOneSubmission(content, taskOptions) {
  if (!content) {
    return 'Selection is required';
  }

  const options = taskOptions?.options || [];
  const validOptions = options.map((opt) => opt.id || opt.value);

  if (!validOptions.includes(content)) {
    return 'Invalid option selected';
  }

  return null;
}

export function validateChecklistSubmission(content, taskOptions) {
  if (!content) {
    return 'Checklist items are required';
  }

  let checkedItems;
  try {
    checkedItems = JSON.parse(content);
  } catch (e) {
    return 'Invalid checklist format';
  }

  if (!Array.isArray(checkedItems)) {
    return 'Checklist must be an array';
  }

  const items = taskOptions?.items || [];
  const requiredItems = items.filter((item) => item.required);

  // Check all required items are checked
  for (const item of requiredItems) {
    if (!checkedItems.includes(item.id)) {
      return `Required item "${item.text}" must be checked`;
    }
  }

  return null;
}
