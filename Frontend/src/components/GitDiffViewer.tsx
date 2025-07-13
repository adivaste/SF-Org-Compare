import { DiffView, DiffModeEnum, SplitSide } from "@git-diff-view/react";
import { generateDiffFile } from "@git-diff-view/file";
import "@git-diff-view/react/styles/diff-view.css";
import { cn } from '@/lib/utils';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { BinaryIcon, CircleCheck, CircleXIcon } from 'lucide-react';
import { getHighlighter } from 'shiki';
import React from 'react';

// ScrollableArea component with built-in scroll detection
const ScrollableArea: React.FC<{
  children: React.ReactNode;
  className?: string;
  onScroll?: (event: React.UIEvent) => void;
}> = React.forwardRef<HTMLDivElement, {
  children: React.ReactNode;
  className?: string;
  onScroll?: (event: React.UIEvent) => void;
}>(({ children, className, onScroll }, ref) => {
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    target.classList.add('scrolling');
    
    clearTimeout((target as any).scrollTimeout);
    (target as any).scrollTimeout = setTimeout(() => {
      target.classList.remove('scrolling');
    }, 300);
    
    onScroll?.(event);
  }, [onScroll]);

  return (
    <div
      ref={ref}
      className={cn('custom-scrollbar', className)}
      onScroll={handleScroll}
    >
      {children}
    </div>
  );
});

ScrollableArea.displayName = 'ScrollableArea';

interface GitDiffViewerProps {
  originalCode: string;
  modifiedCode: string;
  language?: string;
  className?: string;
  notPresentInSource?: boolean;
  notPresentInTarget?: boolean;
  options?: {
    fontSize?: number;
    showDiffOnly?: boolean;
    extraLines?: number;
    renderSideBySide?: boolean;
    enableSyntaxHighlight?: boolean;
    wrapLines?: boolean;
    theme?: 'light' | 'dark';
    enableWidgets?: boolean;
    enableExtendData?: boolean;
  };
  viewMode: ViewMode;
}

// Map of file extensions to language names
const languageMap: Record<string, string> = {
  'cls': 'apex', // Use Apex highlighting for Salesforce classes
  'trigger': 'apex',
  'apex': 'apex',
  'soql': 'sql',
  'page': 'html',
  'component': 'html',
  'js': 'javascript',
  'javascript': 'javascript',
  'mjs': 'javascript',
  'cjs': 'javascript',
  'ts': 'typescript',
  'typescript': 'typescript',
  'jsx': 'javascript',
  'tsx': 'typescript',
  'json': 'json',
  'xml': 'xml',
  'css': 'css',
  'scss': 'scss',
  'sass': 'scss',
  'html': 'html',
  'htm': 'html',
  'yaml': 'yaml',
  'yml': 'yaml',
  'md': 'markdown',
  'markdown': 'markdown',
  'sql': 'sql',
  'txt': 'plaintext',
  'text': 'plaintext',
};

type ViewMode = 'diff' | 'source' | 'target';

export function GitDiffViewer({
  originalCode,
  modifiedCode,
  language = 'apex',
  className,
  notPresentInSource = false,
  notPresentInTarget = false,
  options = {},
  viewMode,
}: GitDiffViewerProps) {
  const [highlighter, setHighlighter] = useState<any>(null);
  const lang = languageMap[language.toLowerCase()] || 'plaintext';

  // Debug logging
  console.log('GitDiffViewer language detection:', {
    inputLanguage: language,
    mappedLanguage: lang,
    languageMap: languageMap,
    isJavaScript: language.toLowerCase() === 'js' || language.toLowerCase() === 'javascript'
  });

  // Initialize Shiki highlighter
  useEffect(() => {
    const initHighlighter = async () => {
      try {
        const shiki = await getHighlighter({
          themes: ['github-light', 'github-dark'],
          langs: [
            'javascript',
            'typescript', 
            'html', 
            'css', 
            'json', 
            'xml', 
            'yaml', 
            'sql', 
            'apex',
            'markdown',
            'js', // Add explicit js support
            'jsx',
            'tsx',
            'scss',
            'sass'
          ],
        });
        setHighlighter(shiki);
        console.log('Shiki highlighter initialized successfully with languages:', shiki.getLoadedLanguages());
      } catch (error) {
        console.error('Failed to initialize shiki highlighter:', error);
      }
    };
    initHighlighter();
  }, []);

  // Create a custom theme based on GitHub dark but with our background color
  const createCustomTheme = useCallback(() => {
    if (!highlighter) return null;
    
    try {
      // Get the GitHub dark theme
      const githubDarkTheme = highlighter.getTheme('github-dark');
      
      // Create a custom theme with our background color
      const customTheme = {
        ...githubDarkTheme,
        bg: 'hsl(var(--background))', // Use our theme's background color
        color: githubDarkTheme.color, // Keep the original text color
      };
      
      return customTheme;
    } catch (error) {
      console.warn('Failed to create custom theme:', error);
      return null;
    }
  }, [highlighter]);

  const diffFile = useMemo(() => {
    // If files are identical, don't create a diff file at all
    if (originalCode === modifiedCode) {
      return undefined;
    }
    
    // Ensure we have a valid language for JavaScript files in diff view
    let diffLang = lang;
    if (language.toLowerCase() === 'js' || language.toLowerCase() === 'javascript') {
      diffLang = 'javascript';
      console.log('Diff view: Using JavaScript language for .js files');
    }
    
    console.log('Creating diff file with language:', {
      inputLanguage: language,
      mappedLanguage: lang,
      finalLanguage: diffLang
    });
    
    // Only create diff file when there are actual differences
    const file = generateDiffFile(
      "oldFile",
      originalCode,
      "newFile",
      modifiedCode,
      diffLang,
      diffLang
    );
    file.initTheme(options.theme || 'light');
    file.init();
    file.buildSplitDiffLines();
    file.buildUnifiedDiffLines();
    return file;
  }, [originalCode, modifiedCode, lang, language, options.theme]);

  // Sample extend data for demonstration
  const extendData = useMemo(() => {
    if (!options.enableExtendData) return undefined;
    
    return {
      oldFile: {
        3: { data: 'This line has additional context' },
        7: { data: 'Important change here' }
      },
      newFile: {
        5: { data: 'New functionality added' },
        9: { data: 'Enhanced logic' }
      }
    };
  }, [options.enableExtendData]);

  // Sample widget renderer
  const renderWidgetLine = useMemo(() => {
    if (!options.enableWidgets) return undefined;
    
    return ({ onClose, side, lineNumber }: any) => (
      <div className="bg-blue-50 border-l-4 border-blue-400 p-2 text-sm">
        <div className="flex justify-between items-center">
          <span>Widget on {side} side, line {lineNumber}</span>
          <button onClick={onClose} className="text-blue-600 hover:text-blue-800">
            ×
          </button>
        </div>
      </div>
    );
  }, [options.enableWidgets]);

  // Sample extend line renderer
  const renderExtendLine = useMemo(() => {
    if (!options.enableExtendData) return undefined;
    
    return ({ data }: any) => (
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-2 text-sm">
        <span className="text-yellow-800">{data}</span>
      </div>
    );
  }, [options.enableExtendData]);

  // If files are identical, show a message only in Diff view
  if (originalCode === modifiedCode && viewMode === 'diff') {
    return (
      <div className={cn("h-full w-full flex flex-col", className)}>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <CircleCheck className="h-8 w-8 text-green-500 mx-auto" />
            <div className="space-y-2">
              {/* <h3 className="text-lg font-semibold text-foreground">Files are identical</h3> */}
              <p className="text-sm text-muted-foreground">
                The source and target versions of this file have the same content.
              </p>
            </div>
            <div className="text-xs text-muted-foreground">
              <p>Lines: {originalCode.split('\n').length}  |  Characters: {originalCode.length}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show file not present message in Diff view if either side is missing
  if ((originalCode == null || modifiedCode == null) && viewMode === 'diff') {
    return (
      <div className={cn("h-full w-full flex flex-col", className)}>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="text-2xl">🚫</div>
            <div className="text-base font-medium">
              {originalCode == null && modifiedCode == null && 'File not present in both branches'}
              {originalCode == null && modifiedCode != null && 'File not present in source branch'}
              {originalCode != null && modifiedCode == null && 'File not present in target branch'}
            </div>
            <div className="text-xs text-muted-foreground">No file found in one or both branches for the selected path.</div>
          </div>
        </div>
      </div>
    );
  }

  // If no diff file was created (shouldn't happen here, but safety check)
  if (viewMode === 'diff' && !diffFile) {
    return (
      <div className={cn("h-full w-full flex items-center justify-center", className)}>
        <div className="text-center">
          <p className="text-muted-foreground">Unable to generate diff</p>
        </div>
      </div>
    );
  }

  // Show file not present message in Source/Target view if missing
  const renderFileContent = (content: string | null, title: string) => {
    console.log('renderFileContent', content, title);
    if (content == null || content.length === 0 || content.trim() === '') {
      return (
        <div className="h-full w-full flex items-center justify-center">
          <div className="text-center space-y-2">
            <CircleXIcon className="h-8 w-8 text-red-500 mx-auto" />
            <div className="text-base font-medium">{title} not present in this branch</div>
            <div className="text-xs text-muted-foreground">No file found in this branch for the selected path.</div>
          </div>
        </div>
      );
    }

    // Check if content is binary
    const isBinary = (text: string) => {
      // Check for null bytes or other binary indicators
      if (text.includes('\0')) return true;
      
      // Check if more than 30% of characters are non-printable
      const nonPrintable = text.split('').filter(char => {
        const code = char.charCodeAt(0);
        return code < 32 && code !== 9 && code !== 10 && code !== 13; // Exclude tab, newline, carriage return
      }).length;
      
      return (nonPrintable / text.length) > 0.3;
    };

    if (isBinary(content)) {
      return (
        <div className="h-full w-full flex items-center justify-center">
          <div className="text-center space-y-4">
            <BinaryIcon className="h-8 w-8 text-red-500 mx-auto" />
            <div className="text-base font-medium">Binary file detected</div>
            <div className="text-xs text-muted-foreground">
              This file contains binary data and cannot be displayed as text.
            </div>
            <div className="text-xs text-muted-foreground">
              File size: {content.length} bytes
            </div>
          </div>
        </div>
      );
    }

    const fontSize = options.fontSize || 14;
    const theme = (options.theme === 'dark' ? 'github-dark' : 'github-light');
    
    // Generate highlighted HTML if highlighter is ready
    let highlightedHtml: string;
    if (highlighter && options.enableSyntaxHighlight !== false) {
      console.log('Generating syntax highlighting for:', {
        lang,
        theme: options.theme,
        contentLength: content.length,
        highlighterReady: !!highlighter
      });
      
      // Ensure we have a valid language for JavaScript files
      let finalLang = lang;
      if (language.toLowerCase() === 'js' || language.toLowerCase() === 'javascript') {
        finalLang = 'javascript';
        console.log('Forcing JavaScript language for .js files');
      }
      
      if (options.theme === 'dark') {
        // Try to use custom theme first
        const customTheme = createCustomTheme();
        if (customTheme) {
          try {
            highlightedHtml = highlighter.codeToHtml(content, { 
              lang: finalLang, 
              theme: customTheme 
            });
            console.log('Used custom theme for syntax highlighting');
          } catch (error) {
            console.warn('Failed to use custom theme, falling back to regex replacement:', error);
            // Fallback to regex replacement
            highlightedHtml = highlighter.codeToHtml(content, { lang: finalLang, theme: 'github-dark' });
            console.log('Used fallback regex replacement for syntax highlighting');
            highlightedHtml = highlightedHtml
              // Replace hex background colors
              .replace(
                /background-color:\s*#[0-9a-fA-F]{6}/g,
                'background-color: hsl(var(--background))'
              )
              // Replace hex background shorthand
              .replace(
                /background:\s*#[0-9a-fA-F]{6}/g,
                'background: hsl(var(--background))'
              )
              // Replace rgb background colors
              .replace(
                /background-color:\s*rgb\([^)]+\)/g,
                'background-color: hsl(var(--background))'
              )
              // Replace rgb background shorthand
              .replace(
                /background:\s*rgb\([^)]+\)/g,
                'background: hsl(var(--background))'
              )
              // Replace any remaining background colors with hex values
              .replace(
                /background-color:\s*#[0-9a-fA-F]{3,8}/g,
                'background-color: hsl(var(--background))'
              )
              .replace(
                /background:\s*#[0-9a-fA-F]{3,8}/g,
                'background: hsl(var(--background))'
              );
          }
        } else {
          // Fallback to regex replacement
          highlightedHtml = highlighter.codeToHtml(content, { lang: finalLang, theme: 'github-dark' });
          console.log('Used regex replacement for syntax highlighting');
          highlightedHtml = highlightedHtml
            // Replace hex background colors
            .replace(
              /background-color:\s*#[0-9a-fA-F]{6}/g,
              'background-color: hsl(var(--background))'
            )
            // Replace hex background shorthand
            .replace(
              /background:\s*#[0-9a-fA-F]{6}/g,
              'background: hsl(var(--background))'
            )
            // Replace rgb background colors
            .replace(
              /background-color:\s*rgb\([^)]+\)/g,
              'background-color: hsl(var(--background))'
            )
            // Replace rgb background shorthand
            .replace(
              /background:\s*rgb\([^)]+\)/g,
              'background: hsl(var(--background))'
            )
            // Replace any remaining background colors with hex values
            .replace(
              /background-color:\s*#[0-9a-fA-F]{3,8}/g,
              'background-color: hsl(var(--background))'
            )
            .replace(
              /background:\s*#[0-9a-fA-F]{3,8}/g,
              'background: hsl(var(--background))'
            );
        }
      } else {
        // Light theme - use standard GitHub light theme
        highlightedHtml = highlighter.codeToHtml(content, { lang: finalLang, theme: 'github-light' });
        console.log('Used GitHub light theme for syntax highlighting');
      }
    } else {
      highlightedHtml = `<pre><code>${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`;
      console.log('No syntax highlighting applied');
    }
    const lines = content.split('\n');
    const lineNumbers = lines.map((_, index) => index + 1).join('\n');
    
    console.log('Line numbers debug:', {
      totalLines: lines.length,
      lineNumbers: lineNumbers,
      lastLineNumber: lines.length,
      contentLength: content.length
    });
    
    return (
      <ScrollableArea className="h-full w-full overflow-auto">
        <div className="p-4">
          <div className="bg-background border rounded-lg overflow-hidden">
            <div className="px-4 py-2 border-b bg-muted/50">
              <h3 className="text-sm font-medium">{title}</h3>
            </div>
            <div className="relative">
              <div 
                className="flex"
                style={{ fontSize: `${fontSize}px`, lineHeight: '1.5' }}
              >
                {/* Line Numbers */}
                <div 
                  className="select-none text-right pr-4 pl-4 py-4 border-r bg-muted/30 text-muted-foreground font-mono text-sm sticky left-0"
                  style={{ 
                    minWidth: '3.5em',
                    lineHeight: '1.5',
                    fontSize: `${fontSize}px`,
                    height: 'fit-content'
                  }}
                >
                  <pre className="m-0" style={{ lineHeight: '1.5', margin: 0, padding: 0 }}>
                    {lineNumbers}
                  </pre>
                </div>
                {/* Code Content */}
                <div className="flex-1 overflow-auto">
                  <div 
                    className="p-4"
                    style={{ lineHeight: '1.5' }}
                    dangerouslySetInnerHTML={{ 
                      __html: highlightedHtml.replace(
                        '<pre><code>',
                        '<pre class="m-0" style="line-height: 1.5;"><code class="block">'
                      ).replace('</code></pre>', '</code></pre>')
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </ScrollableArea>
    );
  };

  return (
    <div className={cn("h-full w-full flex flex-col", className)}>
      <div className="flex-1 overflow-hidden">
        {viewMode === 'diff' && (
          <ScrollableArea className="h-full w-full overflow-auto pb-8">
            {(notPresentInSource || notPresentInTarget) && (
              <div className="sticky top-0 z-10 bg-background border-b p-3">
                <div className="flex items-center gap-4 text-sm">
                  {notPresentInSource && (
                    <div className="flex items-center gap-2 text-blue-600">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      <span className="font-medium">Not present in source</span>
                    </div>
                  )}
                  {notPresentInTarget && (
                    <div className="flex items-center gap-2 text-orange-600">
                      <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                      <span className="font-medium">Not present in target</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            <DiffView
              diffFile={diffFile}
              diffViewFontSize={options.fontSize || 14}
              diffViewHighlight={options.enableSyntaxHighlight ?? true}
              diffViewMode={options.renderSideBySide ? DiffModeEnum.Split : DiffModeEnum.Unified}
              diffViewWrap={options.wrapLines ?? false}
              diffViewTheme={options.theme === 'dark' ? 'dark' : 'light'}
              diffViewAddWidget={options.enableWidgets}
              extendData={extendData}
              renderExtendLine={renderExtendLine}
              renderWidgetLine={renderWidgetLine}
              onAddWidgetClick={(lineNumber: number, side: SplitSide) => {
                console.log(`Add widget clicked on ${side} side, line ${lineNumber}`);
              }}
            />
          </ScrollableArea>
        )}
        {viewMode === 'source' && renderFileContent(originalCode, 'Source File')}
        {viewMode === 'target' && renderFileContent(modifiedCode, 'Target File')}
      </div>
    </div>
  );
} 