import { Shield, Users, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Mission } from '../lib/types';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  missions: Mission[];
  selectedMissionId: string | null;
  onSelectMission: (id: string | null) => void;
}

export function Sidebar({ isOpen, onToggle, missions, selectedMissionId, onSelectMission }: SidebarProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-900/30 text-green-400 border-green-700';
      case 'in_progress':
        return 'bg-yellow-900/30 text-yellow-400 border-yellow-700';
      case 'planned':
        return 'bg-blue-900/30 text-blue-400 border-blue-700';
      case 'aborted':
        return 'bg-red-900/30 text-red-400 border-red-700';
      default:
        return 'bg-stone-800 text-stone-400 border-stone-700';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-600';
      case 'high':
        return 'bg-orange-600';
      case 'medium':
        return 'bg-yellow-600';
      case 'low':
        return 'bg-green-600';
      default:
        return 'bg-stone-600';
    }
  };

  return (
    <>
      <div
        className={`fixed left-0 top-0 h-full bg-stone-900/95 backdrop-blur-sm border-r border-stone-800 transition-all duration-300 z-40 ${
          isOpen ? 'w-80' : 'w-0'
        } overflow-hidden`}
      >
        <div className="flex flex-col h-full p-6">
          <div className="flex items-center gap-3 mb-8">
            <Shield className="w-8 h-8 text-green-600" />
            <div className="flex-1">
              <h1 className="text-xl font-bold text-stone-100">Defence Mission Track</h1>
              <p className="text-xs text-stone-500">Secure Communications</p>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-green-600" />
              <h2 className="text-sm font-semibold text-stone-300 uppercase tracking-wide">Active Missions</h2>
            </div>
            <button
              onClick={() => onSelectMission(null)}
              className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 mb-2 ${
                selectedMissionId === null
                  ? 'bg-green-900/30 text-green-400 border border-green-700'
                  : 'bg-stone-800/50 text-stone-400 border border-stone-700 hover:bg-stone-800 hover:text-stone-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span className="font-medium">General Chat</span>
              </div>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2">
            {missions.length === 0 ? (
              <div className="text-center py-8 text-stone-500 text-sm">
                No active missions
              </div>
            ) : (
              missions.map((mission) => (
                <button
                  key={mission.id}
                  onClick={() => onSelectMission(mission.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 animate-fade-in ${
                    selectedMissionId === mission.id
                      ? getStatusColor(mission.status)
                      : 'bg-stone-800/50 border border-stone-700 hover:bg-stone-800 text-stone-300 hover:border-stone-600'
                  }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className="font-medium text-sm">{mission.title}</span>
                    <span className={`w-2 h-2 rounded-full ${getPriorityColor(mission.priority)} animate-pulse-soft`} />
                  </div>
                  <p className="text-xs text-stone-500 truncate">{mission.description}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded bg-stone-950/50 border border-stone-700 capitalize">
                      {mission.status.replace('_', ' ')}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      <button
        onClick={onToggle}
        className="fixed left-4 top-4 z-50 p-2 bg-stone-900/95 backdrop-blur-sm border border-stone-700 rounded-lg hover:bg-stone-800 hover:border-green-700 transition-all duration-200 group"
      >
        {isOpen ? (
          <ChevronLeft className="w-5 h-5 text-stone-400 group-hover:text-green-500 transition-colors" />
        ) : (
          <ChevronRight className="w-5 h-5 text-stone-400 group-hover:text-green-500 transition-colors" />
        )}
      </button>
    </>
  );
}
