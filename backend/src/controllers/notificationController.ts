import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/database.js';
import { DatabaseService } from '../config/database.js';
import { AuthenticatedRequest, CreateNotificationRequest, NotificationWithDetails, ApiResponse } from '../types/index.js';

export class NotificationController {
  /**
   * Get user notifications
   */
  static async getUserNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const { page = 1, limit = 20, unreadOnly = false } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      let query = supabaseAdmin
        .from('notifications')
        .select(`
          id,
          user_id,
          type,
          title,
          content,
          read,
          created_at
        `)
        .eq('user_id', req.user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + Number(limit) - 1);

      if (unreadOnly === 'true') {
        query = query.eq('read', false);
      }

      const { data: notifications, error } = await query;

      if (error) {
        res.status(400).json({
          success: false,
          error: 'Failed to fetch notifications',
          message: error.message
        });
        return;
      }

      // Get total count for pagination
      let countQuery = supabaseAdmin
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', req.user.id);

      if (unreadOnly === 'true') {
        countQuery = countQuery.eq('read', false);
      }

      const { count } = await countQuery;
      const totalPages = Math.ceil((count || 0) / Number(limit));

      res.json({
        success: true,
        data: notifications,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: count || 0,
          totalPages
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch notifications',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const { notificationId } = req.params;

      const notification = await DatabaseService.markNotificationAsRead(notificationId, req.user.id);

      res.json({
        success: true,
        data: notification,
        message: 'Notification marked as read'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to mark notification as read',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const { error } = await supabaseAdmin
        .from('notifications')
        .update({ read: true })
        .eq('user_id', req.user.id)
        .eq('read', false);

      if (error) {
        res.status(400).json({
          success: false,
          error: 'Failed to mark notifications as read',
          message: error.message
        });
        return;
      }

      res.json({
        success: true,
        message: 'All notifications marked as read'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to mark notifications as read',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Delete notification
   */
  static async deleteNotification(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const { notificationId } = req.params;

      const { error } = await supabaseAdmin
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', req.user.id);

      if (error) {
        res.status(400).json({
          success: false,
          error: 'Failed to delete notification',
          message: error.message
        });
        return;
      }

      res.json({
        success: true,
        message: 'Notification deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to delete notification',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get notification statistics
   */
  static async getNotificationStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // Get total notifications
      const { count: totalCount } = await supabaseAdmin
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', req.user.id);

      // Get unread notifications
      const { count: unreadCount } = await supabaseAdmin
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', req.user.id)
        .eq('read', false);

      // Get notifications by type
      const { data: notifications } = await supabaseAdmin
        .from('notifications')
        .select('type, read, created_at')
        .eq('user_id', req.user.id);

      const typeCounts = notifications?.reduce((acc, notification) => {
        acc[notification.type] = (acc[notification.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Get recent notifications (last 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const recentCount = notifications?.filter(n => n.created_at > oneDayAgo).length || 0;

      res.json({
        success: true,
        data: {
          total: totalCount || 0,
          unread: unreadCount || 0,
          read: (totalCount || 0) - (unreadCount || 0),
          recent: recentCount,
          typeCounts
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch notification statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Create notification (admin/system use)
   */
  static async createNotification(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // Only admins can create notifications for other users
      if (req.user.role !== 'admin' && req.body.user_id !== req.user.id) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'Only admins can create notifications for other users'
        });
        return;
      }

      const { user_id, type, title, content = '' }: CreateNotificationRequest = req.body;

      const notification = await DatabaseService.createNotification({
        user_id,
        type,
        title,
        content
      });

      res.status(201).json({
        success: true,
        data: notification,
        message: 'Notification created successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to create notification',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Bulk create notifications (for team-wide notifications)
   */
  static async createBulkNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const { teamId, type, title, content = '', excludeUserId } = req.body;

      // Verify user is team member
      const isMember = await DatabaseService.isTeamMember(req.user.id, teamId);
      if (!isMember) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'You are not a member of this team'
        });
        return;
      }

      // Get team members
      const teamMembers = await DatabaseService.getTeamMembers(teamId);
      const targetMembers = teamMembers.filter(member => 
        member.user_id !== excludeUserId && member.user_id !== req.user.id
      );

      // Create notifications for each member
      const notifications = await Promise.all(
        targetMembers.map(member =>
          DatabaseService.createNotification({
            user_id: member.user_id,
            type,
            title,
            content
          })
        )
      );

      res.status(201).json({
        success: true,
        data: {
          created: notifications.length,
          notifications
        },
        message: 'Bulk notifications created successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to create bulk notifications',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
