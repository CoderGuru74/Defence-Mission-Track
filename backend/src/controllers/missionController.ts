import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/database.js';
import { DatabaseService } from '../config/database.js';
import { AuthenticatedRequest, CreateMissionRequest, UpdateMissionRequest, MissionWithDetails, ApiResponse } from '../types/index.js';

export class MissionController {
  /**
   * Create a new mission
   */
  static async createMission(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const { team_id, title, description, priority = 'medium' }: CreateMissionRequest = req.body;

      // Verify user is team leader
      const isLeader = await DatabaseService.isTeamLeader(req.user.id, team_id);
      if (!isLeader) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'Only team leaders can create missions'
        });
        return;
      }

      // Create mission
      const { data: mission, error } = await supabaseAdmin
        .from('missions')
        .insert({
          team_id,
          title,
          description: description || '',
          priority,
          created_by: req.user.id,
          status: 'planned'
        })
        .select()
        .single();

      if (error) {
        res.status(400).json({
          success: false,
          error: 'Failed to create mission',
          message: error.message
        });
        return;
      }

      // Get mission details with team and creator info
      const missionDetails = await DatabaseService.getMissionDetails(mission.id);

      // Create notifications for team members
      const teamMembers = await DatabaseService.getTeamMembers(team_id);
      for (const member of teamMembers) {
        await DatabaseService.createNotification({
          user_id: member.user_id,
          type: 'mission_update',
          title: 'New Mission Created',
          content: `New mission "${title}" has been created for your team`
        });
      }

      // Broadcast real-time mission update to team
      const wsService = (req as any).app.locals.wsService;
      if (wsService) {
        wsService.broadcastMissionUpdate(missionDetails, team_id);
      }

      res.status(201).json({
        success: true,
        data: missionDetails,
        message: 'Mission created successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to create mission',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get mission details
   */
  static async getMission(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const { missionId } = req.params;

      const missionDetails = await DatabaseService.getMissionDetails(missionId);

      // Verify user is team member
      const isMember = await DatabaseService.isTeamMember(req.user.id, missionDetails.team_id);
      if (!isMember) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'You are not a member of this team'
        });
        return;
      }

      res.json({
        success: true,
        data: missionDetails
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch mission',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get missions for a team
   */
  static async getTeamMissions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const { teamId } = req.params;
      const { page = 1, limit = 20, status, priority } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

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

      // Build query
      let query = supabaseAdmin
        .from('missions')
        .select(`
          id,
          team_id,
          title,
          description,
          status,
          priority,
          created_by,
          created_at,
          updated_at
        `)
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })
        .range(offset, offset + Number(limit) - 1);

      // Apply filters
      if (status) {
        query = query.eq('status', status);
      }
      if (priority) {
        query = query.eq('priority', priority);
      }

      const { data: missions, error } = await query;

      if (error) {
        res.status(400).json({
          success: false,
          error: 'Failed to fetch missions',
          message: error.message
        });
        return;
      }

      // Get total count for pagination
      let countQuery = supabaseAdmin
        .from('missions')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId);

      if (status) {
        countQuery = countQuery.eq('status', status);
      }
      if (priority) {
        countQuery = countQuery.eq('priority', priority);
      }

      const { count } = await countQuery;
      const totalPages = Math.ceil((count || 0) / Number(limit));

      res.json({
        success: true,
        data: missions,
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
        error: 'Failed to fetch team missions',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Update mission
   */
  static async updateMission(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const { missionId } = req.params;
      const { title, description, status, priority }: UpdateMissionRequest = req.body;

      // Get mission details
      const missionDetails = await DatabaseService.getMissionDetails(missionId);

      // Verify user is team leader
      const isLeader = await DatabaseService.isTeamLeader(req.user.id, missionDetails.team_id);
      if (!isLeader) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'Only team leaders can update missions'
        });
        return;
      }

      // Update mission
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (status !== undefined) updateData.status = status;
      if (priority !== undefined) updateData.priority = priority;

      const { data: updatedMission, error } = await supabaseAdmin
        .from('missions')
        .update(updateData)
        .eq('id', missionId)
        .select()
        .single();

      if (error) {
        res.status(400).json({
          success: false,
          error: 'Failed to update mission',
          message: error.message
        });
        return;
      }

      // Create notifications for status changes
      if (status && status !== missionDetails.status) {
        const teamMembers = await DatabaseService.getTeamMembers(missionDetails.team_id);
        for (const member of teamMembers) {
          await DatabaseService.createNotification({
            user_id: member.user_id,
            type: 'mission_update',
            title: 'Mission Status Updated',
            content: `Mission "${updatedMission.title}" status changed to ${status}`
          });
        }
      }

      // Get updated mission details
      const updatedMissionDetails = await DatabaseService.getMissionDetails(missionId);

      // Broadcast real-time mission update to team
      const wsService = (req as any).app.locals.wsService;
      if (wsService) {
        wsService.broadcastMissionUpdate(updatedMissionDetails, missionDetails.team_id);
      }

      res.json({
        success: true,
        data: updatedMissionDetails,
        message: 'Mission updated successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to update mission',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Delete mission
   */
  static async deleteMission(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const { missionId } = req.params;

      // Get mission details
      const missionDetails = await DatabaseService.getMissionDetails(missionId);

      // Verify user is team leader
      const isLeader = await DatabaseService.isTeamLeader(req.user.id, missionDetails.team_id);
      if (!isLeader) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'Only team leaders can delete missions'
        });
        return;
      }

      // Delete mission
      const { error } = await supabaseAdmin
        .from('missions')
        .delete()
        .eq('id', missionId);

      if (error) {
        res.status(400).json({
          success: false,
          error: 'Failed to delete mission',
          message: error.message
        });
        return;
      }

      res.json({
        success: true,
        message: 'Mission deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to delete mission',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get mission statistics
   */
  static async getMissionStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const { teamId } = req.params;

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

      // Get mission statistics
      const { data: missions, error } = await supabaseAdmin
        .from('missions')
        .select('status, priority, created_at')
        .eq('team_id', teamId);

      if (error) {
        res.status(400).json({
          success: false,
          error: 'Failed to fetch mission statistics',
          message: error.message
        });
        return;
      }

      const totalMissions = missions.length;
      const statusCounts = missions.reduce((acc, mission) => {
        acc[mission.status] = (acc[mission.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const priorityCounts = missions.reduce((acc, mission) => {
        acc[mission.priority] = (acc[mission.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Get recent missions (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const recentMissions = missions.filter(m => m.created_at > thirtyDaysAgo).length;

      // Get active missions
      const activeMissions = missions.filter(m => m.status === 'in_progress').length;

      res.json({
        success: true,
        data: {
          totalMissions,
          activeMissions,
          recentMissions,
          statusCounts,
          priorityCounts,
          completionRate: totalMissions > 0 ? (statusCounts.completed || 0) / totalMissions * 100 : 0
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch mission statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Assign mission to team member
   */
  static async assignMission(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const { missionId } = req.params;
      const { userId } = req.body;

      // Get mission details
      const missionDetails = await DatabaseService.getMissionDetails(missionId);

      // Verify user is team leader
      const isLeader = await DatabaseService.isTeamLeader(req.user.id, missionDetails.team_id);
      if (!isLeader) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'Only team leaders can assign missions'
        });
        return;
      }

      // Verify target user is team member
      const isMember = await DatabaseService.isTeamMember(userId, missionDetails.team_id);
      if (!isMember) {
        res.status(400).json({
          success: false,
          error: 'Invalid assignment',
          message: 'User is not a member of this team'
        });
        return;
      }

      // Create assignment record (you might want to add a mission_assignments table)
      // For now, we'll create a notification
      await DatabaseService.createNotification({
        user_id: userId,
        type: 'mission_update',
        title: 'Mission Assignment',
        content: `You have been assigned to mission "${missionDetails.title}"`
      });

      res.json({
        success: true,
        message: 'Mission assigned successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to assign mission',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
