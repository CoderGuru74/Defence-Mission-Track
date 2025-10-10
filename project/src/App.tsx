import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { ChatPanel } from './components/ChatPanel';
import { TeamPanel } from './components/TeamPanel';
import { NotificationPanel } from './components/NotificationPanel';
import type { Mission, Message, TeamMember, Notification } from './lib/types';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);

  const demoUserId = 'demo-user-001';
  const demoTeamId = 'demo-team-001';

  const [missions] = useState<Mission[]>([
    {
      id: 'mission-001',
      team_id: demoTeamId,
      title: 'Operation Thunder Strike',
      description: 'Rescue mission in sector 7',
      status: 'in_progress',
      priority: 'critical',
      created_by: demoUserId,
      created_at: new Date(Date.now() - 3600000).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'mission-002',
      team_id: demoTeamId,
      title: 'Supply Drop Alpha',
      description: 'Deliver medical supplies to checkpoint',
      status: 'planned',
      priority: 'high',
      created_by: demoUserId,
      created_at: new Date(Date.now() - 7200000).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'mission-003',
      team_id: demoTeamId,
      title: 'Recon Delta',
      description: 'Surveillance and intelligence gathering',
      status: 'completed',
      priority: 'medium',
      created_by: demoUserId,
      created_at: new Date(Date.now() - 86400000).toISOString(),
      updated_at: new Date(Date.now() - 3600000).toISOString(),
    },
  ]);

  const [teamMembers] = useState<TeamMember[]>([
    {
      id: 'member-001',
      team_id: demoTeamId,
      user_id: demoUserId,
      role: 'leader',
      status: 'safe',
      joined_at: new Date(Date.now() - 2592000000).toISOString(),
    },
    {
      id: 'member-002',
      team_id: demoTeamId,
      user_id: 'user-002',
      role: 'member',
      status: 'in_progress',
      joined_at: new Date(Date.now() - 2592000000).toISOString(),
    },
    {
      id: 'member-003',
      team_id: demoTeamId,
      user_id: 'user-003',
      role: 'member',
      status: 'safe',
      joined_at: new Date(Date.now() - 1296000000).toISOString(),
    },
    {
      id: 'member-004',
      team_id: demoTeamId,
      user_id: 'user-004',
      role: 'observer',
      status: 'offline',
      joined_at: new Date(Date.now() - 604800000).toISOString(),
    },
  ]);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg-001',
      team_id: demoTeamId,
      mission_id: null,
      sender_id: 'user-002',
      content: 'Command, this is Alpha team. We have arrived at the checkpoint.',
      is_encrypted: true,
      created_at: new Date(Date.now() - 600000).toISOString(),
    },
    {
      id: 'msg-002',
      team_id: demoTeamId,
      mission_id: null,
      sender_id: demoUserId,
      content: 'Copy that, Alpha. Status report?',
      is_encrypted: true,
      created_at: new Date(Date.now() - 540000).toISOString(),
    },
    {
      id: 'msg-003',
      team_id: demoTeamId,
      mission_id: null,
      sender_id: 'user-002',
      content: 'All clear. No hostiles in sight. Proceeding with objective.',
      is_encrypted: true,
      created_at: new Date(Date.now() - 480000).toISOString(),
    },
    {
      id: 'msg-004',
      team_id: demoTeamId,
      mission_id: null,
      sender_id: 'user-003',
      content: 'Bravo team standing by. Ready to provide backup if needed.',
      is_encrypted: true,
      created_at: new Date(Date.now() - 420000).toISOString(),
    },
  ]);

  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: 'notif-001',
      user_id: demoUserId,
      type: 'status_change',
      title: 'Team Member Status Update',
      content: 'User 002 changed status to In Progress',
      read: false,
      created_at: new Date(Date.now() - 300000).toISOString(),
    },
    {
      id: 'notif-002',
      user_id: demoUserId,
      type: 'mission_update',
      title: 'Mission Progress',
      content: 'Operation Thunder Strike updated to In Progress',
      read: false,
      created_at: new Date(Date.now() - 600000).toISOString(),
    },
    {
      id: 'notif-003',
      user_id: demoUserId,
      type: 'message',
      title: 'New Message',
      content: 'Alpha team has checked in',
      read: true,
      created_at: new Date(Date.now() - 900000).toISOString(),
    },
  ]);

  const handleSendMessage = (content: string) => {
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      team_id: demoTeamId,
      mission_id: selectedMissionId,
      sender_id: demoUserId,
      content,
      is_encrypted: true,
      created_at: new Date().toISOString(),
    };
    setMessages([...messages, newMessage]);
  };

  const handleMarkAsRead = (notificationId: string) => {
    setNotifications(
      notifications.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
  };

  const selectedMission = missions.find(m => m.id === selectedMissionId);
  const filteredMessages = selectedMissionId
    ? messages.filter(m => m.mission_id === selectedMissionId)
    : messages.filter(m => !m.mission_id);

  useEffect(() => {
    const timer = setTimeout(() => {
      const newNotification: Notification = {
        id: `notif-${Date.now()}`,
        user_id: demoUserId,
        type: 'alert',
        title: 'System Status',
        content: 'All systems operational. Secure connection established.',
        read: false,
        created_at: new Date().toISOString(),
      };
      setNotifications(prev => [newNotification, ...prev]);
    }, 10000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        missions={missions}
        selectedMissionId={selectedMissionId}
        onSelectMission={setSelectedMissionId}
      />

      <TopBar
        notifications={notifications}
        onNotificationClick={() => setNotificationPanelOpen(!notificationPanelOpen)}
        userEmail="commander@defence.mil"
      />

      <NotificationPanel
        isOpen={notificationPanelOpen}
        onClose={() => setNotificationPanelOpen(false)}
        notifications={notifications}
        onMarkAsRead={handleMarkAsRead}
      />

      <div
        className={`transition-all duration-300 ${
          sidebarOpen ? 'ml-80' : 'ml-0'
        } pt-[73px]`}
      >
        <div className="flex h-[calc(100vh-73px)]">
          <div className="flex-1">
            <ChatPanel
              messages={filteredMessages}
              teamMembers={teamMembers}
              currentUserId={demoUserId}
              missionTitle={selectedMission?.title}
              onSendMessage={handleSendMessage}
            />
          </div>
          <div className="w-80 hidden lg:block">
            <TeamPanel
              teamMembers={teamMembers}
              currentUserId={demoUserId}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
