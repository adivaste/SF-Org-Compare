import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { getStatusColor } from '@/lib/colors';
import type { StatusType } from '@/lib/colors';
import { cn } from '@/lib/utils';

interface StatusDotProps {
  status: StatusType;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showAnimation?: boolean;
}

export const StatusDot: React.FC<StatusDotProps> = ({
  status,
  className = '',
  size = 'md',
  showAnimation = false,
}) => {
  const { theme } = useTheme();
  const color = getStatusColor(theme, status);

  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  const animationClass = showAnimation && status === 'comparisonInProgress' 
    ? 'status-dot-comparison' 
    : '';

  return (
    <div
      className={cn(
        'rounded-full flex-shrink-0 cursor-help',
        sizeClasses[size],
        animationClass,
        className
      )}
      style={{ backgroundColor: color }}
      title={status.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
    />
  );
}; 