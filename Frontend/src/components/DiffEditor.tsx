import { DiffEditor as MonacoDiffEditor } from '@monaco-editor/react';
import { useEffect, useState } from 'react';

interface DiffEditorProps {
  originalCode: string;
  modifiedCode: string;
  language?: string;
  theme?: string;
  options?: any;
}

const DiffEditor = ({
  originalCode,
  modifiedCode,
  language = 'typescript',
  theme = 'vs-dark',
  options = {}
}: DiffEditorProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const defaultOptions = {
    renderSideBySide: true,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
    diffWordWrap: 'on',
    ...options
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="h-full w-full">
      <MonacoDiffEditor
        original={originalCode}
        modified={modifiedCode}
        language={language}
        theme={theme}
        options={defaultOptions}
        height="100%"
      />
    </div>
  );
};

export default DiffEditor; 