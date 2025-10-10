/*
  # Defence Mission Track Database Schema

  ## Overview
  This migration creates the complete database schema for a military/rescue team communication application.
  
  ## New Tables
  
  ### 1. `teams`
  Stores team information for military/rescue operations
  - `id` (uuid, primary key) - Unique team identifier
  - `name` (text) - Team name
  - `description` (text) - Team description
  - `created_at` (timestamptz) - Timestamp of team creation
  
  ### 2. `team_members`
  Manages team membership and user assignments
  - `id` (uuid, primary key) - Unique membership record
  - `team_id` (uuid, foreign key) - Reference to teams table
  - `user_id` (uuid, foreign key) - Reference to auth.users
  - `role` (text) - Member role (leader, member, observer)
  - `status` (text) - Current status (safe, need_backup, in_progress, offline)
  - `joined_at` (timestamptz) - When user joined the team
  
  ### 3. `missions`
  Tracks active and completed missions
  - `id` (uuid, primary key) - Unique mission identifier
  - `team_id` (uuid, foreign key) - Reference to teams table
  - `title` (text) - Mission title
  - `description` (text) - Detailed mission description
  - `status` (text) - Mission status (planned, in_progress, completed, aborted)
  - `priority` (text) - Priority level (low, medium, high, critical)
  - `created_by` (uuid, foreign key) - User who created the mission
  - `created_at` (timestamptz) - Mission creation time
  - `updated_at` (timestamptz) - Last update time
  
  ### 4. `messages`
  Stores chat messages for teams
  - `id` (uuid, primary key) - Unique message identifier
  - `team_id` (uuid, foreign key) - Reference to teams table
  - `mission_id` (uuid, foreign key, nullable) - Optional reference to specific mission
  - `sender_id` (uuid, foreign key) - User who sent the message
  - `content` (text) - Message content
  - `is_encrypted` (boolean) - Flag for encrypted messages
  - `created_at` (timestamptz) - Message timestamp
  
  ### 5. `notifications`
  Manages user notifications for updates and alerts
  - `id` (uuid, primary key) - Unique notification identifier
  - `user_id` (uuid, foreign key) - Target user
  - `type` (text) - Notification type (message, status_change, mission_update, alert)
  - `title` (text) - Notification title
  - `content` (text) - Notification content
  - `read` (boolean) - Read status
  - `created_at` (timestamptz) - When notification was created
  
  ## Security
  
  ### Row Level Security (RLS)
  All tables have RLS enabled with restrictive policies:
  
  1. **teams**: Users can view teams they are members of
  2. **team_members**: Users can view members of their teams and update their own status
  3. **missions**: Users can view missions for their teams
  4. **messages**: Users can view and send messages to their teams
  5. **notifications**: Users can only view and update their own notifications
  
  ## Indexes
  Created for optimal query performance on frequently accessed columns
*/

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Create team_members table
CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text DEFAULT 'member' CHECK (role IN ('leader', 'member', 'observer')),
  status text DEFAULT 'offline' CHECK (status IN ('safe', 'need_backup', 'in_progress', 'offline')),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Create missions table
CREATE TABLE IF NOT EXISTS missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  status text DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'aborted')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  mission_id uuid REFERENCES missions(id) ON DELETE SET NULL,
  sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  content text NOT NULL,
  is_encrypted boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text DEFAULT 'alert' CHECK (type IN ('message', 'status_change', 'mission_update', 'alert')),
  title text NOT NULL,
  content text DEFAULT '',
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_missions_team_id ON missions(team_id);
CREATE INDEX IF NOT EXISTS idx_messages_team_id ON messages(team_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- Enable Row Level Security
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for teams
CREATE POLICY "Users can view teams they are members of"
  ON teams FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = teams.id
      AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Team leaders can update their teams"
  ON teams FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = teams.id
      AND team_members.user_id = auth.uid()
      AND team_members.role = 'leader'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = teams.id
      AND team_members.user_id = auth.uid()
      AND team_members.role = 'leader'
    )
  );

-- RLS Policies for team_members
CREATE POLICY "Users can view members of their teams"
  ON team_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own team member status"
  ON team_members FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for missions
CREATE POLICY "Users can view missions for their teams"
  ON missions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = missions.team_id
      AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Team leaders can create missions"
  ON missions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = missions.team_id
      AND team_members.user_id = auth.uid()
      AND team_members.role = 'leader'
    )
  );

CREATE POLICY "Team leaders can update missions"
  ON missions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = missions.team_id
      AND team_members.user_id = auth.uid()
      AND team_members.role = 'leader'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = missions.team_id
      AND team_members.user_id = auth.uid()
      AND team_members.role = 'leader'
    )
  );

-- RLS Policies for messages
CREATE POLICY "Users can view messages in their teams"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = messages.team_id
      AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages to their teams"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = messages.team_id
      AND team_members.user_id = auth.uid()
    )
  );

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);