import type { Database } from '../../project/src/lib/types';

// Re-export Supabase types
export type { Database } from '../../project/src/lib/types';
export type Team = Database['public']['Tables']['teams']['Row'];
export type TeamMember = Database['public']['Tables']['team_members']['Row'];
export type Mission = Database['public']['Tables']['missions']['Row'];
export type Message = Database['public']['Tables']['messages']['Row'];
export type Notification = Database['public']['Tables']['notifications']['Row'];

// Extended types for backend
export interface User {
  id: string;
  email: string;
  role: 'admin' | 'rescue_team_member' | 'military_officer';
  profile?: UserProfile;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  rank?: string;
  department?: string;
  phone?: string;
  emergency_contact?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthRequest extends Request {
  user?: User;
  userId?: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface EncryptedMessage {
  content: string;
  encryptionKey: string;
  iv: string;
  tag: string;
}

export interface MessageWithSender extends Message {
  sender: {
    id: string;
    email: string;
    profile?: UserProfile;
  };
}

export interface MissionWithDetails extends Mission {
  team: Team;
  created_by_user: {
    id: string;
    email: string;
    profile?: UserProfile;
  };
  team_members: TeamMember[];
}

export interface TeamWithMembers extends Team {
  members: (TeamMember & {
    user: {
      id: string;
      email: string;
      profile?: UserProfile;
    };
  })[];
}

export interface NotificationWithDetails extends Notification {
  user: {
    id: string;
    email: string;
    profile?: UserProfile;
  };
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// WebSocket event types
export interface WebSocketEvents {
  'message:new': {
    message: MessageWithSender;
    teamId: string;
  };
  'mission:status_update': {
    mission: Mission;
    teamId: string;
  };
  'user:status_update': {
    userId: string;
    status: TeamMember['status'];
    teamId: string;
  };
  'notification:new': {
    notification: Notification;
    userId: string;
  };
  'team:member_joined': {
    member: TeamMember & { user: User };
    teamId: string;
  };
  'team:member_left': {
    userId: string;
    teamId: string;
  };
}

// Request/Response DTOs
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  role: User['role'];
  profile: {
    first_name: string;
    last_name: string;
    rank?: string;
    department?: string;
    phone?: string;
    emergency_contact?: string;
  };
}

export interface CreateTeamRequest {
  name: string;
  description?: string;
}

export interface CreateMissionRequest {
  team_id: string;
  title: string;
  description?: string;
  priority?: Mission['priority'];
}

export interface UpdateMissionRequest {
  title?: string;
  description?: string;
  status?: Mission['status'];
  priority?: Mission['priority'];
}

export interface SendMessageRequest {
  team_id: string;
  mission_id?: string;
  content: string;
  is_encrypted?: boolean;
}

export interface UpdateUserStatusRequest {
  status: TeamMember['status'];
}

export interface CreateNotificationRequest {
  user_id: string;
  type: Notification['type'];
  title: string;
  content?: string;
}

// Error types
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409);
  }
}
