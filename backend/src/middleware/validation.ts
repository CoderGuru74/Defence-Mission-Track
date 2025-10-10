import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationError } from '../types/index.js';

/**
 * Validation middleware factory
 */
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorMessage = error.details
        .map(detail => detail.message)
        .join(', ');
      
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: errorMessage,
        details: error.details
      });
      return;
    }

    req.body = value;
    next();
  };
};

/**
 * Validation middleware for query parameters
 */
export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorMessage = error.details
        .map(detail => detail.message)
        .join(', ');
      
      res.status(400).json({
        success: false,
        error: 'Query validation failed',
        message: errorMessage,
        details: error.details
      });
      return;
    }

    req.query = value;
    next();
  };
};

/**
 * Validation middleware for URL parameters
 */
export const validateParams = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorMessage = error.details
        .map(detail => detail.message)
        .join(', ');
      
      res.status(400).json({
        success: false,
        error: 'Parameter validation failed',
        message: errorMessage,
        details: error.details
      });
      return;
    }

    req.params = value;
    next();
  };
};

// Common validation schemas
export const schemas = {
  // Authentication schemas
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required()
  }),

  register: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).required()
      .messages({
        'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'
      }),
    role: Joi.string().valid('admin', 'rescue_team_member', 'military_officer').required(),
    profile: Joi.object({
      first_name: Joi.string().min(2).max(50).required(),
      last_name: Joi.string().min(2).max(50).required(),
      rank: Joi.string().max(50).optional(),
      department: Joi.string().max(100).optional(),
      phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).optional(),
      emergency_contact: Joi.string().max(200).optional()
    }).required()
  }),

  // Team schemas
  createTeam: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    description: Joi.string().max(500).optional()
  }),

  updateTeam: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    description: Joi.string().max(500).optional()
  }),

  // Mission schemas
  createMission: Joi.object({
    team_id: Joi.string().uuid().required(),
    title: Joi.string().min(3).max(200).required(),
    description: Joi.string().max(1000).optional(),
    priority: Joi.string().valid('low', 'medium', 'high', 'critical').default('medium')
  }),

  updateMission: Joi.object({
    title: Joi.string().min(3).max(200).optional(),
    description: Joi.string().max(1000).optional(),
    status: Joi.string().valid('planned', 'in_progress', 'completed', 'aborted').optional(),
    priority: Joi.string().valid('low', 'medium', 'high', 'critical').optional()
  }),

  // Message schemas
  sendMessage: Joi.object({
    team_id: Joi.string().uuid().required(),
    mission_id: Joi.string().uuid().optional(),
    content: Joi.string().min(1).max(2000).required(),
    is_encrypted: Joi.boolean().default(true)
  }),

  // User status schemas
  updateUserStatus: Joi.object({
    status: Joi.string().valid('safe', 'need_backup', 'in_progress', 'offline').required()
  }),

  // Notification schemas
  createNotification: Joi.object({
    user_id: Joi.string().uuid().required(),
    type: Joi.string().valid('message', 'status_change', 'mission_update', 'alert').required(),
    title: Joi.string().min(1).max(200).required(),
    content: Joi.string().max(1000).optional()
  }),

  // Pagination schemas
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
  }),

  // UUID parameter schema
  uuidParam: Joi.object({
    id: Joi.string().uuid().required()
  }),

  // Team ID parameter schema
  teamIdParam: Joi.object({
    teamId: Joi.string().uuid().required()
  }),

  // Mission ID parameter schema
  missionIdParam: Joi.object({
    missionId: Joi.string().uuid().required()
  })
};

/**
 * Custom validation for encrypted messages
 */
export const validateEncryptedMessage = (req: Request, res: Response, next: NextFunction): void => {
  if (req.body.is_encrypted) {
    const encryptedSchema = Joi.object({
      content: Joi.object({
        content: Joi.string().required(),
        encryptionKey: Joi.string().required(),
        iv: Joi.string().required(),
        tag: Joi.string().required()
      }).required()
    });

    const { error } = encryptedSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        error: 'Invalid encrypted message format',
        message: error.details.map(detail => detail.message).join(', ')
      });
      return;
    }
  }

  next();
};

/**
 * Sanitize input to prevent XSS
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  const sanitize = (obj: any): any => {
    if (typeof obj === 'string') {
      return obj
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        sanitized[key] = sanitize(obj[key]);
      }
      return sanitized;
    }
    
    return obj;
  };

  req.body = sanitize(req.body);
  req.query = sanitize(req.query);
  next();
};
