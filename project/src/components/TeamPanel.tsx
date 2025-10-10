import { Users, Crown } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import type { TeamMember } from '../lib/types';

interface TeamPanelProps {
  teamMembers: TeamMember[];
  currentUserId: string;
}

export function TeamPanel({ teamMembers, currentUserId }: TeamPanelProps) {
  const sortedMembers = [...teamMembers].sort((a, b) => {
    const statusOrder = { safe: 0, in_progress: 1, need_backup: 2, offline: 3 };
    return statusOrder[a.status] - statusOrder[b.status];
  });

  return (
    <div className="h-full bg-stone-900/30 border-l border-stone-800">
      <div className="px-6 py-4 border-b border-stone-800">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-green-600" />
          <h3 className="text-sm font-semibold text-stone-300 uppercase tracking-wide">
            Team Members
          </h3>
          <span className="text-xs text-stone-500">({teamMembers.length})</span>
        </div>
      </div>

      <div className="overflow-y-auto px-4 py-4 space-y-2">
        {sortedMembers.length === 0 ? (
          <div className="text-center py-8 text-stone-500 text-sm">
            No team members
          </div>
        ) : (
          sortedMembers.map((member) => (
            <div
              key={member.id}
              className="p-3 rounded-lg bg-stone-800/30 border border-stone-700/50 hover:bg-stone-800/50 hover:border-stone-700 transition-all duration-200 animate-fade-in"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-stone-700 flex items-center justify-center text-sm font-medium text-stone-300">
                    {member.user_id.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium text-stone-300">
                        {member.user_id === currentUserId ? 'You' : `User ${member.user_id.slice(0, 8)}`}
                      </span>
                      {member.role === 'leader' && (
                        <Crown className="w-3 h-3 text-yellow-600" />
                      )}
                    </div>
                    <span className="text-xs text-stone-500 capitalize">{member.role}</span>
                  </div>
                </div>
              </div>
              <StatusBadge status={member.status} size="sm" />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
