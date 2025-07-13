import React from 'react';
import { Code, FileIcon, FileText, Palette, Zap, GitCompare } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { getFileTypeColor } from '@/lib/colors';
import type { FileType } from '@/lib/colors';

interface FileIconProps {
  fileName: string;
  className?: string;
  size?: number;
}

export const FileIconComponent: React.FC<FileIconProps> = ({
  fileName,
  className = 'h-4 w-4',
  size = 16,
}) => {
  const { theme } = useTheme();
  
  const getFileType = (fileName: string): FileType => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'cls':
        return 'cls';
      case 'trigger':
        return 'trigger';
      case 'js':
        return 'js';
      case 'html':
        return 'html';
      case 'css':
        return 'css';
      case 'page':
        return 'page';
      case 'diff':
        return 'diff';
      case 'lazy':
        return 'lazy';
      default:
        return 'default';
    }
  };

  const fileType = getFileType(fileName);
  const color = getFileTypeColor(theme, fileType);

  const iconProps = {
    className,
    style: { color },
    size,
  };

  switch (fileType) {
    case 'cls':
    case 'js':
      return <Code {...iconProps} />;
    case 'trigger':
      return <Zap {...iconProps} />;
    case 'html':
    case 'page':
      return <FileText {...iconProps} />;
    case 'css':
      return <Palette {...iconProps} />;
    case 'diff':
    case 'lazy':
      return <GitCompare {...iconProps} />;
    default:
      return <FileIcon {...iconProps} />;
  }
}; 