import { Request, Response, NextFunction } from 'express';
import { JWTService } from '../utils/jwt.js';
import { DatabaseService } from '../config/database.js';
import { AuthenticationError, AuthorizationError } from '../types/index.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
  userId?: string;
}

/**
 * Middleware to authenticate JWT tokens
 */
export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = JWTService.extractTokenFromHeader(authHeader);
    
    const payload = JWTService.verifyToken(token);
    
    // Get user details from database
    const user = await DatabaseService.getUserById(payload.userId);
    
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role
    };
    req.userId = user.id;
    
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Authentication failed',
      message: error instanceof Error ? error.message : 'Invalid token'
    });
  }
};

/**
 * Middleware to check if user has required role
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        message: `Required roles: ${allowedRoles.join(', ')}`
      });
      return;
    }

    next();
  };
};

/**
 * Middleware to check if user is admin
 */
export const requireAdmin = requireRole(['admin']);

/**
 * Middleware to check if user is team member
 */
export const requireTeamMember = (teamIdParam: string = 'teamId') => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const teamId = req.params[teamIdParam];
      if (!teamId) {
        res.status(400).json({
          success: false,
          error: 'Team ID is required'
        });
        return;
      }

      const isMember = await DatabaseService.isTeamMember(req.user.id, teamId);
      if (!isMember) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'You are not a member of this team'
        });
        return;
      }

      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
};

/**
 * Middleware to check if user is team leader
 */
export const requireTeamLeader = (teamIdParam: string = 'teamId') => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const teamId = req.params[teamIdParam];
      if (!teamId) {
        res.status(400).json({
          success: false,
          error: 'Team ID is required'
        });
        return;
      }

      const isLeader = await DatabaseService.isTeamLeader(req.user.id, teamId);
      if (!isLeader) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'Team leader privileges required'
        });
        return;
      }

      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
};

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      next();
      return;
    }

    const token = JWTService.extractTokenFromHeader(authHeader);
    const payload = JWTService.verifyToken(token);
    
    const user = await DatabaseService.getUserById(payload.userId);
    
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role
    };
    req.userId = user.id;
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};
