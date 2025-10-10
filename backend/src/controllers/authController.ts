import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/database.js';
import { JWTService } from '../utils/jwt.js';
import { EncryptionService } from '../utils/encryption.js';
import { DatabaseService } from '../config/database.js';
import { AuthenticatedRequest, LoginRequest, RegisterRequest, ApiResponse } from '../types/index.js';

export class AuthController {
  /**
   * User login
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password }: LoginRequest = req.body;

      // Authenticate with Supabase
      const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
        email,
        password
      });

      if (authError || !authData.user) {
        res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
        return;
      }

      // Get user profile
      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('user_id', authData.user.id)
        .single();

      const user = {
        id: authData.user.id,
        email: authData.user.email!,
        role: authData.user.user_metadata?.role || 'rescue_team_member',
        profile,
        created_at: authData.user.created_at,
        updated_at: authData.user.updated_at
      };

      // Generate tokens
      const accessToken = JWTService.generateToken(user);
      const refreshToken = JWTService.generateRefreshToken(user.id);

      // Update last login
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...authData.user.user_metadata,
          last_login: new Date().toISOString()
        }
      });

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            profile: user.profile
          },
          accessToken,
          refreshToken
        },
        message: 'Login successful'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Login failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * User registration
   */
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, role, profile }: RegisterRequest = req.body;

      // Check if user already exists
      const { data: existingUser } = await supabaseAdmin.auth.admin.getUserByEmail(email);
      if (existingUser.user) {
        res.status(409).json({
          success: false,
          error: 'User already exists'
        });
        return;
      }

      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        user_metadata: {
          role,
          created_at: new Date().toISOString()
        },
        email_confirm: true // Auto-confirm for military/rescue teams
      });

      if (authError || !authData.user) {
        res.status(400).json({
          success: false,
          error: 'Registration failed',
          message: authError?.message || 'Unknown error'
        });
        return;
      }

      // Create user profile
      const { error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          user_id: authData.user.id,
          ...profile
        });

      if (profileError) {
        // Rollback user creation if profile creation fails
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        res.status(400).json({
          success: false,
          error: 'Profile creation failed',
          message: profileError.message
        });
        return;
      }

      const user = {
        id: authData.user.id,
        email: authData.user.email!,
        role,
        profile,
        created_at: authData.user.created_at,
        updated_at: authData.user.updated_at
      };

      // Generate tokens
      const accessToken = JWTService.generateToken(user);
      const refreshToken = JWTService.generateRefreshToken(user.id);

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            profile: user.profile
          },
          accessToken,
          refreshToken
        },
        message: 'Registration successful'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Registration failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Refresh access token
   */
  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          error: 'Refresh token is required'
        });
        return;
      }

      const { userId } = JWTService.verifyRefreshToken(refreshToken);
      const user = await DatabaseService.getUserById(userId);

      const newAccessToken = JWTService.generateToken(user);
      const newRefreshToken = JWTService.generateRefreshToken(userId);

      res.json({
        success: true,
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken
        },
        message: 'Token refreshed successfully'
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        error: 'Token refresh failed',
        message: error instanceof Error ? error.message : 'Invalid refresh token'
      });
    }
  }

  /**
   * User logout
   */
  static async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // In a production environment, you might want to blacklist the token
      // For now, we'll just return success as the client will discard the token
      
      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Logout failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get current user profile
   */
  static async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const user = await DatabaseService.getUserById(req.user.id);

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            profile: user.profile
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch profile',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const { first_name, last_name, rank, department, phone, emergency_contact } = req.body;

      const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .update({
          first_name,
          last_name,
          rank,
          department,
          phone,
          emergency_contact,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', req.user.id)
        .select()
        .single();

      if (error) {
        res.status(400).json({
          success: false,
          error: 'Profile update failed',
          message: error.message
        });
        return;
      }

      res.json({
        success: true,
        data: { profile: data },
        message: 'Profile updated successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Profile update failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Change password
   */
  static async changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const { currentPassword, newPassword } = req.body;

      // Verify current password
      const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
        email: req.user.email,
        password: currentPassword
      });

      if (authError || !authData.user) {
        res.status(400).json({
          success: false,
          error: 'Current password is incorrect'
        });
        return;
      }

      // Update password
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(req.user.id, {
        password: newPassword
      });

      if (updateError) {
        res.status(400).json({
          success: false,
          error: 'Password update failed',
          message: updateError.message
        });
        return;
      }

      res.json({
        success: true,
        message: 'Password updated successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Password update failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Verify token validity
   */
  static async verifyToken(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      const token = JWTService.extractTokenFromHeader(authHeader);
      
      const payload = JWTService.verifyToken(token);
      const user = await DatabaseService.getUserById(payload.userId);

      res.json({
        success: true,
        data: {
          valid: true,
          user: {
            id: user.id,
            email: user.email,
            role: user.role
          }
        }
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        error: 'Token verification failed',
        message: error instanceof Error ? error.message : 'Invalid token'
      });
    }
  }
}
