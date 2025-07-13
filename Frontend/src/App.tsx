import { useState, useEffect } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Menu, Settings, GitCompare, ChevronDown, ChevronRight, FileIcon, FolderIcon, Code, FileText, Palette, Zap, Search, Regex, CaseSensitive, WholeWord, FileSearch, Filter, ListTree, List } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GitDiffViewer } from '@/components/GitDiffViewer';

// API Configuration
const API_BASE_URL = 'http://localhost:8080/api';
const DEFAULT_ORG = 'Shraddha-SB';
const DEFAULT_SOURCE_BRANCH = 'Sandbox';
const DEFAULT_TARGET_BRANCH = 'UAT';

// API Service Functions
const apiService = {
  async getStatusTree(): Promise<FileNode[]> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/git/status-tree?org=${DEFAULT_ORG}&branch1=${DEFAULT_SOURCE_BRANCH}&branch2=${DEFAULT_TARGET_BRANCH}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.children || [];
    } catch (error) {
      console.error('Error fetching status tree:', error);
      throw error;
    }
  },

  async getFileContent(filePath: string): Promise<{ source: string; target: string }> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/git/file?org=${DEFAULT_ORG}&sourceBranch=${DEFAULT_SOURCE_BRANCH}&filePath=${encodeURIComponent(filePath)}&targetBranch=${DEFAULT_TARGET_BRANCH}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return {
        source: data.source || '',
        target: data.target || ''
      };
    } catch (error) {
      console.error('Error fetching file content:', error);
      throw error;
    }
  }
};

interface DiffSettings {
  fontSize: number;
  showDiffOnly: boolean;
  extraLines: number;
  renderSideBySide: boolean;
  enableSyntaxHighlight: boolean;
  wrapLines: boolean;
  theme: 'light' | 'dark';
  enableWidgets: boolean;
  enableExtendData: boolean;
}

interface FileNode {
  name: string;
  type: 'file' | 'directory';
  path: string | null;
  status?: 'matched' | 'modified' | 'onlyInTarget' | 'onlyInSource' | 'comparisonInProgress' | 'comparisonFailed' | null;
  children?: FileNode[];
}

interface FileContent {
  original: string;
  modified: string;
  language: string;
}

// Helper function to find a node by path
function findNodeByPath(node: FileNode, path: string): FileNode | null {
  if (node.path === path) {
    return node;
  }
  if (node.children) {
    for (const child of node.children) {
      const found = findNodeByPath(child, path);
      if (found) return found;
    }
  }
  return null;
}

// Helper function to get all statuses from data
function getAllStatuses(nodes: FileNode[]): Set<string> {
  const statuses = new Set<string>();
  
  function collectStatuses(node: FileNode) {
    if (node.status) {
      statuses.add(node.status);
    }
    if (node.children) {
      node.children.forEach(collectStatuses);
    }
  }
  
  nodes.forEach(collectStatuses);
  return statuses;
}

function FileTree({ 
  data, 
  onSelect, 
  selectedPath 
}: { 
  data: FileNode[]; 
  onSelect: (path: string) => void;
  selectedPath?: string;
}) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => {
    // Load expanded folders from localStorage
    try {
      const saved = localStorage.getItem('expandedFolders');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure we have an array and convert to Set
        return new Set(Array.isArray(parsed) ? parsed : []);
      }
    } catch (error) {
      console.warn('Failed to load expanded folders from localStorage:', error);
    }
    return new Set();
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [searchOptions, setSearchOptions] = useState({
    useRegex: false,
    caseSensitive: false,
    wholeWord: false,
    searchInContent: false
  });
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree');
  const [showStatusFilter, setShowStatusFilter] = useState(false);

  const toggleFolder = (path: string) => {
    console.log('Toggling folder:', path, 'Current expanded:', Array.from(expandedFolders));
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
      console.log('Collapsing folder:', path);
    } else {
      newExpanded.add(path);
      console.log('Expanding folder:', path);
    }
    setExpandedFolders(newExpanded);
    
    // Save to localStorage
    localStorage.setItem('expandedFolders', JSON.stringify(Array.from(newExpanded)));
  };

  // Helper function to get a consistent path for directories
  const getNodePath = (node: FileNode): string => {
    if (node.path) {
      return node.path;
    }
    // For directories without a path, use the name as identifier
    // This ensures we can still track expansion state
    return `dir_${node.name}`;
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'cls':
        return <Code className="h-4 w-4 text-blue-500" />;
      case 'trigger':
        return <Zap className="h-4 w-4 text-orange-500" />;
      case 'js':
        return <Code className="h-4 w-4 text-yellow-500" />;
      case 'html':
        return <FileText className="h-4 w-4 text-red-500" />;
      case 'css':
        return <Palette className="h-4 w-4 text-purple-500" />;
      case 'page':
        return <FileText className="h-4 w-4 text-green-500" />;
      case 'diff':
        return <GitCompare className="h-4 w-4 text-indigo-500" />;
      case 'lazy':
        return <GitCompare className="h-4 w-4 text-cyan-500" />;
      default:
        return <FileIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const filterNodes = (nodes: FileNode[]): FileNode[] => {
    return nodes.filter(node => {
      // Status filter
      if (statusFilter.size > 0 && node.status && !statusFilter.has(node.status)) {
        return false;
      }
      
      // Search filter
      if (searchTerm) {
        let matchesSearch = false;
        const searchText = searchTerm.toLowerCase();
        const nodeName = node.name.toLowerCase();
        
        if (searchOptions.useRegex) {
          try {
            const regex = new RegExp(searchTerm, searchOptions.caseSensitive ? '' : 'i');
            matchesSearch = regex.test(node.name);
          } catch (e) {
            // Invalid regex, fall back to simple search
            matchesSearch = nodeName.includes(searchText);
          }
        } else if (searchOptions.wholeWord) {
          const words = nodeName.split(/[\s\-_\.]+/);
          matchesSearch = words.some(word => 
            searchOptions.caseSensitive ? word === searchTerm : word === searchText
          );
        } else {
          matchesSearch = searchOptions.caseSensitive 
            ? node.name.includes(searchTerm)
            : nodeName.includes(searchText);
        }
        
        const hasMatchingChildren = node.children && filterNodes(node.children).length > 0;
        if (!matchesSearch && !hasMatchingChildren) {
          return false;
        }
      }
      
      return true;
    }).map(node => ({
      ...node,
      children: node.children ? filterNodes(node.children) : undefined
    }));
  };

  const sortNodes = (nodes: FileNode[]): FileNode[] => {
    return nodes.sort((a, b) => {
      // Directories come before files
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      
      // Then sort alphabetically (case-insensitive)
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    }).map(node => ({
      ...node,
      children: node.children ? sortNodes(node.children) : undefined
    }));
  };

  const filteredData = sortNodes(filterNodes(data));

  // Remove empty directories from filtered results
  const removeEmptyDirectories = (nodes: FileNode[]): FileNode[] => {
    return nodes.filter(node => {
      if (node.type === 'directory') {
        const filteredChildren = removeEmptyDirectories(node.children || []);
        // Only keep directory if it has children after filtering
        return filteredChildren.length > 0;
      }
      return true;
    }).map(node => ({
      ...node,
      children: node.children ? removeEmptyDirectories(node.children) : undefined
    }));
  };

  const finalData = searchTerm || statusFilter.size > 0 
    ? removeEmptyDirectories(filteredData) 
    : filteredData;

  const highlightText = (text: string, searchTerm: string) => {
    if (!searchTerm) return text;
    
    let regex;
    if (searchOptions.useRegex) {
      try {
        regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, searchOptions.caseSensitive ? 'g' : 'gi');
      } catch (e) {
        regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      }
    } else if (searchOptions.wholeWord) {
      const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      regex = new RegExp(`(\\b${escapedTerm}\\b)`, searchOptions.caseSensitive ? 'g' : 'gi');
    } else {
      regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, searchOptions.caseSensitive ? 'gi' : 'gi');
    }
    
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <span key={index} className="bg-yellow-200 text-yellow-900 font-medium px-0.5 rounded">
          {part}
        </span>
      ) : part
    );
  };

  const renderNode = (node: FileNode, level: number = 0) => {
    const nodePath = getNodePath(node);
    const isExpanded = expandedFolders.has(nodePath);
    const isSelected = node.path === selectedPath;
    
    // Debug logging for directories
    if (node.type === 'directory') {
      console.log('Rendering directory:', node.name, 'Path:', nodePath, 'Expanded:', isExpanded, 'Has children:', !!node.children?.length);
    }
    
    const statusColors = {
      matched: 'bg-green-400',
      modified: 'bg-yellow-400',
      onlyInSource: 'bg-blue-400',
      onlyInTarget: 'bg-orange-400',
      comparisonInProgress: 'bg-gray-400 status-dot-comparison',
      comparisonFailed: 'bg-red-400'
    };

    const statusLabels = {
      matched: 'Matched',
      modified: 'Modified',
      onlyInSource: 'Only in Source',
      onlyInTarget: 'Only in Target',
      comparisonInProgress: 'In Progress',
      comparisonFailed: 'Failed'
    };

    if (viewMode === 'list') {
      return (
        <div key={node.path || `list-${node.name}`} className="px-3 py-1">
          <Button
            variant="ghost"
            className={cn(
              "w-full h-8 px-3 justify-start gap-3 relative group hover:bg-accent/60 transition-colors",
              isSelected && "bg-accent text-accent-foreground"
            )}
            onClick={() => {
              if (node.type === 'directory') {
                toggleFolder(getNodePath(node));
              } else if (node.path) {
                onSelect(node.path);
              }
            }}
          >
            {node.type === 'directory' ? (
              <FolderIcon className="h-4 w-4 text-blue-400" />
            ) : (
              getFileIcon(node.name)
            )}
            <span className="truncate flex-1 text-left text-sm">
              {highlightText(node.name, searchTerm)}
            </span>
            {node.status && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className={cn(
                  "w-2 h-2 rounded-full flex-shrink-0",
                  statusColors[node.status]
                )} />
                <span>{statusLabels[node.status]}</span>
              </div>
            )}
          </Button>
        </div>
      );
    }

    return (
      <div key={node.path || `node-${node.name}-${level}`}>
        <Button
          variant="ghost"
          className={cn(
            "w-full h-7 px-2 justify-start gap-2 relative group hover:bg-accent/60 transition-colors",
            isSelected && "bg-accent text-accent-foreground",
            level > 0 && "text-sm"
          )}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => {
            if (node.type === 'directory') {
              toggleFolder(getNodePath(node));
            } else if (node.path) {
              onSelect(node.path);
            }
          }}
        >
          {node.type === 'directory' ? (
            <div className="flex items-center gap-1">
              {isExpanded ? 
                <ChevronDown className="h-3 w-3 text-muted-foreground" /> : 
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              }
              <FolderIcon className="h-4 w-4 text-blue-400" />
            </div>
          ) : (
            getFileIcon(node.name)
          )}
          <span className={cn(
            "truncate flex-1 text-left",
            level > 0 && "font-normal"
          )}>
            {highlightText(node.name, searchTerm)}
          </span>
          {node.status && (
            <div className={cn(
              "w-2 h-2 rounded-full flex-shrink-0",
              statusColors[node.status]
            )} />
          )}
        </Button>
        {node.type === 'directory' && isExpanded && node.children && node.children.length > 0 && (
          <div>
            {node.children.map((child, index) => 
              <div key={child.path || `${child.name}-${index}`}>
                {renderNode(child, level + 1)}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="pb-1 space-y-0.5 h-full overflow-y-auto custom-scrollbar">
      <div className="sticky top-0 sticky-header z-20 pb-2">
        <div className="px-3 py-2 flex items-center justify-between">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Files
          </div>
          <div className="flex items-center gap-1">
            <DropdownMenu open={showStatusFilter} onOpenChange={setShowStatusFilter}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-6 w-6 p-0 hover:bg-accent",
                    statusFilter.size > 0 && "bg-accent text-accent-foreground"
                  )}
                  title="Filter by status"
                >
                  <Filter className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="p-2 space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">Filter by Status</div>
                  {Array.from(getAllStatuses(data)).map(status => (
                    <div key={status} className="flex items-center space-x-2">
                      <Switch
                        checked={statusFilter.has(status)}
                        onCheckedChange={(checked) => {
                          const newFilter = new Set(statusFilter);
                          if (checked) {
                            newFilter.add(status);
                          } else {
                            newFilter.delete(status);
                          }
                          setStatusFilter(newFilter);
                        }}
                        className="h-3 w-3"
                      />
                      <span className="text-xs">{status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                    </div>
                  ))}
                  {statusFilter.size > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full h-6 text-xs"
                      onClick={() => setStatusFilter(new Set())}
                    >
                      Clear All
                    </Button>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-6 w-6 p-0 hover:bg-accent",
                viewMode === 'tree' && "bg-accent text-accent-foreground"
              )}
              onClick={() => setViewMode('tree')}
              title="Tree view"
            >
              <ListTree className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-6 w-6 p-0 hover:bg-accent",
                viewMode === 'list' && "bg-accent text-accent-foreground"
              )}
              onClick={() => setViewMode('list')}
              title="List view"
            >
              <List className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <div className="px-3 space-y-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-7 pl-7 pr-16 text-sm border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="absolute right-1 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-5 w-5 p-0 hover:bg-accent",
                  searchOptions.useRegex && "bg-accent text-accent-foreground"
                )}
                onClick={() => setSearchOptions(prev => ({ ...prev, useRegex: !prev.useRegex }))}
                title="Use regex"
              >
                <Regex className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-5 w-5 p-0 hover:bg-accent",
                  searchOptions.caseSensitive && "bg-accent text-accent-foreground"
                )}
                onClick={() => setSearchOptions(prev => ({ ...prev, caseSensitive: !prev.caseSensitive }))}
                title="Case sensitive"
              >
                <CaseSensitive className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-5 w-5 p-0 hover:bg-accent",
                  searchOptions.wholeWord && "bg-accent text-accent-foreground"
                )}
                onClick={() => setSearchOptions(prev => ({ ...prev, wholeWord: !prev.wholeWord }))}
                title="Match whole word"
              >
                <WholeWord className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-5 w-5 p-0 hover:bg-accent",
                  searchOptions.searchInContent && "bg-accent text-accent-foreground"
                )}
                onClick={() => setSearchOptions(prev => ({ ...prev, searchInContent: !prev.searchInContent }))}
                title="Search in content"
              >
                <FileSearch className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
      {finalData.map((node, index) => (
        <div key={node.path || `final-${node.name}-${index}`}>
          {renderNode(node)}
        </div>
      ))}
    </div>
  );
}

function DiffSettings({ settings, onChange }: { 
  settings: DiffSettings; 
  onChange: (key: keyof DiffSettings, value: any) => void;
}) {
  return (
    <div className="p-4 space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Font Size</label>
        <Slider
          value={[settings.fontSize]}
          onValueChange={([value]) => onChange('fontSize', value)}
          min={10}
          max={20}
          step={1}
        />
        <span className="text-xs text-muted-foreground">{settings.fontSize}px</span>
      </div>
      
      <div className="space-y-2">
        <label className="text-sm font-medium">Extra Lines</label>
        <Slider
          value={[settings.extraLines]}
          onValueChange={([value]) => onChange('extraLines', value)}
          min={0}
          max={10}
          step={1}
        />
        <span className="text-xs text-muted-foreground">{settings.extraLines} lines</span>
      </div>

      <Separator className="my-2" />

      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Side by Side View</label>
        <Switch
          checked={settings.renderSideBySide}
          onCheckedChange={(checked) => onChange('renderSideBySide', checked)}
        />
      </div>

      {settings.renderSideBySide && (
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Wrap Lines</label>
          <Switch
            checked={settings.wrapLines}
            onCheckedChange={(checked) => onChange('wrapLines', checked)}
          />
        </div>
      )}

      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Show Diff Only</label>
        <Switch
          checked={settings.showDiffOnly}
          onCheckedChange={(checked) => onChange('showDiffOnly', checked)}
        />
      </div>

      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Syntax Highlighting</label>
        <Switch
          checked={settings.enableSyntaxHighlight}
          onCheckedChange={(checked) => onChange('enableSyntaxHighlight', checked)}
        />
      </div>

      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Theme</label>
        <select
          value={settings.theme}
          onChange={(e) => onChange('theme', e.target.value as 'light' | 'dark')}
          className="w-20 h-8 px-2 border rounded-md text-sm bg-background"
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>

      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Enable Widgets</label>
        <Switch
          checked={settings.enableWidgets}
          onCheckedChange={(checked) => onChange('enableWidgets', checked)}
        />
      </div>

      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Enable Extend Data</label>
        <Switch
          checked={settings.enableExtendData}
          onCheckedChange={(checked) => onChange('enableExtendData', checked)}
        />
      </div>
    </div>
  );
}

type ViewMode = 'diff' | 'source' | 'target';

function App() {
  const [selectedFile, setSelectedFile] = useState<string | undefined>(() => {
    // Load selected file from localStorage
    const saved = localStorage.getItem('selectedFile');
    return saved || undefined;
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    // Load sidebar state from localStorage
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const [fileContent, setFileContent] = useState<FileContent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fileTreeData, setFileTreeData] = useState<FileNode[]>([]);
  const [isTreeLoading, setIsTreeLoading] = useState(true);
  const [treeError, setTreeError] = useState<string | null>(null);
  const [settings, setSettings] = useState<DiffSettings>(() => {
    // Load settings from localStorage
    const saved = localStorage.getItem('diffSettings');
    return saved ? JSON.parse(saved) : {
      fontSize: 14,
      showDiffOnly: false,
      extraLines: 3,
      renderSideBySide: false,
      enableSyntaxHighlight: true,
      wrapLines: false,
      theme: 'light',
      enableWidgets: false,
      enableExtendData: false
    };
  });
  const [viewMode, setViewMode] = useState<ViewMode>('diff');

  // Load file tree data on component mount
  useEffect(() => {
    const loadFileTree = async () => {
      setIsTreeLoading(true);
      setTreeError(null);
      try {
        const data = await apiService.getStatusTree();
        setFileTreeData(data);
      } catch (error) {
        console.error('Failed to load file tree:', error);
        setTreeError(error instanceof Error ? error.message : 'Failed to load file tree');
      } finally {
        setIsTreeLoading(false);
      }
    };

    loadFileTree();
  }, []);

  const handleSettingChange = (key: keyof DiffSettings, value: any) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      // Save to localStorage
      localStorage.setItem('diffSettings', JSON.stringify(newSettings));
      return newSettings;
    });
  };

  // Save selected file to localStorage and fetch content
  const handleFileSelect = async (path: string) => {
    setSelectedFile(path);
    localStorage.setItem('selectedFile', path);
    setIsLoading(true);
    
    try {
      const fileData = await apiService.getFileContent(path);
      const fileExtension = path.split('.').pop() || 'apex';
      let lang = 'apex'; // default for Salesforce files
      
      // Determine language based on file extension
      switch (fileExtension) {
        case 'cls':
        case 'trigger':
          lang = 'apex';
          break;
        case 'js':
          lang = 'javascript';
          break;
        case 'html':
          lang = 'html';
          break;
        case 'css':
          lang = 'css';
          break;
        case 'page':
          lang = 'html';
          break;
        case 'xml':
          lang = 'xml';
          break;
        case 'json':
          lang = 'json';
          break;
        case 'md':
          lang = 'markdown';
          break;
        default:
          lang = fileExtension;
      }
      setFileContent({
        original: fileData.source || '',
        modified: fileData.target || '',
        language: lang
      });
    } catch (error) {
      console.error('Failed to load file content:', error);
      // Set error state or show notification
      setFileContent(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle sidebar collapse with persistence
  const handleSidebarCollapse = (collapsed: boolean) => {
    setIsSidebarCollapsed(collapsed);
    localStorage.setItem('sidebarCollapsed', JSON.stringify(collapsed));
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Ctrl/Cmd + K: Focus search
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        const searchInput = document.querySelector('input[placeholder="Search files..."]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
      
      // Ctrl/Cmd + B: Toggle sidebar (desktop only)
      if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
        event.preventDefault();
        if (window.innerWidth >= 768) { // md breakpoint
          handleSidebarCollapse(!isSidebarCollapsed);
        }
      }
      
      // Ctrl/Cmd + ,: Open settings
      if ((event.ctrlKey || event.metaKey) && event.key === ',') {
        event.preventDefault();
        const settingsButton = document.querySelector('[data-settings-trigger]') as HTMLButtonElement;
        if (settingsButton) {
          settingsButton.click();
        }
      }

      // Escape: Clear search
      if (event.key === 'Escape') {
        const searchInput = document.querySelector('input[placeholder="Search files..."]') as HTMLInputElement;
        if (searchInput && document.activeElement === searchInput) {
          searchInput.blur();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-14 border-b px-4 flex items-center gap-4">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-0">
            <div className="h-full bg-muted/30 overflow-hidden custom-scrollbar">
              {isTreeLoading ? (
                <div className="h-full w-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : treeError ? (
                <div className="h-full w-full flex items-center justify-center p-4">
                  <div className="text-center text-sm text-muted-foreground">
                    <p className="mb-2">Failed to load file tree</p>
                    <p className="text-xs">{treeError}</p>
                  </div>
                </div>
              ) : (
              <FileTree
                  data={fileTreeData}
                onSelect={handleFileSelect}
                selectedPath={selectedFile}
              />
              )}
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex items-center gap-2">
          <GitCompare className="h-5 w-5" />
          <span className="font-medium">Code Compare</span>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel
            defaultSize={20}
            minSize={15}
            maxSize={30}
            collapsible
            collapsedSize={0}
            onCollapse={() => handleSidebarCollapse(true)}
            onExpand={() => handleSidebarCollapse(false)}
            className="hidden md:block border-r"
          >
            <div className="h-full bg-muted/30 overflow-hidden custom-scrollbar">
              {isTreeLoading ? (
                <div className="h-full w-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : treeError ? (
                <div className="h-full w-full flex items-center justify-center p-4">
                  <div className="text-center text-sm text-muted-foreground">
                    <p className="mb-2">Failed to load file tree</p>
                    <p className="text-xs">{treeError}</p>
                  </div>
                </div>
              ) : (
              <FileTree
                  data={fileTreeData}
                onSelect={handleFileSelect}
                selectedPath={selectedFile}
              />
              )}
            </div>
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          <ResizablePanel defaultSize={80}>
            <Card className="h-full rounded-none border-0">
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-3 px-4">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-medium truncate">
                      {selectedFile ? selectedFile.split('/').pop() : 'No file selected'}
                    </h2>
                    {selectedFile && fileContent && (
                      <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                        <span className="text-green-500 font-medium">+{fileContent.modified.split('\n').length}</span>
                        <span>/</span>
                        <span className="text-red-500 font-medium">-{fileContent.original.split('\n').length}</span>
                      </div>
                    )}
                  </div>
                  {selectedFile && (
                    <p className="text-xs text-muted-foreground truncate">
                      {selectedFile}
                    </p>
                  )}
                </div>
                {/* Tabs and Settings */}
                <div className="flex items-center gap-2">
                  {/* Tab Toggle */}
                  <div className="flex rounded-md bg-muted border p-0">
                    <button
                      className={cn(
                        'px-3 py-1 rounded-md text-sm font-medium transition-colors',
                        viewMode === 'diff' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground',
                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary'
                      )}
                      onClick={() => setViewMode('diff')}
                      type="button"
                    >
                      Diff
                    </button>
                    <button
                      className={cn(
                        'px-3 py-1 rounded-md text-sm font-medium transition-colors',
                        viewMode === 'source' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground',
                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary'
                      )}
                      onClick={() => setViewMode('source')}
                      type="button"
                    >
                      Source
                    </button>
                    <button
                      className={cn(
                        'px-3 py-1 rounded-md text-sm font-medium transition-colors',
                        viewMode === 'target' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground',
                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary'
                      )}
                      onClick={() => setViewMode('target')}
                      type="button"
                    >
                      Target
                    </button>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" data-settings-trigger>
                      <Settings className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[240px]">
                    <DiffSettings
                      settings={settings}
                      onChange={handleSettingChange}
                    />
                  </DropdownMenuContent>
                </DropdownMenu>
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="p-0 h-[calc(100vh-8rem)]">
                {isLoading ? (
                  <div className="h-full w-full flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : fileContent ? (
                  <GitDiffViewer
                    originalCode={fileContent.original}
                    modifiedCode={fileContent.modified}
                    language={fileContent.language}
                    notPresentInSource={!!(selectedFile && fileTreeData.some(node => 
                      findNodeByPath(node, selectedFile)?.status === 'onlyInTarget'
                    ))}
                    notPresentInTarget={!!(selectedFile && fileTreeData.some(node => 
                      findNodeByPath(node, selectedFile)?.status === 'onlyInSource'
                    ))}
                    options={{
                      fontSize: settings.fontSize,
                      showDiffOnly: settings.showDiffOnly,
                      extraLines: settings.extraLines,
                      renderSideBySide: settings.renderSideBySide,
                      enableSyntaxHighlight: settings.enableSyntaxHighlight,
                      wrapLines: settings.wrapLines,
                      theme: settings.theme,
                      enableWidgets: settings.enableWidgets,
                      enableExtendData: settings.enableExtendData
                    }}
                    viewMode={viewMode}
                  />
                ) : (
                  <div className="h-full w-full p-4 text-sm text-muted-foreground flex items-center justify-center">
                    Select a file to view differences
                  </div>
                )}
              </CardContent>
            </Card>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
      
      {/* Status Bar */}
      <div className="h-6 border-t px-4 flex items-center justify-between text-xs text-muted-foreground bg-muted/30">
        <div className="flex items-center gap-4">
          <span>{isTreeLoading ? 'Loading...' : treeError ? 'Error' : 'Ready'}</span>
          {selectedFile && (
            <span>• {selectedFile.split('/').pop()}</span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span>⌘K Search</span>
          <span>⌘B Sidebar</span>
          <span>⌘, Settings</span>
        </div>
      </div>
    </div>
  );
}

export default App;