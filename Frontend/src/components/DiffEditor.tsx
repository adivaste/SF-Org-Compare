import { useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor';
import { DiffEditor as MonacoDiffEditor } from '@monaco-editor/react';
import { cn } from '@/lib/utils';

interface DiffEditorProps {
  originalCode: string;
  modifiedCode: string;
  language?: string;
  className?: string;
  options?: {
    fontSize?: number;
    contextLines?: number;
    wordWrap?: boolean;
  };
}

// Map of Salesforce file extensions to Monaco language IDs
const languageMap: Record<string, string> = {
  'cls': 'apex',
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

// Register Apex language if not already registered
const registerApexLanguage = () => {
  monaco.languages.register({ id: 'apex' });
  monaco.languages.setMonarchTokensProvider('apex', {
    tokenizer: {
      root: [
        [/[A-Z][\w$]*/, 'type.identifier'],  // Class names
        [/\b(class|interface|enum)\b/, 'keyword'],
        [/\b(public|private|protected|global|virtual|override)\b/, 'keyword'],
        [/\b(if|else|while|do|for|return|continue|break)\b/, 'keyword'],
        [/\b(void|boolean|string|integer|decimal|date|datetime|id|list|set|map)\b/i, 'keyword'],
        [/\b(true|false|null)\b/, 'keyword'],
        [/\b(System|Database|List|Set|Map|String|Integer|Boolean|Decimal|Date|DateTime)\b/, 'type'],
        [/'[^']*'/, 'string'],
        [/"[^"]*"/, 'string'],
        [/\/\/.*/, 'comment'],
        [/\/\*/, 'comment', '@comment'],
      ],
      comment: [
        [/[^/*]+/, 'comment'],
        [/\*\//, 'comment', '@pop'],
        [/[/*]/, 'comment']
      ]
    }
  });
};

export function DiffEditor({
  originalCode,
  modifiedCode,
  language = 'apex',
  className,
  options = {}
}: DiffEditorProps) {
  const editorRef = useRef<any>(null);

  useEffect(() => {
    // Register Apex language support
    registerApexLanguage();
  }, []);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
    
    // Apply custom styles to the diff editor
    const originalEditor = editor.getOriginalEditor();
    const modifiedEditor = editor.getModifiedEditor();
    
    // Customize the editors
    [originalEditor, modifiedEditor].forEach(ed => {
      // Add custom CSS class for styling
      const editorDomNode = ed.getDomNode();
      if (editorDomNode) {
        editorDomNode.classList.add('custom-editor');
      }
    });
  };

  // Determine the language mode
  const getLanguageFromPath = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase() || '';
    return languageMap[ext] || 'plaintext';
  };

  const editorOptions = {
    readOnly: true,
    fontSize: options.fontSize || 14,
    lineHeight: 1.5,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    renderSideBySide: true,
    wordWrap: options.wordWrap ? ('on' as const) : ('off' as const),
    diffWordWrap: options.wordWrap ? ('on' as const) : ('off' as const),
    ignoreTrimWhitespace: false,
    renderIndicators: true,
    originalEditable: false,
    contextmenu: false,
    folding: true,
    lineNumbers: 'on' as const,
    renderOverviewRuler: false,
    diffAlgorithm: 'advanced' as const,
  };

  return (
    <div className={cn("h-full w-full overflow-hidden", className)}>
      <MonacoDiffEditor
        original={originalCode}
        modified={modifiedCode}
        language={getLanguageFromPath(language)}
        options={editorOptions}
        onMount={handleEditorDidMount}
        theme="vs"
        height="100%"
      />
    </div>
  );
} 