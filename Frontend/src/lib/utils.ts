import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const fonts = {
  mono: 'JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  sans: 'Inter, system-ui, -apple-system, sans-serif',
} as const;

export function formatPath(path: string) {
  return path.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
}

export function getFileExtension(path: string) {
  return path.split('.').pop()?.toLowerCase() || '';
}

export function getLanguageFromExtension(ext: string): string {
  const extensionMap: Record<string, string> = {
    'cls': 'apex',
    'apex': 'apex',
    'soql': 'sql',
    'page': 'visualforce',
    'component': 'visualforce',
    'trigger': 'apex',
    'js': 'javascript',
    'ts': 'typescript',
    'jsx': 'javascript',
    'tsx': 'typescript',
    'json': 'json',
    'xml': 'xml',
    'css': 'css',
    'scss': 'scss',
    'html': 'html',
    'yaml': 'yaml',
    'yml': 'yaml',
  };
  return extensionMap[ext] || 'plaintext';
}

export function getFileIcon(path: string) {
  const ext = getFileExtension(path);
  const iconMap: Record<string, string> = {
    'cls': '⚡', // Apex Class
    'trigger': '🔥', // Apex Trigger
    'page': '📄', // Visualforce Page
    'component': '🧩', // Visualforce Component
    'js': '📜',
    'ts': '📜',
    'json': '📋',
    'xml': '📑',
    'css': '🎨',
    'scss': '🎨',
    'html': '🌐',
    'yaml': '⚙️',
    'yml': '⚙️',
  };
  return iconMap[ext] || '📄';
}

export function getOrgLabel(orgType: string) {
  const labels: Record<string, { label: string; color: string }> = {
    'production': { label: 'Production', color: 'text-red-500' },
    'sandbox': { label: 'Sandbox', color: 'text-yellow-500' },
    'scratch': { label: 'Scratch', color: 'text-green-500' },
    'developer': { label: 'Developer', color: 'text-blue-500' },
  };
  return labels[orgType.toLowerCase()] || { label: orgType, color: 'text-gray-500' };
}
