import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/database.js';
import { EncryptionService } from '../utils/encryption.js';
import { DatabaseService } from '../config/database.js';
import { AuthenticatedRequest, SendMessageRequest, MessageWithSender, ApiResponse } from '../types/index.js';

export class MessageController {
  /**
   * Send a message to a team
   */
  static async sendMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const { team_id, mission_id, content, is_encrypted = true }: SendMessageRequest = req.body;

      // Verify user is team member
      const isMember = await DatabaseService.isTeamMember(req.user.id, team_id);
      if (!isMember) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'You are not a member of this team'
        });
        return;
      }

      let processedContent = content;
      let encryptionData = null;

      // Encrypt message if requested
      if (is_encrypted) {
        const encrypted = EncryptionService.encryptE2E(content);
        processedContent = JSON.stringify(encrypted);
        encryptionData = encrypted;
      }

      // Store message in database
      const { data: message, error } = await supabaseAdmin
        .from('messages')
        .insert({
          team_id,
          mission_id: mission_id || null,
          sender_id: req.user.id,
          content: processedContent,
          is_encrypted
        })
        .select()
        .single();

      if (error) {
        res.status(400).json({
          success: false,
          error: 'Failed to send message',
          message: error.message
        });
        return;
      }

      // Get sender information
      const sender = await DatabaseService.getUserById(req.user.id);

      const messageWithSender: MessageWithSender = {
        ...message,
        sender: {
          id: sender.id,
          email: sender.email,
          profile: sender.profile
        }
      };

      // Create notification for team members (except sender)
      const teamMembers = await DatabaseService.getTeamMembers(team_id);
      const otherMembers = teamMembers.filter(member => member.user_id !== req.user.id);

      for (const member of otherMembers) {
        await DatabaseService.createNotification({
          user_id: member.user_id,
          type: 'message',
          title: 'New Message',
          content: `New message from ${sender.profile?.first_name || sender.email} in team chat`
        });
      }

      // Broadcast real-time message to team
      const wsService = (req as any).app.locals.wsService;
      if (wsService) {
        wsService.broadcastNewMessage(messageWithSender, team_id);
      }

      res.status(201).json({
        success: true,
        data: {
          message: messageWithSender,
          encryptionKey: encryptionData?.encryptionKey || null
        },
        message: 'Message sent successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to send message',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get messages for a team
   */
  static async getTeamMessages(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const { teamId } = req.params;
      const { page = 1, limit = 50 } = req.query;
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

      // Get messages
      const messages = await DatabaseService.getTeamMessages(teamId, Number(limit), offset);

      // Get total count for pagination
      const { count } = await supabaseAdmin
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId);

      const totalPages = Math.ceil((count || 0) / Number(limit));

      res.json({
        success: true,
        data: messages,
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
        error: 'Failed to fetch messages',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get messages for a specific mission
   */
  static async getMissionMessages(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const { missionId } = req.params;
      const { page = 1, limit = 50 } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      // Get mission details to verify access
      const mission = await DatabaseService.getMissionDetails(missionId);
      
      // Verify user is team member
      const isMember = await DatabaseService.isTeamMember(req.user.id, mission.team_id);
      if (!isMember) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'You are not a member of this team'
        });
        return;
      }

      // Get messages for this mission
      const { data: messages, error } = await supabaseAdmin
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
        .eq('mission_id', missionId)
        .order('created_at', { ascending: false })
        .range(offset, offset + Number(limit) - 1);

      if (error) {
        res.status(400).json({
          success: false,
          error: 'Failed to fetch messages',
          message: error.message
        });
        return;
      }

      // Get sender information for each message
      const messagesWithSenders = await Promise.all(
        messages.map(async (message) => {
          const user = await DatabaseService.getUserById(message.sender_id);
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

      // Get total count for pagination
      const { count } = await supabaseAdmin
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('mission_id', missionId);

      const totalPages = Math.ceil((count || 0) / Number(limit));

      res.json({
        success: true,
        data: messagesWithSenders,
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
        error: 'Failed to fetch mission messages',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Decrypt a message (for client-side decryption)
   */
  static async decryptMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const { encryptedMessage } = req.body;

      if (!encryptedMessage || !encryptedMessage.content || !encryptedMessage.encryptionKey) {
        res.status(400).json({
          success: false,
          error: 'Invalid encrypted message format'
        });
        return;
      }

      try {
        const decryptedContent = EncryptionService.decrypt(encryptedMessage);
        
        res.json({
          success: true,
          data: {
            decryptedContent
          }
        });
      } catch (decryptError) {
        res.status(400).json({
          success: false,
          error: 'Failed to decrypt message',
          message: 'Invalid encryption key or corrupted message'
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to decrypt message',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Delete a message (only sender or team leader)
   */
  static async deleteMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const { messageId } = req.params;

      // Get message details
      const { data: message, error: messageError } = await supabaseAdmin
        .from('messages')
        .select('*')
        .eq('id', messageId)
        .single();

      if (messageError || !message) {
        res.status(404).json({
          success: false,
          error: 'Message not found'
        });
        return;
      }

      // Check if user is sender or team leader
      const isSender = message.sender_id === req.user.id;
      const isLeader = await DatabaseService.isTeamLeader(req.user.id, message.team_id);

      if (!isSender && !isLeader) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'Only the sender or team leader can delete messages'
        });
        return;
      }

      // Delete message
      const { error: deleteError } = await supabaseAdmin
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (deleteError) {
        res.status(400).json({
          success: false,
          error: 'Failed to delete message',
          message: deleteError.message
        });
        return;
      }

      res.json({
        success: true,
        message: 'Message deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to delete message',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get message statistics for a team
   */
  static async getMessageStats(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      // Get message statistics
      const { data: stats, error } = await supabaseAdmin
        .from('messages')
        .select('sender_id, created_at, is_encrypted')
        .eq('team_id', teamId);

      if (error) {
        res.status(400).json({
          success: false,
          error: 'Failed to fetch message statistics',
          message: error.message
        });
        return;
      }

      const totalMessages = stats.length;
      const encryptedMessages = stats.filter(m => m.is_encrypted).length;
      const unencryptedMessages = totalMessages - encryptedMessages;

      // Group by sender
      const messagesBySender = stats.reduce((acc, message) => {
        acc[message.sender_id] = (acc[message.sender_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Get recent activity (last 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const recentMessages = stats.filter(m => m.created_at > oneDayAgo).length;

      res.json({
        success: true,
        data: {
          totalMessages,
          encryptedMessages,
          unencryptedMessages,
          recentMessages,
          messagesBySender,
          encryptionRate: totalMessages > 0 ? (encryptedMessages / totalMessages) * 100 : 0
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch message statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
