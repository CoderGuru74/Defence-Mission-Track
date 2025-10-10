import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { JWTService } from '../utils/jwt.js';
import { DatabaseService } from '../config/database.js';
import type { WebSocketEvents } from '../types/index.js';

export class WebSocketService {
  private io: SocketIOServer;
  private connectedUsers: Map<string, string> = new Map(); // userId -> socketId

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN || "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const payload = JWTService.verifyToken(token);
        const user = await DatabaseService.getUserById(payload.userId);
        
        socket.data.user = {
          id: user.id,
          email: user.email,
          role: user.role
        };
        
        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      const user = socket.data.user;
      console.log(`User ${user.email} connected with socket ${socket.id}`);
      
      // Store user connection
      this.connectedUsers.set(user.id, socket.id);

      // Join user to their teams
      this.joinUserTeams(socket, user.id);

      // Handle joining specific team room
      socket.on('join_team', (teamId: string) => {
        this.joinTeam(socket, teamId, user.id);
      });

      // Handle leaving team room
      socket.on('leave_team', (teamId: string) => {
        socket.leave(`team:${teamId}`);
        console.log(`User ${user.email} left team ${teamId}`);
      });

      // Handle typing indicators
      socket.on('typing_start', (data: { teamId: string }) => {
        socket.to(`team:${data.teamId}`).emit('user_typing', {
          userId: user.id,
          isTyping: true
        });
      });

      socket.on('typing_stop', (data: { teamId: string }) => {
        socket.to(`team:${data.teamId}`).emit('user_typing', {
          userId: user.id,
          isTyping: false
        });
      });

      // Handle status updates
      socket.on('status_update', async (data: { teamId: string, status: string }) => {
        try {
          // Verify user is team member
          const isMember = await DatabaseService.isTeamMember(user.id, data.teamId);
          if (!isMember) {
            socket.emit('error', { message: 'Not a team member' });
            return;
          }

          // Update status in database
          const { error } = await DatabaseService.supabaseAdmin
            .from('team_members')
            .update({ status: data.status })
            .eq('user_id', user.id)
            .eq('team_id', data.teamId);

          if (error) {
            socket.emit('error', { message: 'Failed to update status' });
            return;
          }

          // Broadcast status update to team
          this.io.to(`team:${data.teamId}`).emit('user:status_update', {
            userId: user.id,
            status: data.status,
            teamId: data.teamId
          });

          // Create notifications for team members
          const teamMembers = await DatabaseService.getTeamMembers(data.teamId);
          const userDetails = await DatabaseService.getUserById(user.id);
          const userName = userDetails.profile?.first_name || userDetails.email;

          for (const member of teamMembers) {
            if (member.user_id !== user.id) {
              await DatabaseService.createNotification({
                user_id: member.user_id,
                type: 'status_change',
                title: 'Team Member Status Update',
                content: `${userName} status changed to ${data.status}`
              });

              // Send real-time notification
              const memberSocketId = this.connectedUsers.get(member.user_id);
              if (memberSocketId) {
                this.io.to(memberSocketId).emit('notification:new', {
                  type: 'status_change',
                  title: 'Team Member Status Update',
                  content: `${userName} status changed to ${data.status}`
                });
              }
            }
          }
        } catch (error) {
          socket.emit('error', { message: 'Failed to update status' });
        }
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`User ${user.email} disconnected`);
        this.connectedUsers.delete(user.id);
        
        // Update user status to offline in all teams
        this.updateUserOfflineStatus(user.id);
      });
    });
  }

  private async joinUserTeams(socket: any, userId: string) {
    try {
      const userTeams = await DatabaseService.getUserTeams(userId);
      
      for (const teamMembership of userTeams) {
        const teamId = teamMembership.team_id;
        socket.join(`team:${teamId}`);
        console.log(`User ${userId} joined team ${teamId}`);
      }
    } catch (error) {
      console.error('Failed to join user teams:', error);
    }
  }

  private async joinTeam(socket: any, teamId: string, userId: string) {
    try {
      const isMember = await DatabaseService.isTeamMember(userId, teamId);
      if (!isMember) {
        socket.emit('error', { message: 'Not a team member' });
        return;
      }

      socket.join(`team:${teamId}`);
      console.log(`User ${userId} joined team ${teamId}`);
    } catch (error) {
      socket.emit('error', { message: 'Failed to join team' });
    }
  }

  private async updateUserOfflineStatus(userId: string) {
    try {
      const userTeams = await DatabaseService.getUserTeams(userId);
      
      for (const teamMembership of userTeams) {
        await DatabaseService.supabaseAdmin
          .from('team_members')
          .update({ status: 'offline' })
          .eq('user_id', userId)
          .eq('team_id', teamMembership.team_id);

        // Broadcast offline status to team
        this.io.to(`team:${teamMembership.team_id}`).emit('user:status_update', {
          userId,
          status: 'offline',
          teamId: teamMembership.team_id
        });
      }
    } catch (error) {
      console.error('Failed to update offline status:', error);
    }
  }

  // Public methods for broadcasting events
  public broadcastNewMessage(message: any, teamId: string) {
    this.io.to(`team:${teamId}`).emit('message:new', {
      message,
      teamId
    });
  }

  public broadcastMissionUpdate(mission: any, teamId: string) {
    this.io.to(`team:${teamId}`).emit('mission:status_update', {
      mission,
      teamId
    });
  }

  public broadcastNotification(notification: any, userId: string) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.io.to(socketId).emit('notification:new', notification);
    }
  }

  public broadcastTeamMemberJoined(member: any, teamId: string) {
    this.io.to(`team:${teamId}`).emit('team:member_joined', {
      member,
      teamId
    });
  }

  public broadcastTeamMemberLeft(userId: string, teamId: string) {
    this.io.to(`team:${teamId}`).emit('team:member_left', {
      userId,
      teamId
    });
  }

  public getConnectedUsers(): string[] {
    return Array.from(this.connectedUsers.keys());
  }

  public isUserConnected(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  public getSocketId(userId: string): string | undefined {
    return this.connectedUsers.get(userId);
  }
}
