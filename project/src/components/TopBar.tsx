import { Bell, User, Lock } from 'lucide-react';
import type { Notification } from '../lib/types';

interface TopBarProps {
  notifications: Notification[];
  onNotificationClick: () => void;
  userEmail?: string;
}

export function TopBar({ notifications, onNotificationClick, userEmail }: TopBarProps) {
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="fixed top-0 right-0 left-0 z-30 bg-stone-900/95 backdrop-blur-sm border-b border-stone-800">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3 ml-16">
          <Lock className="w-5 h-5 text-green-600" />
          <div>
            <p className="text-sm font-medium text-stone-300">End-to-End Encrypted</p>
            <p className="text-xs text-stone-500">Secure military-grade communication</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={onNotificationClick}
            className="relative p-2 rounded-lg bg-stone-800/50 border border-stone-700 hover:bg-stone-800 hover:border-green-700 transition-all duration-200 group"
          >
            <Bell className="w-5 h-5 text-stone-400 group-hover:text-green-500 transition-colors" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-xs rounded-full flex items-center justify-center animate-scale-in">
                {unreadCount}
              </span>
            )}
          </button>

          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-stone-800/50 border border-stone-700">
            <User className="w-5 h-5 text-stone-400" />
            <span className="text-sm text-stone-300">{userEmail || 'Demo User'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
