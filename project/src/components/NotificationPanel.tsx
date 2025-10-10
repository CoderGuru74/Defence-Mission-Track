import { X, Bell, AlertCircle, MessageSquare, MapPin } from 'lucide-react';
import type { Notification } from '../lib/types';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
}

export function NotificationPanel({ isOpen, onClose, notifications, onMarkAsRead }: NotificationPanelProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'message':
        return MessageSquare;
      case 'status_change':
        return AlertCircle;
      case 'mission_update':
        return MapPin;
      default:
        return Bell;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'message':
        return 'text-blue-500';
      case 'status_change':
        return 'text-yellow-500';
      case 'mission_update':
        return 'text-green-500';
      default:
        return 'text-stone-500';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 h-full w-96 bg-stone-900 border-l border-stone-800 z-50 animate-slide-in shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-stone-100">Notifications</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5 text-stone-400" />
          </button>
        </div>

        <div className="overflow-y-auto h-[calc(100%-73px)] px-4 py-4 space-y-2">
          {notifications.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Bell className="w-12 h-12 text-stone-700 mx-auto mb-3" />
                <p className="text-stone-500">No notifications</p>
              </div>
            </div>
          ) : (
            notifications.map((notification) => {
              const Icon = getIcon(notification.type);
              const iconColor = getTypeColor(notification.type);

              return (
                <div
                  key={notification.id}
                  onClick={() => onMarkAsRead(notification.id)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 animate-scale-in ${
                    notification.read
                      ? 'bg-stone-800/30 border-stone-700/50 hover:bg-stone-800/50'
                      : 'bg-stone-800/50 border-green-900/50 hover:bg-stone-800'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={`w-5 h-5 ${iconColor} flex-shrink-0 mt-0.5`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="text-sm font-medium text-stone-200">{notification.title}</h4>
                        {!notification.read && (
                          <span className="w-2 h-2 bg-green-600 rounded-full flex-shrink-0 mt-1.5 animate-pulse-soft" />
                        )}
                      </div>
                      {notification.content && (
                        <p className="text-sm text-stone-400 mb-2">{notification.content}</p>
                      )}
                      <span className="text-xs text-stone-600">{formatTime(notification.created_at)}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
