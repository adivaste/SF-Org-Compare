import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Menu, Settings, GitCompare, ChevronDown, ChevronRight, FolderIcon, Search, Regex, CaseSensitive, WholeWord, FileSearch, Filter, ListTree, List, Copy, Check, GitGraph, GitCompareArrows, Github } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GitDiffViewer } from '@/components/GitDiffViewer';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { FileIconComponent } from '@/components/FileIcon';
import { StatusDot } from '@/components/StatusDot';
import { getSearchHighlightColor } from '@/lib/colors';
import { ThemeToggle } from '@/components/ThemeToggle';

// API Configuration
const API_BASE_URL = 'http://localhost:8080/api';

// API Service Functions
const apiService = {
  async getStatusTree(org: string, sourceBranch: string, targetBranch: string): Promise<FileNode[]> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/git/status-tree?org=${org}&branch1=${sourceBranch}&branch2=${targetBranch}`
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

  async getFileContent(org: string, sourceBranch: string, targetBranch: string, filePath: string): Promise<{ source: string; target: string }> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/git/file?org=${org}&sourceBranch=${sourceBranch}&filePath=${encodeURIComponent(filePath)}&targetBranch=${targetBranch}`
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

// Better loading component
function LoadingSpinner({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center space-y-4">
      <div className="relative">
        {/* <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary/20 border-t-primary"></div> */}
        {/* <div className="absolute inset-0 animate-spin rounded-full h-12 w-12 border-4 border-transparent border-t-primary/40" style={{ animationDelay: '-0.5s' }}></div> */}
      </div>
      <div className="text-center space-y-2">
        <p className="text-sm font-medium text-foreground">{message}</p>
        <div className="flex space-x-1 justify-center">
          <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
          <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.05s' }}></div>
          <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
        </div>
      </div>
    </div>
  );
}

function FileTree({ 
  data, 
  onSelect, 
  selectedPath,
  theme
}: { 
  data: FileNode[]; 
  onSelect: (path: string) => void;
  selectedPath?: string;
  theme: 'light' | 'dark';
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
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchOptions, setSearchOptions] = useState({
    useRegex: false,
    caseSensitive: false,
    wholeWord: false,
    searchInContent: false
  });
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree');
  const [showStatusFilter, setShowStatusFilter] = useState(false);

  // Debounce search term
  useEffect(() => {
    setIsSearching(true);
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setIsSearching(false);
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const toggleFolder = useCallback((path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
    
    // Save to localStorage
    localStorage.setItem('expandedFolders', JSON.stringify(Array.from(newExpanded)));
  }, [expandedFolders]);

  // Helper function to get a consistent path for directories
  const getNodePath = useCallback((node: FileNode): string => {
    if (node.path) {
      return node.path;
    }
    // For directories without a path, use the name as identifier
    // This ensures we can still track expansion state
    return `dir_${node.name}`;
  }, []);

  const getFileIcon = useCallback((fileName: string) => {
    return <FileIconComponent fileName={fileName} />;
  }, []);

  const filterNodes = useCallback((nodes: FileNode[]): FileNode[] => {
    return nodes.filter(node => {
      // Status filter
      if (statusFilter.size > 0 && node.status && !statusFilter.has(node.status)) {
        return false;
      }
      
      // Search filter
      if (debouncedSearchTerm) {
        let matchesSearch = false;
        const searchText = debouncedSearchTerm.toLowerCase();
        const nodeName = node.name.toLowerCase();
        
        if (searchOptions.useRegex) {
          try {
            const regex = new RegExp(debouncedSearchTerm, searchOptions.caseSensitive ? '' : 'i');
            matchesSearch = regex.test(node.name);
          } catch (e) {
            // Invalid regex, fall back to simple search
            matchesSearch = nodeName.includes(searchText);
          }
        } else if (searchOptions.wholeWord) {
          const words = nodeName.split(/[\s\-_\.]+/);
          matchesSearch = words.some(word => 
            searchOptions.caseSensitive ? word === debouncedSearchTerm : word === searchText
          );
        } else {
          matchesSearch = searchOptions.caseSensitive 
            ? node.name.includes(debouncedSearchTerm)
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
  }, [debouncedSearchTerm, searchOptions, statusFilter]);

  const sortNodes = useCallback((nodes: FileNode[]): FileNode[] => {
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
  }, []);

  const filteredData = useMemo(() => sortNodes(filterNodes(data)), [data, filterNodes, sortNodes]);

  // Remove empty directories from filtered results
  const removeEmptyDirectories = useCallback((nodes: FileNode[]): FileNode[] => {
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
  }, []);

  const finalData = useMemo(() => {
    return debouncedSearchTerm || statusFilter.size > 0 
      ? removeEmptyDirectories(filteredData) 
      : filteredData;
  }, [debouncedSearchTerm, statusFilter.size, filteredData, removeEmptyDirectories]);

  const highlightText = useCallback((text: string, searchTerm: string) => {
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
        <span 
          key={index} 
          className="font-medium px-0.5 rounded"
          style={{
            backgroundColor: getSearchHighlightColor(theme, 'background'),
            color: getSearchHighlightColor(theme, 'text'),
          }}
        >
          {part}
        </span>
      ) : part
    );
  }, [searchOptions, theme]);

  const renderNode = useCallback((node: FileNode, level: number = 0) => {
    const nodePath = getNodePath(node);
    const isExpanded = expandedFolders.has(nodePath);
    const isSelected = node.path === selectedPath;
    
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
              {highlightText(node.name, debouncedSearchTerm)}
            </span>
            {node.status && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <StatusDot 
                        status={node.status as any} 
                        size="sm" 
                        showAnimation={node.status === 'comparisonInProgress'}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{statusLabels[node.status]}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
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
            {highlightText(node.name, debouncedSearchTerm)}
          </span>
          {node.status && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <StatusDot 
                    status={node.status as any} 
                    size="sm" 
                    showAnimation={node.status === 'comparisonInProgress'}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p>{statusLabels[node.status]}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
  }, [getNodePath, expandedFolders, selectedPath, viewMode, toggleFolder, onSelect, getFileIcon, highlightText, debouncedSearchTerm]);

  // Helper function to find a node by path in the data
  const findNodeByPathInData = useCallback((nodes: FileNode[], targetPath: string): FileNode | null => {
    for (const node of nodes) {
      if (node.path === targetPath) {
        return node;
      }
      if (node.children) {
        const found = findNodeByPathInData(node.children, targetPath);
        if (found) return found;
      }
    }
    return null;
  }, []);

  // Get all files from the tree (including nested ones)
  const getAllFiles = useCallback((nodes: FileNode[]): FileNode[] => {
    const files: FileNode[] = [];
    
    const collectFiles = (nodeList: FileNode[]) => {
      for (const node of nodeList) {
        if (node.type === 'file') {
          files.push(node);
        } else if (node.children) {
          collectFiles(node.children);
        }
      }
    };
    
    collectFiles(nodes);
    return files;
  }, []);

  // Filter and sort files for list view
  const getFilteredFiles = useCallback((): FileNode[] => {
    const allFiles = getAllFiles(data);
    
    return allFiles.filter(file => {
      // Status filter
      if (statusFilter.size > 0 && file.status && !statusFilter.has(file.status)) {
        return false;
      }
      
      // Search filter
      if (debouncedSearchTerm) {
        let matchesSearch = false;
        const searchText = debouncedSearchTerm.toLowerCase();
        const fileName = file.name.toLowerCase();
        const filePath = file.path?.toLowerCase() || '';
        
        if (searchOptions.useRegex) {
          try {
            const regex = new RegExp(debouncedSearchTerm, searchOptions.caseSensitive ? '' : 'i');
            matchesSearch = regex.test(file.name) || regex.test(file.path || '');
          } catch (e) {
            matchesSearch = fileName.includes(searchText) || filePath.includes(searchText);
          }
        } else if (searchOptions.wholeWord) {
          const words = fileName.split(/[\s\-_\.]+/);
          matchesSearch = words.some(word => 
            searchOptions.caseSensitive ? word === debouncedSearchTerm : word === searchText
          );
        } else {
          matchesSearch = searchOptions.caseSensitive 
            ? (file.name.includes(debouncedSearchTerm) || Boolean(file.path && file.path.includes(debouncedSearchTerm)))
            : (fileName.includes(searchText) || filePath.includes(searchText));
        }
        
        if (!matchesSearch) {
          return false;
        }
      }
      
      return true;
    }).sort((a, b) => {
      // Sort by path first, then by name
      const pathA = a.path || '';
      const pathB = b.path || '';
      if (pathA !== pathB) {
        return pathA.localeCompare(pathB);
      }
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });
  }, [data, statusFilter, debouncedSearchTerm, searchOptions, getAllFiles]);

  // Get search results count
  const getSearchResultsCount = useCallback((): number => {
    if (viewMode === 'list') {
      return getFilteredFiles().length;
    }
    return finalData.length;
  }, [viewMode, getFilteredFiles, finalData]);

  // Clear search function
  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
  }, []);

  return (
    <ScrollableArea className="pb-1 space-y-0.5 h-full overflow-y-auto">
      {/* Sticky current folder header */}
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
                    statusFilter.size > 0 ? "bg-accent text-accent-foreground" : ""
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
                      <input
                        type="checkbox"
                        id={`filter-${status}`}
                        checked={statusFilter.has(status)}
                        onChange={(e) => {
                          const newFilter = new Set(statusFilter);
                          if (e.target.checked) {
                            newFilter.add(status);
                          } else {
                            newFilter.delete(status);
                          }
                          setStatusFilter(newFilter);
                        }}
                        className="h-3 w-3 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <label 
                        htmlFor={`filter-${status}`}
                        className="text-xs cursor-pointer flex-1"
                      >
                        {status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </label>
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
                viewMode === 'tree' ? "bg-accent text-accent-foreground" : ""
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
            {isSearching && (
              <div className="absolute right-12 top-1/2 transform -translate-y-1/2">
                <div className="w-3 h-3 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
              </div>
            )}
            {searchTerm && !isSearching && (
              <button
                onClick={clearSearch}
                className="absolute right-12 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground"
                title="Clear search"
              >
                ×
              </button>
            )}
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
          {(searchTerm || statusFilter.size > 0) && (
            <div className="px-3 py-1 text-xs text-muted-foreground">
              {getSearchResultsCount()} result{getSearchResultsCount() !== 1 ? 's' : ''}
              {searchTerm && (
                <span> for "{searchTerm}"</span>
              )}
              {statusFilter.size > 0 && (
                <span> • {statusFilter.size} filter{statusFilter.size !== 1 ? 's' : ''} active</span>
              )}
            </div>
          )}
        </div>
      </div>
      {viewMode === 'list' ? (
        // List view - show only files
        <div className="px-3 py-2">
          {getFilteredFiles().map((file, index) => {
            const isSelected = file.path === selectedPath;
            const statusLabels = {
              matched: 'Matched',
              modified: 'Modified',
              onlyInSource: 'Only in Source',
              onlyInTarget: 'Only in Target',
              comparisonInProgress: 'In Progress',
              comparisonFailed: 'Failed'
            };

            return (
              <TooltipProvider key={file.path || `list-${file.name}-${index}`}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="px-3 py-1">
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full h-8 px-3 justify-start gap-3 relative group hover:bg-accent/60 transition-colors",
                          isSelected && "bg-accent text-accent-foreground"
                        )}
                        onClick={() => {
                          if (file.path) {
                            onSelect(file.path);
                          }
                        }}
                      >
                        {getFileIcon(file.name)}
                        <span className="truncate flex-1 text-left text-sm">
                          {highlightText(file.name, debouncedSearchTerm)}
                        </span>
                        {file.status && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <StatusDot 
                                    status={file.status as any} 
                                    size="sm" 
                                    showAnimation={file.status === 'comparisonInProgress'}
                                  />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{statusLabels[file.status as keyof typeof statusLabels]}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <span>{statusLabels[file.status as keyof typeof statusLabels]}</span>
                          </div>
                        )}
                      </Button>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" align="start" className="max-w-[300px]">
                    <div className="text-xs space-y-1">
                      <p className="font-medium">{file.name}</p>
                      <p className="text-muted-foreground">Path: {file.path}</p>
                      {file.status && (
                        <p className="text-muted-foreground">Status: {statusLabels[file.status as keyof typeof statusLabels]}</p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
      ) : (
        // Tree view - show full tree structure
        finalData.map((node, index) => (
          <div key={node.path || `final-${node.name}-${index}`}>
            {renderNode(node)}
          </div>
        ))
      )}
    </ScrollableArea>
  );
}

// Memoize the FileTree component to prevent unnecessary re-renders
const MemoizedFileTree = React.memo(FileTree);

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

// Error boundary to catch and handle React warnings
const ErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    // Suppress specific React warnings in development
    const originalError = console.error;
    console.error = (...args) => {
      // Filter out forwardRef warnings
      if (args[0] && typeof args[0] === 'string' && 
          args[0].includes('Function components cannot be given refs')) {
        return;
      }
      originalError.apply(console, args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  return <>{children}</>;
};

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

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

// Custom hook for scroll detection
const useScrollDetection = () => {
  useEffect(() => {
    const handleScroll = (event: Event) => {
      const target = event.target as HTMLElement;
      if (target.classList.contains('custom-scrollbar')) {
        // Add scrolling class immediately
        target.classList.add('scrolling');
        
        // Remove scrolling class after scroll ends with a longer delay for better UX
        clearTimeout((target as any).scrollTimeout);
        (target as any).scrollTimeout = setTimeout(() => {
          target.classList.remove('scrolling');
        }, 300); // Increased delay for better user experience
      }
    };

    const addScrollListeners = () => {
      const scrollElements = document.querySelectorAll('.custom-scrollbar');
      scrollElements.forEach(element => {
        if (!(element as any).hasScrollListener) {
          element.addEventListener('scroll', handleScroll, { passive: true });
          (element as any).hasScrollListener = true;
        }
      });
    };

    // Initial setup
    addScrollListeners();

    // Watch for new elements being added
    const observer = new MutationObserver((mutations) => {
      let shouldRecheck = false;
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              if (element.classList.contains('custom-scrollbar') || 
                  element.querySelector('.custom-scrollbar')) {
                shouldRecheck = true;
              }
            }
          });
        }
      });
      
      if (shouldRecheck) {
        // Small delay to ensure DOM is ready
        setTimeout(addScrollListeners, 10);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Cleanup function
    return () => {
      observer.disconnect();
      const scrollElements = document.querySelectorAll('.custom-scrollbar');
      scrollElements.forEach(element => {
        element.removeEventListener('scroll', handleScroll);
        clearTimeout((element as any).scrollTimeout);
        delete (element as any).hasScrollListener;
      });
    };
  }, []);
};

function AppContent() {
  const { theme } = useTheme();
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
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [showHeader, setShowHeader] = useState<boolean>(true);

  // Organization and branch selection
  const [selectedOrg, setSelectedOrg] = useState<string>('Shraddha-SB');
  const [selectedSourceBranch, setSelectedSourceBranch] = useState<string>('Sandbox');
  const [selectedTargetBranch, setSelectedTargetBranch] = useState<string>('UAT');
  const [showBranchSelector, setShowBranchSelector] = useState<boolean>(false);

  // Dummy options for organizations and branches
  const organizations = [
    'Shraddha-SB',
    'Dev-Org',
    'Test-Org',
    'Production-Org',
    'Demo-Org'
  ];

  const branches = [
    'Sandbox',
    'UAT',
    'Development',
    'Staging',
    'Production',
    'Feature-Branch-1',
    'Feature-Branch-2',
    'Hotfix-Branch'
  ];

  // Copy file content function
  const copyFileContent = async (content: string, fileName: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedFile(fileName);
      setTimeout(() => setCopiedFile(null), 2000); // Reset after 2 seconds
    } catch (error) {
      console.error('Failed to copy file content:', error);
    }
  };

  // Load file tree data on component mount
  useEffect(() => {
    const loadFileTree = async () => {
      setIsTreeLoading(true);
      setTreeError(null);
      try {
        const data = await apiService.getStatusTree(selectedOrg, selectedSourceBranch, selectedTargetBranch);
        setFileTreeData(data);
      } catch (error) {
        console.error('Failed to load file tree:', error);
        setTreeError(error instanceof Error ? error.message : 'Failed to load file tree');
      } finally {
        setIsTreeLoading(false);
      }
    };

    loadFileTree();
  }, [selectedOrg, selectedSourceBranch, selectedTargetBranch]);

  // Function to reload comparison with new org/branches
  const reloadComparison = async () => {
    setIsTreeLoading(true);
    setTreeError(null);
    setSelectedFile(undefined); // Clear selected file
    setFileContent(null); // Clear file content
    
    try {
      const data = await apiService.getStatusTree(selectedOrg, selectedSourceBranch, selectedTargetBranch);
      setFileTreeData(data);
    } catch (error) {
      console.error('Failed to load file tree:', error);
      setTreeError(error instanceof Error ? error.message : 'Failed to load file tree');
    } finally {
      setIsTreeLoading(false);
    }
  };

  const handleSettingChange = (key: keyof DiffSettings, value: any) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      // Save to localStorage
      localStorage.setItem('diffSettings', JSON.stringify(newSettings));
      return newSettings;
    });
  };

  // Save selected file to localStorage and fetch content
  const handleFileSelect = useCallback(async (path: string) => {
    setSelectedFile(path);
    localStorage.setItem('selectedFile', path);
    setIsLoading(true);
    
    try {
      const fileData = await apiService.getFileContent(selectedOrg, selectedSourceBranch, selectedTargetBranch, path);
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
  }, [selectedOrg, selectedSourceBranch, selectedTargetBranch]);

  // Handle sidebar collapse with persistence
  const handleSidebarCollapse = useCallback((collapsed: boolean) => {
    setIsSidebarCollapsed(collapsed);
    localStorage.setItem('sidebarCollapsed', JSON.stringify(collapsed));
  }, []);

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

      // F11: Toggle full screen
      if (event.key === 'F11') {
        event.preventDefault();
        toggleFullScreen();
      }

      // Ctrl/Cmd + H: Toggle header
      if ((event.ctrlKey || event.metaKey) && event.key === 'h') {
        event.preventDefault();
        setShowHeader(!showHeader);
      }

      // Ctrl/Cmd + Shift + K: Clear search
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'K') {
        event.preventDefault();
        const searchInput = document.querySelector('input[placeholder="Search files..."]') as HTMLInputElement;
        if (searchInput) {
          searchInput.value = '';
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
          searchInput.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSidebarCollapsed, handleSidebarCollapse, isFullScreen, showHeader]);

  // Full screen functionality
  const toggleFullScreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullScreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullScreen(false);
      }
    } catch (error) {
      console.error('Error toggling full screen:', error);
      // Fallback to CSS-based full screen
      setIsFullScreen(!isFullScreen);
    }
  }, [isFullScreen]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Use the custom scroll detection hook
  useScrollDetection();

  return (
    <div className={cn("h-screen flex flex-col bg-background", isFullScreen && "fixed inset-0 z-50")}>
      {/* Header */}
      {showHeader && (
        <header className="h-14 border-b px-4 flex items-center gap-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0">
              <ScrollableArea className="h-full bg-muted/30 overflow-hidden">
                {isTreeLoading ? (
                  <LoadingSpinner message="Loading file tree..." />
                ) : treeError ? (
                  <div className="h-full w-full flex items-center justify-center p-4">
                    <div className="text-center text-sm text-muted-foreground">
                      <p className="mb-2">Failed to load file tree</p>
                      <p className="text-xs">{treeError}</p>
                    </div>
                  </div>
                ) : (
                <MemoizedFileTree
                    data={fileTreeData}
                  onSelect={handleFileSelect}
                  selectedPath={selectedFile}
                  theme={theme}
                />
                )}
              </ScrollableArea>
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-2">
            <GitGraph className="h-6 w-6 text-[#51a2ff]" />
            <div className="flex flex-row gap-0.5">
            <span className="p-0 text-xl font-semibold font-dm-sans text-primary/95">Git</span>
            <span className="p-0 text-xl font-semibold font-dm-sans text-primary/95">Compare</span>
            </div>
          </div>
          
          {/* Sidebar Toggle Button */}
          <div className="ml-auto flex items-center gap-2">
            {/* Theme Toggle */}
            <ThemeToggle />
            {/* Branch Selector - Compact Version */}
            <DropdownMenu open={showBranchSelector} onOpenChange={setShowBranchSelector}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" title={`${selectedOrg} • ${selectedSourceBranch} → ${selectedTargetBranch}`}>
                  <GitCompareArrows className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <div className="p-4 space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Organization</label>
                    <select
                      value={selectedOrg}
                      onChange={(e) => setSelectedOrg(e.target.value)}
                      className="w-full h-8 px-2 border rounded-md text-sm bg-background"
                    >
                      {organizations.map(org => (
                        <option key={org} value={org}>{org}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Source Branch</label>
                      <select
                        value={selectedSourceBranch}
                        onChange={(e) => setSelectedSourceBranch(e.target.value)}
                        className="w-full h-8 px-2 border rounded-md text-sm bg-background"
                      >
                        {branches.map(branch => (
                          <option key={branch} value={branch}>{branch}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Target Branch</label>
                      <select
                        value={selectedTargetBranch}
                        onChange={(e) => setSelectedTargetBranch(e.target.value)}
                        className="w-full h-8 px-2 border rounded-md text-sm bg-background"
                      >
                        {branches.map(branch => (
                          <option key={branch} value={branch}>{branch}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        reloadComparison();
                        setShowBranchSelector(false);
                      }}
                    >
                      Load Comparison
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowBranchSelector(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:flex"
              onClick={() => handleSidebarCollapse(!isSidebarCollapsed)}
              title="Toggle sidebar (⌘B)"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </header>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel
            defaultSize={25}
            minSize={15}
            maxSize={50}
            collapsible
            collapsedSize={0}
            onCollapse={() => handleSidebarCollapse(true)}
            onExpand={() => handleSidebarCollapse(false)}
            className="hidden md:block border-r"
          >
            <ScrollableArea className="h-full bg-muted/30 overflow-hidden">
              {isTreeLoading ? (
                <LoadingSpinner message="Loading file tree..." />
              ) : treeError ? (
                <div className="h-full w-full flex items-center justify-center p-4">
                  <div className="text-center text-sm text-muted-foreground">
                    <p className="mb-2">Failed to load file tree</p>
                    <p className="text-xs">{treeError}</p>
                  </div>
                </div>
              ) : (
              <MemoizedFileTree
                  data={fileTreeData}
                onSelect={handleFileSelect}
                selectedPath={selectedFile}
                theme={theme}
              />
              )}
            </ScrollableArea>
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
                      <>
                        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                          <span className="text-green-500 font-medium">+{fileContent.modified.split('\n').length}</span>
                          <span>/</span>
                          <span className="text-red-500 font-medium">-{fileContent.original.split('\n').length}</span>
                        </div>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 hover:bg-accent"
                                onClick={() => {
                                  const contentToCopy = viewMode === 'source' ? fileContent.original : 
                                                     viewMode === 'target' ? fileContent.modified : 
                                                     `${fileContent.original}\n\n---\n\n${fileContent.modified}`;
                                  copyFileContent(contentToCopy, selectedFile.split('/').pop() || 'file');
                                }}
                              >
                                {copiedFile === selectedFile.split('/').pop() ? (
                                  <Check className="h-3 w-3 text-green-500" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Copy {viewMode === 'source' ? 'source' : viewMode === 'target' ? 'target' : 'both'} content</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </>
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
                  <LoadingSpinner message="Loading file content..." />
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
                      theme: theme,
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

          <span>• {selectedOrg}</span>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>{selectedSourceBranch}</span>
            <span>→</span>
            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            <span>{selectedTargetBranch}</span>
          </div>

          {selectedFile && (
            <span>• {selectedFile.split('/').pop()}</span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowHeader(!showHeader)}
            className="hover:text-foreground transition-colors"
            title="Toggle header"
          >
            {showHeader ? 'Hide Header' : 'Show Header'}
          </button>
          <button
            onClick={toggleFullScreen}
            className="hover:text-foreground transition-colors"
            title="Toggle full screen"
          >
            {isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
          </button>
          <span>⌘K Search</span>
          {/* <span>⌘⇧K Clear</span>
          <span>⌘B Sidebar</span>
          <span>⌘H Header</span>
          <span>F11 Full Screen</span>
          <span>⌘, Settings</span> */}

        <a
            href="https://github.com/adivaste"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-foreground transition-colors"
            title="Created by Aditya Vaste"
          >
            <Github className="h-3 w-3" />
            <span>adivaste</span>
          </a>

        </div>
      </div>
    </div>
  );
}

export default App;