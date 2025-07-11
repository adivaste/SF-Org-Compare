import { FolderIcon, DocumentIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

interface FileNode {
  name: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  path: string;
}

interface FileTreeProps {
  data: FileNode[];
  onFileSelect: (path: string) => void;
  selectedFile?: string;
}

const FileTreeNode = ({ node, level = 0, onFileSelect, selectedFile }: { 
  node: FileNode; 
  level?: number; 
  onFileSelect: (path: string) => void;
  selectedFile?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const paddingLeft = `${level * 1.25}rem`;
  const isSelected = selectedFile === node.path;

  const toggleOpen = () => {
    if (node.type === 'directory') {
      setIsOpen(!isOpen);
    }
  };

  return (
    <div>
      <div
        className={`flex items-center py-1 px-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
          isSelected ? 'bg-blue-100 dark:bg-blue-900' : ''
        }`}
        style={{ paddingLeft }}
        onClick={() => {
          if (node.type === 'file') {
            onFileSelect(node.path);
          } else {
            toggleOpen();
          }
        }}
      >
        <div className="flex items-center flex-1">
          {node.type === 'directory' && (
            <div className="w-4 h-4 mr-1">
              {isOpen ? (
                <ChevronDownIcon className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRightIcon className="w-4 h-4 text-gray-500" />
              )}
            </div>
          )}
          {node.type === 'directory' ? (
            <FolderIcon className="w-4 h-4 text-yellow-500 mr-2" />
          ) : (
            <DocumentIcon className="w-4 h-4 text-gray-500 mr-2" />
          )}
          <span className="text-sm truncate">{node.name}</span>
        </div>
      </div>
      {node.type === 'directory' && isOpen && node.children && (
        <div>
          {node.children.map((child, index) => (
            <FileTreeNode
              key={`${child.path}-${index}`}
              node={child}
              level={level + 1}
              onFileSelect={onFileSelect}
              selectedFile={selectedFile}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const FileTree = ({ data, onFileSelect, selectedFile }: FileTreeProps) => {
  return (
    <div className="h-full overflow-auto bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
      {data.map((node, index) => (
        <FileTreeNode
          key={`${node.path}-${index}`}
          node={node}
          onFileSelect={onFileSelect}
          selectedFile={selectedFile}
        />
      ))}
    </div>
  );
};

export default FileTree; 