import jwt from 'jsonwebtoken';
import type { JWTPayload, User } from '../types/index.js';

export class JWTService {
  private static readonly secret = process.env.JWT_SECRET;
  private static readonly expiresIn = process.env.JWT_EXPIRES_IN || '24h';

  static initialize() {
    if (!this.secret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
  }

  /**
   * Generate a JWT token for a user
   */
  static generateToken(user: User): string {
    if (!this.secret) {
      throw new Error('JWT service not initialized');
    }

    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    return jwt.sign(payload, this.secret, {
      expiresIn: this.expiresIn,
      issuer: 'defence-mission-track',
      audience: 'defence-mission-track-api'
    });
  }

  /**
   * Verify and decode a JWT token
   */
  static verifyToken(token: string): JWTPayload {
    if (!this.secret) {
      throw new Error('JWT service not initialized');
    }

    try {
      const decoded = jwt.verify(token, this.secret, {
        issuer: 'defence-mission-track',
        audience: 'defence-mission-track-api'
      }) as JWTPayload;

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token has expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      } else {
        throw new Error('Token verification failed');
      }
    }
  }

  /**
   * Extract token from Authorization header
   */
  static extractTokenFromHeader(authHeader: string | undefined): string {
    if (!authHeader) {
      throw new Error('Authorization header is required');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new Error('Invalid authorization header format');
    }

    return parts[1];
  }

  /**
   * Generate a refresh token
   */
  static generateRefreshToken(userId: string): string {
    if (!this.secret) {
      throw new Error('JWT service not initialized');
    }

    const payload = {
      userId,
      type: 'refresh'
    };

    return jwt.sign(payload, this.secret, {
      expiresIn: '7d',
      issuer: 'defence-mission-track',
      audience: 'defence-mission-track-api'
    });
  }

  /**
   * Verify a refresh token
   */
  static verifyRefreshToken(token: string): { userId: string } {
    if (!this.secret) {
      throw new Error('JWT service not initialized');
    }

    try {
      const decoded = jwt.verify(token, this.secret, {
        issuer: 'defence-mission-track',
        audience: 'defence-mission-track-api'
      }) as any;

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      return { userId: decoded.userId };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token has expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid refresh token');
      } else {
        throw new Error('Refresh token verification failed');
      }
    }
  }

  /**
   * Decode token without verification (for debugging)
   */
  static decodeToken(token: string): any {
    return jwt.decode(token);
  }

  /**
   * Get token expiration time
   */
  static getTokenExpiration(token: string): Date | null {
    const decoded = this.decodeToken(token);
    if (decoded && decoded.exp) {
      return new Date(decoded.exp * 1000);
    }
    return null;
  }

  /**
   * Check if token is expired
   */
  static isTokenExpired(token: string): boolean {
    const expiration = this.getTokenExpiration(token);
    if (!expiration) return true;
    return expiration < new Date();
  }
}

// Initialize JWT service on module load
JWTService.initialize();
