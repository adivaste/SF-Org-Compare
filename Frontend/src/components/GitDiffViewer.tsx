import { DiffView, DiffModeEnum, SplitSide } from "@git-diff-view/react";
import { generateDiffFile } from "@git-diff-view/file";
import "@git-diff-view/react/styles/diff-view.css";
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

interface GitDiffViewerProps {
  originalCode: string;
  modifiedCode: string;
  language?: string;
  className?: string;
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
}

// Map of file extensions to language names
const languageMap: Record<string, string> = {
  'cls': 'java', // Use Java highlighting for Apex
  'trigger': 'java',
  'apex': 'java',
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

export function GitDiffViewer({
  originalCode,
  modifiedCode,
  language = 'apex',
  className,
  options = {}
}: GitDiffViewerProps) {
  const lang = languageMap[language.toLowerCase()] || 'plaintext';

  const diffFile = useMemo(() => {
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

  return (
    <div className={cn("h-full w-full overflow-auto pb-8", className)}>
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
  );
} 