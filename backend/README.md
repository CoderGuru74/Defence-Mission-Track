# Defence Mission Track - Backend API

A secure, real-time communication backend for military and rescue team operations with end-to-end encryption, mission tracking, and live notifications.

## 🚀 Features

- **Secure Authentication**: JWT-based auth with role-based access control
- **End-to-End Encryption**: AES-256-GCM encryption for sensitive messages
- **Real-time Communication**: WebSocket support for live updates
- **Mission Management**: Create, track, and update mission status
- **Team Management**: Organize users into teams with different roles
- **Live Notifications**: Real-time alerts for status changes and messages
- **Status Tracking**: Monitor team member status (Safe, Need Backup, In Progress, Offline)

## 🛠 Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: Supabase (PostgreSQL with real-time features)
- **Authentication**: JWT with Supabase Auth
- **Real-time**: Socket.IO WebSockets
- **Encryption**: AES-256-GCM with bcrypt for passwords
- **Security**: Helmet, CORS, Rate limiting, Input sanitization

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account and project
- Environment variables configured

## ⚙️ Installation

1. **Clone and navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   # Server Configuration
   PORT=3001
   NODE_ENV=development

   # Supabase Configuration
   SUPABASE_URL=your_supabase_url_here
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
   SUPABASE_ANON_KEY=your_supabase_anon_key_here

   # JWT Configuration
   JWT_SECRET=your_jwt_secret_here_make_it_very_long_and_secure
   JWT_EXPIRES_IN=24h

   # Encryption Configuration
   ENCRYPTION_KEY=your_32_character_encryption_key_here

   # Rate Limiting
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100

   # CORS Configuration
   CORS_ORIGIN=http://localhost:5173

   # WebSocket Configuration
   WS_PORT=3002

   # Security
   BCRYPT_ROUNDS=12
   ```

4. **Run database migrations**:
   - Ensure your Supabase project has the schema from `../project/supabase/migrations/`

5. **Start the development server**:
   ```bash
   npm run dev
   ```

## 🏗 Project Structure

```
backend/
├── src/
│   ├── config/          # Database configuration
│   ├── controllers/     # Route handlers
│   ├── middleware/      # Authentication, validation, security
│   ├── routes/          # API route definitions
│   ├── services/        # WebSocket and other services
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Encryption, JWT utilities
│   └── server.ts        # Main server file
├── package.json
├── tsconfig.json
└── README.md
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/change-password` - Change password
- `GET /api/auth/verify` - Verify token validity

### Teams
- `POST /api/teams` - Create team
- `GET /api/teams/user` - Get user's teams
- `GET /api/teams/:teamId` - Get team details
- `PUT /api/teams/:teamId` - Update team
- `POST /api/teams/:teamId/members` - Add team member
- `DELETE /api/teams/:teamId/members/:userId` - Remove team member
- `PUT /api/teams/:teamId/status` - Update user status
- `GET /api/teams/:teamId/stats` - Get team statistics

### Messages
- `POST /api/messages` - Send message
- `GET /api/messages/team/:teamId` - Get team messages
- `GET /api/messages/mission/:missionId` - Get mission messages
- `POST /api/messages/decrypt` - Decrypt message
- `DELETE /api/messages/:messageId` - Delete message
- `GET /api/messages/team/:teamId/stats` - Get message statistics

### Missions
- `POST /api/missions` - Create mission
- `GET /api/missions/:missionId` - Get mission details
- `GET /api/missions/team/:teamId` - Get team missions
- `PUT /api/missions/:missionId` - Update mission
- `DELETE /api/missions/:missionId` - Delete mission
- `GET /api/missions/team/:teamId/stats` - Get mission statistics
- `POST /api/missions/:missionId/assign` - Assign mission

### Notifications
- `GET /api/notifications` - Get user notifications
- `GET /api/notifications/stats` - Get notification statistics
- `PUT /api/notifications/:notificationId/read` - Mark as read
- `PUT /api/notifications/read-all` - Mark all as read
- `DELETE /api/notifications/:notificationId` - Delete notification
- `POST /api/notifications` - Create notification
- `POST /api/notifications/bulk` - Create bulk notifications

## 🔐 Security Features

### Authentication & Authorization
- JWT-based authentication with refresh tokens
- Role-based access control (admin, rescue_team_member, military_officer)
- Team-based permissions with leader/member/observer roles
- Row Level Security (RLS) in Supabase

### Encryption
- AES-256-GCM encryption for sensitive messages
- End-to-end encryption with unique keys per message
- bcrypt password hashing with configurable rounds
- Secure token generation and validation

### Security Middleware
- Helmet for security headers
- CORS configuration
- Rate limiting (100 requests per 15 minutes)
- Input sanitization to prevent XSS
- Request validation with Joi schemas

## 🔌 WebSocket Events

### Client → Server
- `join_team` - Join a team room
- `leave_team` - Leave a team room
- `typing_start` - Start typing indicator
- `typing_stop` - Stop typing indicator
- `status_update` - Update user status

### Server → Client
- `message:new` - New message received
- `mission:status_update` - Mission status changed
- `user:status_update` - User status changed
- `notification:new` - New notification
- `team:member_joined` - New team member
- `team:member_left` - Team member left
- `user_typing` - User typing indicator
- `error` - Error messages

## 🚀 Deployment

### Production Environment Variables
```env
NODE_ENV=production
PORT=3001
SUPABASE_URL=your_production_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_production_service_key
SUPABASE_ANON_KEY=your_production_anon_key
JWT_SECRET=your_very_secure_jwt_secret
ENCRYPTION_KEY=your_32_character_encryption_key
CORS_ORIGIN=https://your-frontend-domain.com
```

### Build and Start
```bash
npm run build
npm start
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

## 📊 Monitoring

The API includes:
- Health check endpoint: `GET /health`
- Request logging with Morgan
- Error tracking and logging
- WebSocket connection monitoring

## 🔧 Development

### Available Scripts
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run typecheck` - Run TypeScript type checking

### Code Style
- TypeScript with strict mode
- ESLint configuration
- Prettier formatting
- Consistent naming conventions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Run linting and tests
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check the API documentation
- Review the error logs
- Ensure environment variables are correctly set
- Verify Supabase connection and permissions

## 🔄 Real-time Features

The backend provides real-time updates for:
- New messages in team chats
- Mission status changes
- User status updates (Safe, Need Backup, In Progress, Offline)
- Team member joins/leaves
- Live notifications
- Typing indicators

All real-time features use WebSocket connections with authentication and proper error handling.
