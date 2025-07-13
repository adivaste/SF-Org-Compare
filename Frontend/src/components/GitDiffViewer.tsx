import { DiffView, DiffModeEnum, SplitSide } from "@git-diff-view/react";
import { generateDiffFile } from "@git-diff-view/file";
import "@git-diff-view/react/styles/diff-view.css";
import { cn } from '@/lib/utils';
import { useMemo, useState, useEffect } from 'react';
import { CircleCheck } from 'lucide-react';
import { getHighlighter } from 'shiki';

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

  // Initialize Shiki highlighter
  useEffect(() => {
    const initHighlighter = async () => {
      const shiki = await getHighlighter({
        themes: ['github-light', 'github-dark'],
        langs: ['javascript', 'typescript', 'html', 'css', 'json', 'xml', 'yaml', 'sql', 'apex'],
      });
      setHighlighter(shiki);
    };
    initHighlighter();
  }, [options.theme]);

  // Check if files are identical
  const filesAreIdentical = originalCode === modifiedCode;

  const diffFile = useMemo(() => {
    // If files are identical, don't create a diff file at all
    if (originalCode === modifiedCode) {
      return undefined;
    }
    // Only create diff file when there are actual differences
    const file = generateDiffFile(
      "oldFile",
      originalCode,
      "newFile",
      modifiedCode,
      lang,
      lang
    );
    file.initTheme(options.theme || 'light');
    file.init();
    file.buildSplitDiffLines();
    file.buildUnifiedDiffLines();
    return file;
  }, [originalCode, modifiedCode, lang, options.theme]);

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
            <div className="text-2xl">🚫</div>
            <div className="text-base font-medium">{title} not present in this branch</div>
            <div className="text-xs text-muted-foreground">No file found in this branch for the selected path.</div>
          </div>
        </div>
      );
    }
    const fontSize = options.fontSize || 14;
    const theme = options.theme === 'dark' ? 'github-dark' : 'github-light';
    // Generate highlighted HTML if highlighter is ready
    const highlightedHtml = highlighter && options.enableSyntaxHighlight !== false
      ? highlighter.codeToHtml(content, { lang, theme })
      : `<pre><code>${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`;
    const lines = content.split('\n');
    const lineNumbers = lines.map((_, index) => index + 1).join('\n');
    return (
      <div className="h-full w-full overflow-auto custom-scrollbar">
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
                  className="select-none text-right pr-4 pl-4 py-4 border-r bg-muted/30 text-muted-foreground font-mono text-sm"
                  style={{ minWidth: '3em' }}
                >
                  <pre className="m-0">
                    {lineNumbers}
                  </pre>
                </div>
                {/* Code Content */}
                <div className="flex-1 overflow-auto">
                  <div 
                    className="p-4"
                    dangerouslySetInnerHTML={{ 
                      __html: highlightedHtml.replace(
                        '<pre><code>',
                        '<pre class="m-0"><code class="block">'
                      ).replace('</code></pre>', '</code></pre>')
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={cn("h-full w-full flex flex-col", className)}>
      <div className="flex-1 overflow-hidden">
        {viewMode === 'diff' && (
          <div className="h-full w-full overflow-auto pb-8 custom-scrollbar">
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
              diffViewTheme={options.theme || 'light'}
              diffViewAddWidget={options.enableWidgets}
              extendData={extendData}
              renderExtendLine={renderExtendLine}
              renderWidgetLine={renderWidgetLine}
              onAddWidgetClick={(lineNumber: number, side: SplitSide) => {
                console.log(`Add widget clicked on ${side} side, line ${lineNumber}`);
              }}
            />
          </div>
        )}
        {viewMode === 'source' && renderFileContent(originalCode, 'Source File')}
        {viewMode === 'target' && renderFileContent(modifiedCode, 'Target File')}
      </div>
    </div>
  );
} 