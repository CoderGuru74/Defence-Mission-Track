export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      teams: {
        Row: {
          id: string
          name: string
          description: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          created_at?: string
        }
      }
      team_members: {
        Row: {
          id: string
          team_id: string
          user_id: string
          role: 'leader' | 'member' | 'observer'
          status: 'safe' | 'need_backup' | 'in_progress' | 'offline'
          joined_at: string
        }
        Insert: {
          id?: string
          team_id: string
          user_id: string
          role?: 'leader' | 'member' | 'observer'
          status?: 'safe' | 'need_backup' | 'in_progress' | 'offline'
          joined_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          user_id?: string
          role?: 'leader' | 'member' | 'observer'
          status?: 'safe' | 'need_backup' | 'in_progress' | 'offline'
          joined_at?: string
        }
      }
      missions: {
        Row: {
          id: string
          team_id: string
          title: string
          description: string
          status: 'planned' | 'in_progress' | 'completed' | 'aborted'
          priority: 'low' | 'medium' | 'high' | 'critical'
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          title: string
          description?: string
          status?: 'planned' | 'in_progress' | 'completed' | 'aborted'
          priority?: 'low' | 'medium' | 'high' | 'critical'
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          title?: string
          description?: string
          status?: 'planned' | 'in_progress' | 'completed' | 'aborted'
          priority?: 'low' | 'medium' | 'high' | 'critical'
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          team_id: string
          mission_id: string | null
          sender_id: string
          content: string
          is_encrypted: boolean
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          mission_id?: string | null
          sender_id: string
          content: string
          is_encrypted?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          mission_id?: string | null
          sender_id?: string
          content?: string
          is_encrypted?: boolean
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: 'message' | 'status_change' | 'mission_update' | 'alert'
          title: string
          content: string
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type?: 'message' | 'status_change' | 'mission_update' | 'alert'
          title: string
          content?: string
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'message' | 'status_change' | 'mission_update' | 'alert'
          title?: string
          content?: string
          read?: boolean
          created_at?: string
        }
      }
    }
  }
}

export type Team = Database['public']['Tables']['teams']['Row']
export type TeamMember = Database['public']['Tables']['team_members']['Row']
export type Mission = Database['public']['Tables']['missions']['Row']
export type Message = Database['public']['Tables']['messages']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']
