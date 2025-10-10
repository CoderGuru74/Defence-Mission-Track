import { useState, useEffect, useRef } from 'react';
import { Send, Lock } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import type { Message, TeamMember } from '../lib/types';

interface ChatPanelProps {
  messages: Message[];
  teamMembers: TeamMember[];
  currentUserId: string;
  missionTitle?: string;
  onSendMessage: (content: string) => void;
}

export function ChatPanel({ messages, teamMembers, currentUserId, missionTitle, onSendMessage }: ChatPanelProps) {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (newMessage.trim()) {
      onSendMessage(newMessage);
      setNewMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getMemberInfo = (userId: string) => {
    return teamMembers.find(m => m.user_id === userId);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-stone-800 px-6 py-4 bg-stone-900/50">
        <h2 className="text-lg font-semibold text-stone-100">
          {missionTitle || 'General Team Chat'}
        </h2>
        <p className="text-sm text-stone-500">Secure channel</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Lock className="w-12 h-12 text-stone-700 mx-auto mb-3" />
              <p className="text-stone-500">No messages yet</p>
              <p className="text-sm text-stone-600 mt-1">Start a secure conversation</p>
            </div>
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = message.sender_id === currentUserId;
            const memberInfo = getMemberInfo(message.sender_id);

            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-slide-in`}
              >
                <div className={`max-w-md ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-stone-500">
                      {isOwn ? 'You' : `User ${message.sender_id.slice(0, 8)}`}
                    </span>
                    {memberInfo && (
                      <StatusBadge status={memberInfo.status} size="sm" />
                    )}
                    <span className="text-xs text-stone-600">{formatTime(message.created_at)}</span>
                  </div>
                  <div
                    className={`px-4 py-3 rounded-lg ${
                      isOwn
                        ? 'bg-green-900/30 text-green-100 border border-green-800'
                        : 'bg-stone-800/50 text-stone-200 border border-stone-700'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                    {message.is_encrypted && (
                      <div className="flex items-center gap-1 mt-2 text-xs opacity-60">
                        <Lock className="w-3 h-3" />
                        <span>Encrypted</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-stone-800 px-6 py-4 bg-stone-900/50">
        <div className="flex items-end gap-3">
          <div className="flex-1 relative">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type your message... (Press Enter to send)"
              rows={1}
              className="w-full px-4 py-3 bg-stone-800/50 border border-stone-700 rounded-lg text-stone-200 placeholder-stone-500 focus:outline-none focus:border-green-700 focus:ring-1 focus:ring-green-700 resize-none transition-all duration-200"
            />
            <Lock className="absolute right-3 top-3 w-4 h-4 text-stone-600" />
          </div>
          <button
            onClick={handleSend}
            disabled={!newMessage.trim()}
            className="px-6 py-3 bg-green-900/30 text-green-400 border border-green-700 rounded-lg hover:bg-green-900/50 hover:text-green-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 group"
          >
            <Send className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}
