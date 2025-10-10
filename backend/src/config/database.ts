import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/index.js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Service role client for admin operations
export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Anon client for user operations
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Database helper functions
export class DatabaseService {
  /**
   * Get user by ID with profile information
   */
  static async getUserById(userId: string) {
    const { data: user, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (error || !user.user) {
      throw new Error('User not found');
    }

    // Get user profile from custom table
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    return {
      id: user.user.id,
      email: user.user.email!,
      role: user.user.user_metadata?.role || 'rescue_team_member',
      profile,
      created_at: user.user.created_at,
      updated_at: user.user.updated_at
    };
  }

  /**
   * Get user's teams
   */
  static async getUserTeams(userId: string) {
    const { data, error } = await supabaseAdmin
      .from('team_members')
      .select(`
        team_id,
        role,
        status,
        joined_at,
        teams (
          id,
          name,
          description,
          created_at
        )
      `)
      .eq('user_id', userId);

    if (error) {
      throw new Error('Failed to fetch user teams');
    }

    return data;
  }

  /**
   * Get team members with user details
   */
  static async getTeamMembers(teamId: string) {
    const { data, error } = await supabaseAdmin
      .from('team_members')
      .select(`
        id,
        role,
        status,
        joined_at,
        user_id
      `)
      .eq('team_id', teamId);

    if (error) {
      throw new Error('Failed to fetch team members');
    }

    // Get user details for each member
    const membersWithUsers = await Promise.all(
      data.map(async (member) => {
        const user = await this.getUserById(member.user_id);
        return {
          ...member,
          user
        };
      })
    );

    return membersWithUsers;
  }

  /**
   * Get team messages with sender information
   */
  static async getTeamMessages(teamId: string, limit: number = 50, offset: number = 0) {
    const { data, error } = await supabaseAdmin
      .from('messages')
      .select(`
        id,
        team_id,
        mission_id,
        sender_id,
        content,
        is_encrypted,
        created_at
      `)
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error('Failed to fetch messages');
    }

    // Get sender information for each message
    const messagesWithSenders = await Promise.all(
      data.map(async (message) => {
        const user = await this.getUserById(message.sender_id);
        return {
          ...message,
          sender: {
            id: user.id,
            email: user.email,
            profile: user.profile
          }
        };
      })
    );

    return messagesWithSenders;
  }

  /**
   * Get mission details with team and creator information
   */
  static async getMissionDetails(missionId: string) {
    const { data: mission, error } = await supabaseAdmin
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
      .eq('id', missionId)
      .single();

    if (error || !mission) {
      throw new Error('Mission not found');
    }

    // Get team information
    const { data: team } = await supabaseAdmin
      .from('teams')
      .select('*')
      .eq('id', mission.team_id)
      .single();

    // Get creator information
    const createdByUser = mission.created_by ? await this.getUserById(mission.created_by) : null;

    // Get team members
    const teamMembers = await this.getTeamMembers(mission.team_id);

    return {
      ...mission,
      team,
      created_by_user: createdByUser,
      team_members: teamMembers
    };
  }

  /**
   * Get user notifications
   */
  static async getUserNotifications(userId: string, limit: number = 20, offset: number = 0) {
    const { data, error } = await supabaseAdmin
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
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error('Failed to fetch notifications');
    }

    return data;
  }

  /**
   * Create a new notification
   */
  static async createNotification(notification: {
    user_id: string;
    type: 'message' | 'status_change' | 'mission_update' | 'alert';
    title: string;
    content?: string;
  }) {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert(notification)
      .select()
      .single();

    if (error) {
      throw new Error('Failed to create notification');
    }

    return data;
  }

  /**
   * Mark notification as read
   */
  static async markNotificationAsRead(notificationId: string, userId: string) {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error('Failed to update notification');
    }

    return data;
  }

  /**
   * Check if user is team member
   */
  static async isTeamMember(userId: string, teamId: string): Promise<boolean> {
    const { data, error } = await supabaseAdmin
      .from('team_members')
      .select('id')
      .eq('user_id', userId)
      .eq('team_id', teamId)
      .single();

    return !error && !!data;
  }

  /**
   * Check if user is team leader
   */
  static async isTeamLeader(userId: string, teamId: string): Promise<boolean> {
    const { data, error } = await supabaseAdmin
      .from('team_members')
      .select('role')
      .eq('user_id', userId)
      .eq('team_id', teamId)
      .single();

    return !error && data?.role === 'leader';
  }
}
