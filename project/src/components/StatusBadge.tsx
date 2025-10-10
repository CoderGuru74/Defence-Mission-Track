import { Shield, AlertTriangle, Activity, WifiOff } from 'lucide-react';

interface StatusBadgeProps {
  status: 'safe' | 'need_backup' | 'in_progress' | 'offline';
  size?: 'sm' | 'md' | 'lg';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'safe':
        return {
          icon: Shield,
          label: 'Safe',
          color: 'bg-green-900/30 text-green-400 border-green-700',
          iconColor: 'text-green-500'
        };
      case 'need_backup':
        return {
          icon: AlertTriangle,
          label: 'Need Backup',
          color: 'bg-red-900/30 text-red-400 border-red-700',
          iconColor: 'text-red-500'
        };
      case 'in_progress':
        return {
          icon: Activity,
          label: 'In Progress',
          color: 'bg-yellow-900/30 text-yellow-400 border-yellow-700',
          iconColor: 'text-yellow-500'
        };
      case 'offline':
        return {
          icon: WifiOff,
          label: 'Offline',
          color: 'bg-stone-800 text-stone-400 border-stone-700',
          iconColor: 'text-stone-500'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <div className={`inline-flex items-center gap-2 rounded-lg border ${config.color} ${sizeClasses[size]} font-medium transition-all duration-200 animate-scale-in`}>
      <Icon className={`${iconSizes[size]} ${config.iconColor}`} />
      <span>{config.label}</span>
    </div>
  );
}
