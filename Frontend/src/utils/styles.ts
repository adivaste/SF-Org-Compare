import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const fonts = {
  mono: 'JetBrains Mono, Fira Code, Consolas, Monaco, monospace',
  sans: 'Inter, system-ui, -apple-system, sans-serif',
};

export const syntaxThemes = {
  light: {
    name: 'Light',
    theme: {
      plain: {
        color: '#24292e',
        backgroundColor: '#ffffff',
      },
      styles: [
        {
          types: ['comment', 'prolog', 'doctype', 'cdata'],
          style: {
            color: '#6a737d',
            fontStyle: 'italic',
          },
        },
        {
          types: ['namespace'],
          style: {
            opacity: 0.7,
          },
        },
        {
          types: ['string', 'attr-value'],
          style: {
            color: '#032f62',
          },
        },
        {
          types: ['punctuation', 'operator'],
          style: {
            color: '#24292e',
          },
        },
        {
          types: ['entity', 'url', 'symbol', 'number', 'boolean', 'variable', 'constant', 'property', 'regex', 'inserted'],
          style: {
            color: '#005cc5',
          },
        },
        {
          types: ['atrule', 'keyword', 'attr-name', 'selector'],
          style: {
            color: '#d73a49',
          },
        },
        {
          types: ['function', 'deleted', 'tag'],
          style: {
            color: '#6f42c1',
          },
        },
        {
          types: ['function-variable'],
          style: {
            color: '#6f42c1',
          },
        },
        {
          types: ['tag', 'selector', 'keyword'],
          style: {
            color: '#22863a',
          },
        },
      ],
    },
  },
  dark: {
    name: 'Dark',
    theme: {
      plain: {
        color: '#e4e4e4',
        backgroundColor: '#1a1a1a',
      },
      styles: [
        {
          types: ['comment', 'prolog', 'doctype', 'cdata'],
          style: {
            color: '#999',
            fontStyle: 'italic',
          },
        },
        {
          types: ['namespace'],
          style: {
            opacity: 0.7,
          },
        },
        {
          types: ['string', 'attr-value'],
          style: {
            color: '#8dc891',
          },
        },
        {
          types: ['punctuation', 'operator'],
          style: {
            color: '#e4e4e4',
          },
        },
        {
          types: ['entity', 'url', 'symbol', 'number', 'boolean', 'variable', 'constant', 'property', 'regex', 'inserted'],
          style: {
            color: '#79b6f2',
          },
        },
        {
          types: ['atrule', 'keyword', 'attr-name', 'selector'],
          style: {
            color: '#c5a5c5',
          },
        },
        {
          types: ['function', 'deleted', 'tag'],
          style: {
            color: '#f08d49',
          },
        },
        {
          types: ['function-variable'],
          style: {
            color: '#f08d49',
          },
        },
        {
          types: ['tag', 'selector', 'keyword'],
          style: {
            color: '#cc99cd',
          },
        },
      ],
    },
  },
}; 