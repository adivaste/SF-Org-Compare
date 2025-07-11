import ReactDiffViewer from 'react-diff-viewer-continued';
import { useEffect, useState, useMemo } from 'react';
import { useTheme } from '../hooks/useTheme';
import { fonts } from '../utils/styles';
import { Highlight, themes } from 'prism-react-renderer';
import type { Language } from 'prism-react-renderer';

interface DiffEditorProps {
  originalCode: string;
  modifiedCode: string;
  language?: string;
  options?: {
    fontSize?: number;
    renderSideBySide?: boolean;
    showDiffOnly?: boolean;
    extraLines?: number;
  };
}

// Map of supported languages
const supportedLanguages: { [key: string]: Language } = {
  typescript: 'tsx',
  javascript: 'jsx',
  python: 'python',
  java: 'java',
  cpp: 'cpp',
  csharp: 'csharp',
  go: 'go',
  rust: 'rust',
  php: 'php',
  ruby: 'ruby',
  swift: 'swift',
  kotlin: 'kotlin',
  scala: 'scala',
  html: 'html',
  css: 'css',
  json: 'json',
  yaml: 'yaml',
  markdown: 'markdown',
  shell: 'bash',
  sql: 'sql',
  plaintext: 'txt'
};

const DiffEditor = ({
  originalCode = '',
  modifiedCode = '',
  language = 'typescript',
  options = {}
}: DiffEditorProps) => {
  const { isDarkTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Ensure we use a supported language or fallback to plaintext
  const prismLanguage = useMemo(() => {
    const lang = language.toLowerCase();
    return supportedLanguages[lang] || 'tsx';
  }, [language]);

  const highlightCode = (str: string = '') => (
    <Highlight
      theme={isDarkTheme ? themes.nightOwl : themes.github}
      code={str}
      language={prismLanguage as Language}
    >
      {({ className, style, tokens, getLineProps, getTokenProps }) => (
        <pre className={className} style={{ ...style, background: 'transparent' }}>
          {tokens.map((line, i) => (
            <div key={i} {...getLineProps({ line })}>
              {line.map((token, key) => (
                <span key={key} {...getTokenProps({ token })} />
              ))}
            </div>
          ))}
        </pre>
      )}
    </Highlight>
  );

  const styles = useMemo(() => ({
    variables: {
      dark: {
        diffViewerBackground: '#0d1117',
        diffViewerColor: '#e6edf3',
        addedBackground: '#1b4721',
        addedColor: '#e6edf3',
        removedBackground: '#4e2936',
        removedColor: '#e6edf3',
        wordAddedBackground: '#2b6a30',
        wordRemovedBackground: '#6e3c49',
        addedGutterBackground: '#1b4721',
        removedGutterBackground: '#4e2936',
        gutterBackground: '#0d1117',
        gutterBackgroundDark: '#161b22',
        highlightBackground: '#2e4c77',
        highlightGutterBackground: '#2e4c77',
        codeFoldGutterBackground: '#161b22',
        codeFoldBackground: '#161b22',
        emptyLineBackground: '#161b22',
        gutterColor: '#484f58',
        addedGutterColor: '#7ee787',
        removedGutterColor: '#ffa198',
        codeFoldContentColor: '#484f58',
        diffViewerTitleBackground: '#161b22',
        diffViewerTitleColor: '#e6edf3',
        diffViewerTitleBorderColor: '#30363d',
      },
      light: {
        diffViewerBackground: '#ffffff',
        diffViewerColor: '#24292f',
        addedBackground: '#e6ffec',
        addedColor: '#24292f',
        removedBackground: '#ffebe9',
        removedColor: '#24292f',
        wordAddedBackground: '#abf2bc',
        wordRemovedBackground: '#ffd7d5',
        addedGutterBackground: '#ccffd8',
        removedGutterBackground: '#ffd7d5',
        gutterBackground: '#f6f8fa',
        gutterBackgroundDark: '#f0f2f4',
        highlightBackground: '#fff8c5',
        highlightGutterBackground: '#fff8c5',
        codeFoldGutterBackground: '#f6f8fa',
        codeFoldBackground: '#f6f8fa',
        emptyLineBackground: '#f6f8fa',
        gutterColor: '#57606a',
        addedGutterColor: '#1a7f37',
        removedGutterColor: '#cf222e',
        codeFoldContentColor: '#57606a',
        diffViewerTitleBackground: '#f6f8fa',
        diffViewerTitleColor: '#24292f',
        diffViewerTitleBorderColor: '#d0d7de',
      }
    },
    contentText: {
      fontSize: `${options.fontSize || 14}px`,
      lineHeight: '1.5',
      fontFamily: fonts.mono,
    },
    line: {
      padding: '4px 2px',
    },
    gutter: {
      padding: '4px 10px',
    },
  }), [options.fontSize]);

  if (!mounted) {
    return null;
  }

  return (
    <div className="h-full w-full overflow-auto bg-white dark:bg-[#0d1117] rounded-lg">
      <ReactDiffViewer
        oldValue={originalCode}
        newValue={modifiedCode}
        splitView={options.renderSideBySide ?? true}
        useDarkTheme={isDarkTheme}
        styles={styles}
        hideLineNumbers={false}
        showDiffOnly={options.showDiffOnly ?? false}
        extraLinesSurroundingDiff={options.extraLines ?? 3}
        renderContent={highlightCode}
        codeFoldMessageRenderer={(totalFoldedLines: number) => (
          <span className="text-gray-500 dark:text-gray-400 text-sm italic font-mono">
            ⋯ {totalFoldedLines} hidden lines ⋯
          </span>
        )}
      />
    </div>
  );
};

export default DiffEditor; 