import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/database.js';
import { DatabaseService } from '../config/database.js';
import { AuthenticatedRequest, CreateTeamRequest, UpdateUserStatusRequest, TeamWithMembers, ApiResponse } from '../types/index.js';

export class TeamController {
  /**
   * Create a new team
   */
  static async createTeam(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const { name, description = '' }: CreateTeamRequest = req.body;

      // Create team
      const { data: team, error } = await supabaseAdmin
        .from('teams')
        .insert({
          name,
          description
        })
        .select()
        .single();

      if (error) {
        res.status(400).json({
          success: false,
          error: 'Failed to create team',
          message: error.message
        });
        return;
      }

      // Add creator as team leader
      const { error: memberError } = await supabaseAdmin
        .from('team_members')
        .insert({
          team_id: team.id,
          user_id: req.user.id,
          role: 'leader',
          status: 'offline'
        });

      if (memberError) {
        // Rollback team creation
        await supabaseAdmin.from('teams').delete().eq('id', team.id);
        res.status(400).json({
          success: false,
          error: 'Failed to add team leader',
          message: memberError.message
        });
        return;
      }

      // Get team with members
      const teamWithMembers = await this.getTeamWithMembers(team.id);

      res.status(201).json({
        success: true,
        data: teamWithMembers,
        message: 'Team created successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to create team',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get team details with members
   */
  static async getTeam(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      const teamWithMembers = await this.getTeamWithMembers(teamId);

      res.json({
        success: true,
        data: teamWithMembers
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch team',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get user's teams
   */
  static async getUserTeams(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const userTeams = await DatabaseService.getUserTeams(req.user.id);

      res.json({
        success: true,
        data: userTeams
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user teams',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Add member to team
   */
  static async addTeamMember(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const { teamId } = req.params;
      const { userId, role = 'member' } = req.body;

      // Verify user is team leader
      const isLeader = await DatabaseService.isTeamLeader(req.user.id, teamId);
      if (!isLeader) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'Only team leaders can add members'
        });
        return;
      }

      // Check if user is already a member
      const isAlreadyMember = await DatabaseService.isTeamMember(userId, teamId);
      if (isAlreadyMember) {
        res.status(409).json({
          success: false,
          error: 'User is already a team member'
        });
        return;
      }

      // Add member to team
      const { data: member, error } = await supabaseAdmin
        .from('team_members')
        .insert({
          team_id: teamId,
          user_id: userId,
          role,
          status: 'offline'
        })
        .select()
        .single();

      if (error) {
        res.status(400).json({
          success: false,
          error: 'Failed to add team member',
          message: error.message
        });
        return;
      }

      // Get user details
      const user = await DatabaseService.getUserById(userId);

      // Create notification for the new member
      await DatabaseService.createNotification({
        user_id: userId,
        type: 'alert',
        title: 'Team Invitation',
        content: `You have been added to team "${req.body.teamName || 'Unknown Team'}"`
      });

      res.status(201).json({
        success: true,
        data: {
          ...member,
          user
        },
        message: 'Team member added successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to add team member',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Remove member from team
   */
  static async removeTeamMember(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const { teamId, userId } = req.params;

      // Verify user is team leader or removing themselves
      const isLeader = await DatabaseService.isTeamLeader(req.user.id, teamId);
      const isRemovingSelf = req.user.id === userId;

      if (!isLeader && !isRemovingSelf) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'Only team leaders can remove members or you can leave the team yourself'
        });
        return;
      }

      // Prevent team leader from removing themselves if they're the only leader
      if (isRemovingSelf && isLeader) {
        const { data: leaders } = await supabaseAdmin
          .from('team_members')
          .select('id')
          .eq('team_id', teamId)
          .eq('role', 'leader');

        if (leaders && leaders.length <= 1) {
          res.status(400).json({
            success: false,
            error: 'Cannot leave team',
            message: 'You are the only team leader. Please assign another leader before leaving.'
          });
          return;
        }
      }

      // Remove member from team
      const { error } = await supabaseAdmin
        .from('team_members')
        .delete()
        .eq('team_id', teamId)
        .eq('user_id', userId);

      if (error) {
        res.status(400).json({
          success: false,
          error: 'Failed to remove team member',
          message: error.message
        });
        return;
      }

      res.json({
        success: true,
        message: isRemovingSelf ? 'Left team successfully' : 'Team member removed successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to remove team member',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Update user status
   */
  static async updateUserStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const { teamId } = req.params;
      const { status }: UpdateUserStatusRequest = req.body;

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

      // Update user status
      const { data: updatedMember, error } = await supabaseAdmin
        .from('team_members')
        .update({ status })
        .eq('team_id', teamId)
        .eq('user_id', req.user.id)
        .select()
        .single();

      if (error) {
        res.status(400).json({
          success: false,
          error: 'Failed to update status',
          message: error.message
        });
        return;
      }

      // Create notifications for team members about status change
      const teamMembers = await DatabaseService.getTeamMembers(teamId);
      const user = await DatabaseService.getUserById(req.user.id);
      const userName = user.profile?.first_name || user.email;

      for (const member of teamMembers) {
        if (member.user_id !== req.user.id) {
          await DatabaseService.createNotification({
            user_id: member.user_id,
            type: 'status_change',
            title: 'Team Member Status Update',
            content: `${userName} status changed to ${status}`
          });
        }
      }

      res.json({
        success: true,
        data: updatedMember,
        message: 'Status updated successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to update status',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Update team information
   */
  static async updateTeam(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const { teamId } = req.params;
      const { name, description } = req.body;

      // Verify user is team leader
      const isLeader = await DatabaseService.isTeamLeader(req.user.id, teamId);
      if (!isLeader) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'Only team leaders can update team information'
        });
        return;
      }

      // Update team
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;

      const { data: updatedTeam, error } = await supabaseAdmin
        .from('teams')
        .update(updateData)
        .eq('id', teamId)
        .select()
        .single();

      if (error) {
        res.status(400).json({
          success: false,
          error: 'Failed to update team',
          message: error.message
        });
        return;
      }

      res.json({
        success: true,
        data: updatedTeam,
        message: 'Team updated successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to update team',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get team statistics
   */
  static async getTeamStats(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      // Get team members
      const teamMembers = await DatabaseService.getTeamMembers(teamId);

      // Get missions count
      const { count: missionsCount } = await supabaseAdmin
        .from('missions')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId);

      // Get messages count
      const { count: messagesCount } = await supabaseAdmin
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId);

      // Calculate status distribution
      const statusCounts = teamMembers.reduce((acc, member) => {
        acc[member.status] = (acc[member.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Calculate role distribution
      const roleCounts = teamMembers.reduce((acc, member) => {
        acc[member.role] = (acc[member.role] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      res.json({
        success: true,
        data: {
          totalMembers: teamMembers.length,
          totalMissions: missionsCount || 0,
          totalMessages: messagesCount || 0,
          statusCounts,
          roleCounts,
          onlineMembers: statusCounts.safe + statusCounts.in_progress + statusCounts.need_backup || 0
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch team statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Helper method to get team with members
   */
  private static async getTeamWithMembers(teamId: string): Promise<TeamWithMembers> {
    const { data: team, error } = await supabaseAdmin
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single();

    if (error || !team) {
      throw new Error('Team not found');
    }

    const members = await DatabaseService.getTeamMembers(teamId);

    return {
      ...team,
      members
    };
  }
}
