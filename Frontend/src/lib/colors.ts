// Centralized color configuration for light and dark modes
export const colors = {
  light: {
    // Semantic colors
    background: 'hsl(0 0% 100%)',
    foreground: 'hsl(0 0% 3.9%)',
    card: 'hsl(0 0% 100%)',
    cardForeground: 'hsl(0 0% 3.9%)',
    popover: 'hsl(0 0% 100%)',
    popoverForeground: 'hsl(0 0% 3.9%)',
    primary: 'hsl(0 0% 9%)',
    primaryForeground: 'hsl(0 0% 98%)',
    secondary: 'hsl(0 0% 96.1%)',
    secondaryForeground: 'hsl(0 0% 9%)',
    muted: 'hsl(0 0% 96.1%)',
    mutedForeground: 'hsl(0 0% 45.1%)',
    accent: 'hsl(0 0% 96.1%)',
    accentForeground: 'hsl(0 0% 9%)',
    destructive: 'hsl(0 84.2% 60.2%)',
    destructiveForeground: 'hsl(0 0% 98%)',
    border: 'hsl(0 0% 89.8%)',
    input: 'hsl(0 0% 89.8%)',
    ring: 'hsl(0 0% 3.9%)',
    
    // File type colors
    fileTypes: {
      cls: 'hsl(217 91% 60%)', // blue-500
      trigger: 'hsl(25 95% 53%)', // orange-500
      js: 'hsl(45 93% 47%)', // yellow-500
      html: 'hsl(0 84% 60%)', // red-500
      css: 'hsl(262 83% 58%)', // purple-500
      page: 'hsl(142 76% 36%)', // green-500
      diff: 'hsl(238 100% 67%)', // indigo-500
      lazy: 'hsl(187 100% 42%)', // cyan-500
      default: 'hsl(220 9% 46%)', // gray-500
    },
    
    // Status colors
    status: {
      matched: 'hsl(142 76% 36%)', // green-400
      modified: 'hsl(45 93% 47%)', // yellow-400
      onlyInSource: 'hsl(217 91% 60%)', // blue-400
      onlyInTarget: 'hsl(25 95% 53%)', // orange-400
      comparisonInProgress: 'hsl(220 9% 46%)', // gray-400
      comparisonFailed: 'hsl(0 84% 60%)', // red-400
    },
    
    // Search highlighting
    search: {
      highlight: 'hsl(45 93% 47%)', // yellow-200
      highlightText: 'hsl(45 93% 20%)', // yellow-900
    },
    
    // Branch colors
    branches: {
      source: 'hsl(217 91% 60%)', // blue-500
      target: 'hsl(25 95% 53%)', // orange-500
    },
    
    // Scrollbar colors
    scrollbar: {
      track: 'transparent',
      thumb: 'hsla(220 9% 46% 0.3)', // gray-400 with opacity
      thumbHover: 'hsla(220 9% 46% 0.5)', // gray-400 with opacity
    },
  },
  
  dark: {
    // Semantic colors
    background: 'hsl(0 0% 3.9%)',
    foreground: 'hsl(0 0% 98%)',
    card: 'hsl(0 0% 3.9%)',
    cardForeground: 'hsl(0 0% 98%)',
    popover: 'hsl(0 0% 3.9%)',
    popoverForeground: 'hsl(0 0% 98%)',
    primary: 'hsl(0 0% 98%)',
    primaryForeground: 'hsl(0 0% 9%)',
    secondary: 'hsl(0 0% 14.9%)',
    secondaryForeground: 'hsl(0 0% 98%)',
    muted: 'hsl(0 0% 14.9%)',
    mutedForeground: 'hsl(0 0% 63.9%)',
    accent: 'hsl(0 0% 14.9%)',
    accentForeground: 'hsl(0 0% 98%)',
    destructive: 'hsl(0 62.8% 30.6%)',
    destructiveForeground: 'hsl(0 0% 98%)',
    border: 'hsl(0 0% 14.9%)',
    input: 'hsl(0 0% 14.9%)',
    ring: 'hsl(0 0% 83.1%)',
    
    // File type colors (adjusted for dark mode)
    fileTypes: {
      cls: 'hsl(217 91% 70%)', // lighter blue
      trigger: 'hsl(25 95% 65%)', // lighter orange
      js: 'hsl(45 93% 60%)', // lighter yellow
      html: 'hsl(0 84% 70%)', // lighter red
      css: 'hsl(262 83% 70%)', // lighter purple
      page: 'hsl(142 76% 50%)', // lighter green
      diff: 'hsl(238 100% 75%)', // lighter indigo
      lazy: 'hsl(187 100% 55%)', // lighter cyan
      default: 'hsl(220 9% 60%)', // lighter gray
    },
    
    // Status colors (adjusted for dark mode)
    status: {
      matched: 'hsl(142 76% 50%)', // lighter green
      modified: 'hsl(45 93% 60%)', // lighter yellow
      onlyInSource: 'hsl(217 91% 70%)', // lighter blue
      onlyInTarget: 'hsl(25 95% 65%)', // lighter orange
      comparisonInProgress: 'hsl(220 9% 60%)', // lighter gray
      comparisonFailed: 'hsl(0 84% 70%)', // lighter red
    },
    
    // Search highlighting (adjusted for dark mode)
    search: {
      highlight: 'hsl(45 93% 20%)', // darker yellow background
      highlightText: 'hsl(45 93% 90%)', // lighter yellow text
    },
    
    // Branch colors (adjusted for dark mode)
    branches: {
      source: 'hsl(217 91% 70%)', // lighter blue
      target: 'hsl(25 95% 65%)', // lighter orange
    },
    
    // Scrollbar colors (adjusted for dark mode)
    scrollbar: {
      track: 'transparent',
      thumb: 'hsla(220 9% 60% 0.4)', // lighter gray with opacity
      thumbHover: 'hsla(220 9% 60% 0.6)', // lighter gray with opacity
    },
  },
} as const;

// Type definitions
export type ColorMode = 'light' | 'dark';
export type FileType = keyof typeof colors.light.fileTypes;
export type StatusType = keyof typeof colors.light.status;

// Utility functions
export const getColor = (mode: ColorMode, category: keyof typeof colors.light, key?: string) => {
  const colorSet = colors[mode];
  if (key) {
    return (colorSet[category] as any)[key];
  }
  return colorSet[category];
};

export const getFileTypeColor = (mode: ColorMode, fileType: FileType) => {
  return colors[mode].fileTypes[fileType];
};

export const getStatusColor = (mode: ColorMode, status: StatusType) => {
  return colors[mode].status[status];
};

export const getSearchHighlightColor = (mode: ColorMode, type: 'background' | 'text') => {
  const searchColors = colors[mode].search;
  return type === 'background' ? searchColors.highlight : searchColors.highlightText;
};

export const getBranchColor = (mode: ColorMode, branch: 'source' | 'target') => {
  return colors[mode].branches[branch];
}; 