const { body, validationResult, param } = require('express-validator');

// Middleware pour gérer les erreurs de validation
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }
  next();
};

// Validation pour l'enregistrement
const validateRegister = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email format'),
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain alphanumeric characters, underscores, and hyphens'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[a-zA-Z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character'),
  handleValidationErrors
];

// Validation pour la connexion
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email format'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

// Validation pour les suggestions
const validateSuggestion = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
  body('utility_type')
    .isIn(['smoke', 'flash', 'molotov', 'grenade', 'other'])
    .withMessage('Invalid utility type'),
  handleValidationErrors
];

// Validation pour les points d'utilité
const validateUtilityPoint = [
  body('name')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Name must be between 3 and 100 characters'),
  body('utility_type')
    .isIn(['smoke', 'flash', 'molotov', 'grenade', 'other'])
    .withMessage('Invalid utility type'),
  body('x')
    .isFloat({ min: 0, max: 1024 })
    .withMessage('X coordinate must be between 0 and 1024'),
  body('y')
    .isFloat({ min: 0, max: 1024 })
    .withMessage('Y coordinate must be between 0 and 1024'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  body('team')
    .optional()
    .isIn(['t', 'ct'])
    .withMessage('Team must be either t or ct'),
  handleValidationErrors
];

// Validation pour les cartes
const validateMap = [
  param('id')
    .isInt()
    .withMessage('Invalid map ID'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  handleValidationErrors
];

const validateClip = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),
  body('map_id')
    .isInt({ min: 1 })
    .withMessage('Invalid map ID'),
  body('utility_type')
    .isIn(['smoke', 'flash', 'molotov', 'grenade', 'other'])
    .withMessage('Invalid utility type'),
  handleValidationErrors
];

// Validation pour les IDs
const validateId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid ID format'),
  handleValidationErrors
];

const validateMapAndPointId = [
  param('mapId')
    .isInt({ min: 1 })
    .withMessage('Invalid map ID'),
  param('pointId')
    .isInt({ min: 1 })
    .withMessage('Invalid point ID'),
  handleValidationErrors
];

module.exports = {
  validateRegister,
  validateLogin,
  validateSuggestion,
  validateUtilityPoint,
  validateMap,
  validateId,
  validateMapAndPointId,
  handleValidationErrors
};
