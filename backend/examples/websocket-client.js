/**
 * WebSocket Client Example for Defence Mission Track
 * 
 * This example demonstrates how to connect to the WebSocket server
 * and handle real-time events for the Defence Mission Track application.
 */

const { io } = require('socket.io-client');

// Configuration
const SERVER_URL = 'http://localhost:3001';
const AUTH_TOKEN = 'your_jwt_token_here'; // Replace with actual JWT token

// Create socket connection
const socket = io(SERVER_URL, {
  auth: {
    token: AUTH_TOKEN
  },
  transports: ['websocket', 'polling']
});

// Connection events
socket.on('connect', () => {
  console.log('✅ Connected to Defence Mission Track WebSocket server');
  console.log('Socket ID:', socket.id);
  
  // Join a team room (replace with actual team ID)
  const teamId = 'your-team-id-here';
  socket.emit('join_team', teamId);
});

socket.on('disconnect', (reason) => {
  console.log('❌ Disconnected from server:', reason);
});

socket.on('connect_error', (error) => {
  console.error('🚫 Connection error:', error.message);
});

// Message events
socket.on('message:new', (data) => {
  console.log('📨 New message received:', {
    teamId: data.teamId,
    message: {
      id: data.message.id,
      content: data.message.content,
      sender: data.message.sender.email,
      timestamp: data.message.created_at
    }
  });
});

// Mission events
socket.on('mission:status_update', (data) => {
  console.log('🎯 Mission status updated:', {
    teamId: data.teamId,
    mission: {
      id: data.mission.id,
      title: data.mission.title,
      status: data.mission.status,
      priority: data.mission.priority
    }
  });
});

// User status events
socket.on('user:status_update', (data) => {
  console.log('👤 User status updated:', {
    userId: data.userId,
    status: data.status,
    teamId: data.teamId
  });
});

// Notification events
socket.on('notification:new', (data) => {
  console.log('🔔 New notification:', {
    type: data.type,
    title: data.title,
    content: data.content
  });
});

// Team events
socket.on('team:member_joined', (data) => {
  console.log('👋 New team member joined:', {
    teamId: data.teamId,
    member: {
      id: data.member.user.id,
      email: data.member.user.email,
      role: data.member.role
    }
  });
});

socket.on('team:member_left', (data) => {
  console.log('👋 Team member left:', {
    userId: data.userId,
    teamId: data.teamId
  });
});

// Typing indicators
socket.on('user_typing', (data) => {
  console.log('⌨️ User typing:', {
    userId: data.userId,
    isTyping: data.isTyping
  });
});

// Error handling
socket.on('error', (error) => {
  console.error('🚨 Socket error:', error.message);
});

// Example functions to interact with the server

/**
 * Update user status
 */
function updateUserStatus(teamId, status) {
  socket.emit('status_update', {
    teamId: teamId,
    status: status // 'safe', 'need_backup', 'in_progress', 'offline'
  });
}

/**
 * Send typing indicators
 */
function startTyping(teamId) {
  socket.emit('typing_start', { teamId });
}

function stopTyping(teamId) {
  socket.emit('typing_stop', { teamId });
}

/**
 * Join a team room
 */
function joinTeam(teamId) {
  socket.emit('join_team', teamId);
}

/**
 * Leave a team room
 */
function leaveTeam(teamId) {
  socket.emit('leave_team', teamId);
}

// Example usage
console.log('🚀 Defence Mission Track WebSocket Client Example');
console.log('Make sure to:');
console.log('1. Replace AUTH_TOKEN with a valid JWT token');
console.log('2. Replace teamId with an actual team ID');
console.log('3. Start the backend server on port 3001');
console.log('');

// Simulate some actions after connection
setTimeout(() => {
  const teamId = 'your-team-id-here';
  
  // Join a team
  joinTeam(teamId);
  
  // Update status
  updateUserStatus(teamId, 'safe');
  
  // Simulate typing
  startTyping(teamId);
  setTimeout(() => stopTyping(teamId), 2000);
  
}, 2000);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Disconnecting...');
  socket.disconnect();
  process.exit(0);
});

module.exports = {
  socket,
  updateUserStatus,
  startTyping,
  stopTyping,
  joinTeam,
  leaveTeam
};
