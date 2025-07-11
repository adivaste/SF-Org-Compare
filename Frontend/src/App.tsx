import { useState, useEffect } from 'react';
import Split from 'react-split';
import ThemeToggle from './components/ThemeToggle';
import FileTree from './components/FileTree';
import DiffEditor from './components/DiffEditor';
import SettingsPanel from './components/SettingsPanel';

interface FileNode {
  name: string;
  type: 'file' | 'directory';
  path: string;
  children?: FileNode[];
}

// Sample data structure for testing
const sampleData: FileNode = {
  name: 'root',
  type: 'directory',
  path: '/',
  children: [
    {
      name: 'src',
      type: 'directory',
      path: '/src',
      children: [
        {
          name: 'components',
          type: 'directory',
          path: '/src/components',
          children: [
            {
              name: 'App.tsx',
              type: 'file',
              path: '/src/components/App.tsx',
            },
            {
              name: 'Button.tsx',
              type: 'file',
              path: '/src/components/Button.tsx',
            },
          ],
        },
        {
          name: 'index.tsx',
          type: 'file',
          path: '/src/index.tsx',
        },
      ],
    },
    {
      name: 'package.json',
      type: 'file',
      path: '/package.json',
    },
  ],
};

const sampleOriginalCode = `function hello() {
  console.log("Hello World!");
  return 42;
}`;

const sampleModifiedCode = `function hello() {
  console.log("Hello, Beautiful World!");
  const result = 42;
  return result;
}`;

function App() {
  const [selectedFile, setSelectedFile] = useState<string | undefined>();
  const [settings, setSettings] = useState({
    theme: 'vs-dark',
    language: 'typescript',
    fontSize: 14,
    renderSideBySide: true,
  });

  useEffect(() => {
    // Check system theme preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  const handleSettingChange = (key: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Code Diff Checker</h1>
        <ThemeToggle />
      </header>

      {/* Settings Panel */}
      <SettingsPanel settings={settings} onSettingChange={handleSettingChange} />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <Split
          sizes={[20, 80]}
          minSize={200}
          expandToMin={false}
          gutterSize={10}
          gutterAlign="center"
          snapOffset={30}
          dragInterval={1}
          direction="horizontal"
          cursor="col-resize"
          className="split h-full"
        >
          {/* File Tree */}
          <div className="h-full overflow-auto">
            <FileTree
              data={[sampleData]}
              onFileSelect={setSelectedFile}
              selectedFile={selectedFile}
            />
          </div>

          {/* Diff Editor */}
          <div className="h-full">
            <DiffEditor
              originalCode={sampleOriginalCode}
              modifiedCode={sampleModifiedCode}
              language={settings.language}
              theme={settings.theme}
              options={{
                fontSize: settings.fontSize,
                renderSideBySide: settings.renderSideBySide,
              }}
            />
          </div>
        </Split>
      </div>
    </div>
  );
}

export default App;
