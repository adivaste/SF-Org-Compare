import { useState, useEffect } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Menu, Settings, GitCompare, ChevronDown, ChevronRight, FileIcon, FolderIcon, Code, FileText, Palette, Zap, Search, Regex, CaseSensitive, WholeWord, FileSearch, Filter, ListTree, List, GitGraph } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GitDiffViewer } from '@/components/GitDiffViewer';

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
  path: string;
  children?: FileNode[];
  status?: 'matched' | 'modified' | 'only_in_source' | 'only_in_target' | 'comparison_in_progress' | 'comparison_failed';
}

interface FileContent {
  original: string;
  modified: string;
  language: string;
}

interface DiffContent {
  diffString: string;
  language: string;
  filePath: string;
  isFullContent?: boolean;
}

// Sample data - you can replace this with your actual data structure
const sampleData: FileNode[] = [
  {
    name: 'force-app',
    type: 'directory',
    path: '/force-app',
    status: 'comparison_in_progress',
    children: [
      {
        name: 'main',
        type: 'directory',
        path: '/force-app/main',
        children: [
          {
            name: 'default',
            type: 'directory',
            path: '/force-app/main/default',
            children: [
              {
                name: 'classes',
                type: 'directory',
                path: '/force-app/main/default/classes',
                children: [
                  {
                    name: 'AccountService.cls',
                    type: 'file',
                    path: '/force-app/main/default/classes/AccountService.cls',
                    status: 'modified'
                  },
                  {
                    name: 'ContactService.cls',
                    type: 'file',
                    path: '/force-app/main/default/classes/ContactService.cls',
                    status: 'modified'
                  },
                  {
                    name: 'OpportunityService.cls',
                    type: 'file',
                    path: '/force-app/main/default/classes/OpportunityService.cls',
                    status: 'only_in_target'
                  }
                ]
              },
              {
                name: 'triggers',
                type: 'directory',
                path: '/force-app/main/default/triggers',
                children: [
                  {
                    name: 'AccountTrigger.trigger',
                    type: 'file',
                    path: '/force-app/main/default/triggers/AccountTrigger.trigger',
                    status: 'only_in_target'
                  },
                  {
                    name: 'ContactTrigger.trigger',
                    type: 'file',
                    path: '/force-app/main/default/triggers/ContactTrigger.trigger',
                    status: 'matched'
                  }
                ]
              },
              {
                name: 'lwc',
                type: 'directory',
                path: '/force-app/main/default/lwc',
                children: [
                  {
                    name: 'accountList',
                    type: 'directory',
                    path: '/force-app/main/default/lwc/accountList',
                    children: [
                      {
                        name: 'accountList.js',
                        type: 'file',
                        path: '/force-app/main/default/lwc/accountList/accountList.js',
                        status: 'modified'
                      },
                      {
                        name: 'accountList.html',
                        type: 'file',
                        path: '/force-app/main/default/lwc/accountList/accountList.html',
                        status: 'only_in_target'
                      },
                      {
                        name: 'accountList.css',
                        type: 'file',
                        path: '/force-app/main/default/lwc/accountList/accountList.css',
                        status: 'modified'
                      }
                    ]
                  }
                ]
              },
              {
                name: 'pages',
                type: 'directory',
                path: '/force-app/main/default/pages',
                children: [
                  {
                    name: 'AccountDetail.page',
                    type: 'file',
                    path: '/force-app/main/default/pages/AccountDetail.page',
                    status: 'modified'
                  },
                  {
                    name: 'ContactList.page',
                    type: 'file',
                    path: '/force-app/main/default/pages/ContactList.page',
                    status: 'only_in_target'
                  }
                ]
              },
              {
                name: 'staticresources',
                type: 'directory',
                path: '/force-app/main/default/staticresources',
                children: [
                  {
                    name: 'styles.css',
                    type: 'file',
                    path: '/force-app/main/default/staticresources/styles.css',
                    status: 'modified'
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        name: 'utils',
        type: 'directory',
        path: '/force-app/utils',
        children: [
          {
            name: 'StringUtils.cls',
            type: 'file',
            path: '/force-app/utils/StringUtils.cls',
            status: 'only_in_source'
          },
          {
            name: 'ValidationUtils.cls',
            type: 'file',
            path: '/force-app/utils/ValidationUtils.cls',
            status: 'only_in_target'
          }
        ]
      },
      {
        name: 'examples',
        type: 'directory',
        path: '/force-app/examples',
        children: [
          {
            name: 'SimpleComponent.diff',
            type: 'file',
            path: '/force-app/examples/SimpleComponent.diff',
            status: 'modified'
          },
          {
            name: 'LazyComponent.lazy',
            type: 'file',
            path: '/force-app/examples/LazyComponent.lazy',
            status: 'modified'
          }
        ]
      }
    ]
  }
];

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

// Utility function to parse unified diff strings
function parseUnifiedDiff(diffString: string): { original: string; modified: string } {
  const lines = diffString.split('\n');
  const original: string[] = [];
  const modified: string[] = [];
  
  let inHunk = false;
  let originalLineNum = 0;
  let modifiedLineNum = 0;
  
  for (const line of lines) {
    // Skip file headers
    if (line.startsWith('---') || line.startsWith('+++')) {
      continue;
    }
    
    // Parse hunk header
    if (line.startsWith('@@')) {
      inHunk = true;
      const match = line.match(/@@ -(\d+),?(\d+)? \+(\d+),?(\d+)? @@/);
      if (match) {
        originalLineNum = parseInt(match[1]);
        modifiedLineNum = parseInt(match[3]);
      }
      continue;
    }
    
    if (inHunk) {
      if (line.startsWith(' ')) {
        // Context line - add to both
        original.push(line.substring(1));
        modified.push(line.substring(1));
        originalLineNum++;
        modifiedLineNum++;
      } else if (line.startsWith('-')) {
        // Removed line - add to original only
        original.push(line.substring(1));
        originalLineNum++;
      } else if (line.startsWith('+')) {
        // Added line - add to modified only
        modified.push(line.substring(1));
        modifiedLineNum++;
      }
    }
  }
  
  return {
    original: original.join('\n'),
    modified: modified.join('\n')
  };
}

// Example of lazy loading full content
async function loadFullContent(filePath: string): Promise<FileContent> {
  // Simulate API call to get full content
  return new Promise((resolve) => {
    setTimeout(() => {
      // This would be an actual API call in production
      const fileExtension = filePath.split('.').pop() || 'apex';
      let original, modified, lang;
      
      // Return full content based on file type
      switch (fileExtension) {
        case 'cls':
          original = `public class AccountService {
    public static void updateAccountRating(Id accountId) {
        Account acc = [SELECT Id, AnnualRevenue FROM Account WHERE Id = :accountId];
        
        if (acc.AnnualRevenue > 1000000) {
            acc.Rating = 'Hot';
        }
        
        update acc;
    }
    
    public static void createAccount(String name, String industry) {
        Account acc = new Account();
        acc.Name = name;
        acc.Industry = industry;
        insert acc;
    }
}`;
          modified = `public class AccountService {
    public static void updateAccountRating(Id accountId) {
        Account acc = [SELECT Id, AnnualRevenue, NumberOfEmployees, BillingCity FROM Account WHERE Id = :accountId AND IsActive = true ORDER BY CreatedDate DESC LIMIT 1];
        
        if (acc.AnnualRevenue > 1000000 || acc.NumberOfEmployees > 500) {
            acc.Rating = 'Hot';
        } else if (acc.AnnualRevenue > 500000) {
            acc.Rating = 'Warm';
        } else {
            acc.Rating = 'Cold';
        }
        
        // Add territory assignment logic
        if (acc.BillingCity != null) {
            acc.Territory__c = assignTerritory(acc.BillingCity);
        }
        
        update acc;
    }
    
    public static void createAccount(String name, String industry, String type, Decimal revenue) {
        Account acc = new Account();
        acc.Name = name;
        acc.Industry = industry;
        acc.Type = type;
        acc.AnnualRevenue = revenue;
        acc.Rating = calculateInitialRating(revenue);
        insert acc;
        
        // Send welcome notification
        sendWelcomeNotification(acc.Id);
    }
    
    private static String assignTerritory(String city) {
        // Territory assignment logic
        if (city.contains('New York') || city.contains('Los Angeles')) {
            return 'West Coast';
        } else if (city.contains('Chicago') || city.contains('Boston')) {
            return 'Central';
        }
        return 'Other';
    }
    
    private static String calculateInitialRating(Decimal revenue) {
        if (revenue > 1000000) return 'Hot';
        if (revenue > 500000) return 'Warm';
        return 'Cold';
    }
    
    private static void sendWelcomeNotification(Id accountId) {
        // Notification logic here
        System.debug('Welcome notification sent for account: ' + accountId);
    }
}`;
          lang = 'apex';
          break;
        default:
          original = `// Full original content for ${filePath}`;
          modified = `// Full modified content for ${filePath}`;
          lang = fileExtension;
      }
      
      resolve({ original, modified, language: lang });
    }, 1000); // Simulate network delay
  });
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
    const saved = localStorage.getItem('expandedFolders');
    return saved ? new Set(JSON.parse(saved)) : new Set();
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
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
    
    // Save to localStorage
    localStorage.setItem('expandedFolders', JSON.stringify(Array.from(newExpanded)));
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

  const filteredData = filterNodes(data);

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
    const isExpanded = expandedFolders.has(node.path);
    const isSelected = node.path === selectedPath;
    const statusColors = {
      matched: 'bg-green-400',
      modified: 'bg-yellow-400',
      only_in_source: 'bg-blue-400',
      only_in_target: 'bg-orange-400',
      comparison_in_progress: 'bg-gray-400 status-dot-comparison',
      comparison_failed: 'bg-red-400'
    };

    const statusLabels = {
      matched: 'Matched',
      modified: 'Modified',
      only_in_source: 'Only in Source',
      only_in_target: 'Only in Target',
      comparison_in_progress: 'In Progress',
      comparison_failed: 'Failed'
    };

    if (viewMode === 'list') {
      return (
        <div key={node.path} className="px-3 py-1">
          <Button
            variant="ghost"
            className={cn(
              "w-full h-8 px-3 justify-start gap-3 relative group hover:bg-accent/60 transition-colors",
              isSelected && "bg-accent text-accent-foreground"
            )}
            onClick={() => {
              if (node.type === 'directory') {
                toggleFolder(node.path);
              } else {
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
      <div key={node.path}>
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
              toggleFolder(node.path);
            } else {
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
        {node.type === 'directory' && isExpanded && node.children?.map(child => 
          renderNode(child, level + 1)
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
      {filteredData.map(node => renderNode(node))}
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

  const handleSettingChange = (key: keyof DiffSettings, value: any) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      // Save to localStorage
      localStorage.setItem('diffSettings', JSON.stringify(newSettings));
      return newSettings;
    });
  };

  // Save selected file to localStorage
  const handleFileSelect = async (path: string) => {
    setSelectedFile(path);
    localStorage.setItem('selectedFile', path);
    setIsLoading(true);
    
    // TODO: Replace this with actual API call to fetch file contents
    // Simulating API call with sample data
    setTimeout(() => {
      const fileExtension = path.split('.').pop() || 'apex';
      let original, modified, lang;
      
      switch (fileExtension) {
        case 'cls':
          original = `public class AccountService {
    public static void updateAccountRating(Id accountId) {
        Account acc = [SELECT Id, AnnualRevenue FROM Account WHERE Id = :accountId];
        
        if (acc.AnnualRevenue > 1000000) {
            acc.Rating = 'Hot';
        }
        
        update acc;
    }
    
    public static void createAccount(String name, String industry) {
        Account acc = new Account();
        acc.Name = name;
        acc.Industry = industry;
        insert acc;
    }
}`;
          modified = `public class AccountService {
    public static void updateAccountRating(Id accountId) {
        Account acc = [SELECT Id, AnnualRevenue, NumberOfEmployees, BillingCity FROM Account WHERE Id = :accountId AND IsActive = true ORDER BY CreatedDate DESC LIMIT 1];
        
        if (acc.AnnualRevenue > 1000000 || acc.NumberOfEmployees > 500) {
            acc.Rating = 'Hot';
        } else if (acc.AnnualRevenue > 500000) {
            acc.Rating = 'Warm';
        } else {
            acc.Rating = 'Cold';
        }
        
        // Add territory assignment logic
        if (acc.BillingCity != null) {
            acc.Territory__c = assignTerritory(acc.BillingCity);
        }
        
        update acc;
    }
    
    public static void createAccount(String name, String industry, String type, Decimal revenue) {
        Account acc = new Account();
        acc.Name = name;
        acc.Industry = industry;
        acc.Type = type;
        acc.AnnualRevenue = revenue;
        acc.Rating = calculateInitialRating(revenue);
        insert acc;
        
        // Send welcome notification
        sendWelcomeNotification(acc.Id);
    }
    
    private static String assignTerritory(String city) {
        // Territory assignment logic
        if (city.contains('New York') || city.contains('Los Angeles')) {
            return 'West Coast';
        } else if (city.contains('Chicago') || city.contains('Boston')) {
            return 'Central';
        }
        return 'Other';
    }
    
    private static String calculateInitialRating(Decimal revenue) {
        if (revenue > 1000000) return 'Hot';
        if (revenue > 500000) return 'Warm';
        return 'Cold';
    }
    
    private static void sendWelcomeNotification(Id accountId) {
        // Notification logic here
        System.debug('Welcome notification sent for account: ' + accountId);
    }
}`;
          lang = 'apex';
          break;
          
        case 'trigger':
          original = `trigger AccountTrigger on Account (before insert, before update) {
    for(Account acc : Trigger.new) {
        if(acc.AnnualRevenue > 1000000) {
            acc.Rating = 'Hot';
        }
    }
}`;
          modified = `trigger AccountTrigger on Account (before insert, before update, after insert, after update) {
    // Before insert/update logic
    if(Trigger.isBefore) {
        for(Account acc : Trigger.new) {
            // Enhanced rating logic
            if(acc.AnnualRevenue > 1000000 || acc.NumberOfEmployees > 500) {
                acc.Rating = 'Hot';
            } else if(acc.AnnualRevenue > 500000) {
                acc.Rating = 'Warm';
            } else {
                acc.Rating = 'Cold';
            }
            
            // Auto-populate fields
            if(acc.BillingCity != null && acc.BillingState == null) {
                acc.BillingState = getStateFromCity(acc.BillingCity);
            }
            
            // Validation
            if(acc.AnnualRevenue < 0) {
                acc.addError('Annual Revenue cannot be negative');
            }
        }
    }
    
    // After insert/update logic
    if(Trigger.isAfter) {
        List<Id> accountIds = new List<Id>();
        for(Account acc : Trigger.new) {
            accountIds.add(acc.Id);
        }
        
        // Create related records
        if(Trigger.isInsert) {
            createDefaultContacts(accountIds);
            sendWelcomeNotifications(accountIds);
        }
        
        if(Trigger.isUpdate) {
            updateRelatedRecords(accountIds);
        }
    }
}

private static String getStateFromCity(String city) {
    // City to state mapping logic
    Map<String, String> cityStateMap = new Map<String, String>{
        'New York' => 'NY',
        'Los Angeles' => 'CA',
        'Chicago' => 'IL',
        'Boston' => 'MA'
    };
    
    for(String key : cityStateMap.keySet()) {
        if(city.contains(key)) {
            return cityStateMap.get(key);
        }
    }
    return null;
}

private static void createDefaultContacts(List<Id> accountIds) {
    List<Contact> contacts = new List<Contact>();
    for(Id accountId : accountIds) {
        Contact con = new Contact();
        con.AccountId = accountId;
        con.FirstName = 'Default';
        con.LastName = 'Contact';
        con.Email = 'default@example.com';
        contacts.add(con);
    }
    insert contacts;
}

private static void sendWelcomeNotifications(List<Id> accountIds) {
    // Notification logic
    System.debug('Welcome notifications sent for accounts: ' + accountIds);
}

private static void updateRelatedRecords(List<Id> accountIds) {
    // Update related records logic
    System.debug('Related records updated for accounts: ' + accountIds);
}`;
          lang = 'apex';
          break;
          
        case 'js':
          original = `import { LightningElement, api, wire } from 'lwc';
import getAccounts from '@salesforce/apex/AccountController.getAccounts';

export default class AccountList extends LightningElement {
    @api recordId;
    accounts = [];
    error;
    
    @wire(getAccounts)
    wiredAccounts({ error, data }) {
        if (data) {
            this.accounts = data;
        } else if (error) {
            this.error = error;
        }
    }
}`;
          modified = `import { LightningElement, api, wire, track } from 'lwc';
import getAccounts from '@salesforce/apex/AccountController.getAccounts';
import getAccountStats from '@salesforce/apex/AccountController.getAccountStats';
import { refreshApex } from '@salesforce/apex';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class AccountList extends LightningElement {
    @api recordId;
    @track accounts = [];
    @track error;
    @track isLoading = false;
    @track selectedAccountId;
    @track showAccountDetails = false;
    @track accountStats = {};
    @track searchTerm = '';
    @track sortBy = 'Name';
    @track sortDirection = 'asc';
    
    wiredAccountsResult;
    wiredStatsResult;
    
    @wire(getAccounts)
    wiredAccounts(result) {
        this.wiredAccountsResult = result;
        this.isLoading = true;
        
        if (result.data) {
            this.accounts = result.data.map(account => ({
                ...account,
                displayName: account.Name + ' (' + account.Type + ')',
                formattedRevenue: this.formatCurrency(account.AnnualRevenue),
                statusClass: this.getStatusClass(account.Rating)
            }));
            this.error = undefined;
            this.loadAccountStats();
        } else if (result.error) {
            this.error = result.error;
            this.accounts = [];
            this.showToast('Error', 'Failed to load accounts', 'error');
        }
        this.isLoading = false;
    }
    
    @wire(getAccountStats)
    wiredAccountStats(result) {
        this.wiredStatsResult = result;
        if (result.data) {
            this.accountStats = result.data;
        }
    }
    
    handleRefresh() {
        return Promise.all([
            refreshApex(this.wiredAccountsResult),
            refreshApex(this.wiredStatsResult)
        ]);
    }
    
    handleSearch(event) {
        this.searchTerm = event.target.value;
        this.filterAccounts();
    }
    
    handleSort(event) {
        const field = event.target.dataset.field;
        if (this.sortBy === field) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortBy = field;
            this.sortDirection = 'asc';
        }
        this.sortAccounts();
    }
    
    handleAccountSelect(event) {
        this.selectedAccountId = event.currentTarget.dataset.id;
        this.showAccountDetails = true;
    }
    
    handleCloseDetails() {
        this.showAccountDetails = false;
        this.selectedAccountId = null;
    }
    
    filterAccounts() {
        // Filter logic based on searchTerm
        const filtered = this.accounts.filter(account => 
            account.Name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
            account.Industry.toLowerCase().includes(this.searchTerm.toLowerCase())
        );
        this.accounts = filtered;
    }
    
    sortAccounts() {
        this.accounts.sort((a, b) => {
            let aValue = a[this.sortBy];
            let bValue = b[this.sortBy];
            
            if (typeof aValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }
            
            if (aValue < bValue) return this.sortDirection === 'asc' ? -1 : 1;
            if (aValue > bValue) return this.sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }
    
    formatCurrency(value) {
        if (!value) return '$0';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(value);
    }
    
    getStatusClass(rating) {
        switch (rating) {
            case 'Hot': return 'status-hot';
            case 'Warm': return 'status-warm';
            case 'Cold': return 'status-cold';
            default: return 'status-unknown';
        }
    }
    
    loadAccountStats() {
        // Load additional account statistics
        console.log('Loading account statistics...');
    }
    
    showToast(title, message, variant) {
        const evt = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant
        });
        this.dispatchEvent(evt);
    }
    
    get hasAccounts() {
        return this.accounts && this.accounts.length > 0;
    }
    
    get totalAccounts() {
        return this.accounts ? this.accounts.length : 0;
    }
    
    get averageRevenue() {
        if (!this.accounts || this.accounts.length === 0) return 0;
        const total = this.accounts.reduce((sum, account) => sum + (account.AnnualRevenue || 0), 0);
        return total / this.accounts.length;
    }
}`;
          lang = 'javascript';
          break;
          
        case 'html':
          original = `<template>
    <lightning-card title="Account List" icon-name="standard:account">
        <div class="slds-p-around_medium">
            <template if:true={accounts}>
                <template for:each={accounts} for:item="account">
                    <div key={account.Id} class="slds-p-vertical_small">
                        {account.Name}
                    </div>
                </template>
            </template>
        </div>
    </lightning-card>
</template>`;
          modified = `<template>
    <lightning-card title="Account Management Dashboard" icon-name="standard:account">
        <div class="slds-p-around_medium">
            <!-- Search and Filter Section -->
            <div class="slds-grid slds-grid_align-spread slds-m-bottom_medium">
                <div class="slds-col slds-size_1-of-2">
                    <lightning-input 
                        type="search" 
                        label="Search Accounts" 
                        placeholder="Search by name or industry..."
                        onchange={handleSearch}
                        class="slds-m-bottom_small">
                    </lightning-input>
                </div>
                <div class="slds-col slds-size_1-of-3">
                    <lightning-button-group>
                        <lightning-button 
                            label="Refresh" 
                            icon-name="utility:refresh" 
                            onclick={handleRefresh}
                            variant="neutral">
                        </lightning-button>
                        <lightning-button 
                            label="Export" 
                            icon-name="utility:download" 
                            variant="neutral">
                        </lightning-button>
                    </lightning-button-group>
                </div>
            </div>
            
            <!-- Statistics Cards -->
            <div class="slds-grid slds-grid_align-spread slds-m-bottom_medium">
                <div class="slds-col slds-size_1-of-4">
                    <div class="slds-card slds-card_boundary">
                        <div class="slds-card__header">
                            <h3 class="slds-card__header-title">Total Accounts</h3>
                        </div>
                        <div class="slds-card__body slds-card__body_inner">
                            <div class="slds-text-heading_large">{totalAccounts}</div>
                        </div>
                    </div>
                </div>
                <div class="slds-col slds-size_1-of-4">
                    <div class="slds-card slds-card_boundary">
                        <div class="slds-card__header">
                            <h3 class="slds-card__header-title">Average Revenue</h3>
                        </div>
                        <div class="slds-card__body slds-card__body_inner">
                            <div class="slds-text-heading_large">{averageRevenue}</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Loading Spinner -->
            <lightning-spinner if:true={isLoading} alternative-text="Loading accounts..."></lightning-spinner>
            
            <!-- Account List -->
            <template if:true={hasAccounts}>
                <div class="slds-table_header">
                    <table class="slds-table slds-table_cell-buffer slds-table_bordered">
                        <thead>
                            <tr class="slds-line-height_reset">
                                <th class="slds-text-title_caps" scope="col">
                                    <div class="slds-truncate" title="Account Name">
                                        <lightning-button-icon 
                                            icon-name="utility:arrowdown" 
                                            variant="bare" 
                                            data-field="Name"
                                            onclick={handleSort}
                                            class="slds-m-right_x-small">
                                        </lightning-button-icon>
                                        Account Name
                                    </div>
                                </th>
                                <th class="slds-text-title_caps" scope="col">
                                    <div class="slds-truncate" title="Industry">
                                        <lightning-button-icon 
                                            icon-name="utility:arrowdown" 
                                            variant="bare" 
                                            data-field="Industry"
                                            onclick={handleSort}
                                            class="slds-m-right_x-small">
                                        </lightning-button-icon>
                                        Industry
                                    </div>
                                </th>
                                <th class="slds-text-title_caps" scope="col">
                                    <div class="slds-truncate" title="Revenue">
                                        <lightning-button-icon 
                                            icon-name="utility:arrowdown" 
                                            variant="bare" 
                                            data-field="AnnualRevenue"
                                            onclick={handleSort}
                                            class="slds-m-right_x-small">
                                        </lightning-button-icon>
                                        Annual Revenue
                                    </div>
                                </th>
                                <th class="slds-text-title_caps" scope="col">
                                    <div class="slds-truncate" title="Rating">Rating</div>
                                </th>
                                <th class="slds-text-title_caps" scope="col">
                                    <div class="slds-truncate" title="Actions">Actions</div>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <template for:each={accounts} for:item="account">
                                <tr key={account.Id} class="slds-hint-parent">
                                    <td>
                                        <div class="slds-truncate" title={account.Name}>
                                            <a href="#" onclick={handleAccountSelect} data-id={account.Id} class="slds-link">
                                                {account.displayName}
                                            </a>
                                        </div>
                                    </td>
                                    <td>
                                        <div class="slds-truncate" title={account.Industry}>
                                            {account.Industry}
                                        </div>
                                    </td>
                                    <td>
                                        <div class="slds-truncate" title={account.formattedRevenue}>
                                            {account.formattedRevenue}
                                        </div>
                                    </td>
                                    <td>
                                        <lightning-badge 
                                            label={account.Rating} 
                                            class={account.statusClass}>
                                        </lightning-badge>
                                    </td>
                                    <td>
                                        <lightning-button-icon 
                                            icon-name="utility:edit" 
                                            variant="bare" 
                                            onclick={handleEdit} 
                                            data-id={account.Id}
                                            title="Edit Account">
                                        </lightning-button-icon>
                                        <lightning-button-icon 
                                            icon-name="utility:delete" 
                                            variant="bare" 
                                            onclick={handleDelete} 
                                            data-id={account.Id}
                                            title="Delete Account">
                                        </lightning-button-icon>
                                    </td>
                                </tr>
                            </template>
                        </tbody>
                    </table>
                </div>
            </template>
            
            <!-- Empty State -->
            <template if:false={hasAccounts}>
                <div class="slds-illustration slds-illustration_small">
                    <div class="slds-text-longform">
                        <h3 class="slds-text-heading_medium">No accounts found</h3>
                        <p class="slds-text-body_regular">Try adjusting your search criteria or create a new account.</p>
                    </div>
                </div>
            </template>
        </div>
    </lightning-card>
    
    <!-- Account Details Modal -->
    <template if:true={showAccountDetails}>
        <section role="dialog" tabindex="-1" class="slds-modal slds-fade-in-open">
            <div class="slds-modal__container">
                <header class="slds-modal__header">
                    <button class="slds-button slds-button_icon slds-modal__close slds-button_icon-inverse" title="Close" onclick={handleCloseDetails}>
                        <lightning-icon icon-name="utility:close" alternative-text="Close" variant="inverse" size="small"></lightning-icon>
                    </button>
                    <h2 class="slds-text-heading_medium slds-hyphenate">Account Details</h2>
                </header>
                <div class="slds-modal__content slds-p-around_medium">
                    <p>Account details would be displayed here...</p>
                </div>
            </div>
        </section>
        <div class="slds-backdrop slds-backdrop_open"></div>
    </template>
</template>`;
          lang = 'html';
          break;
          
        case 'css':
          original = `.account-list {
    padding: 1rem;
}

.account-item {
    border-bottom: 1px solid #e0e0e0;
    padding: 0.75rem 0;
    transition: all 0.2s ease;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(10px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    margin-bottom: 0.5rem;
}

.account-name {
    font-weight: bold;
    color: #333;
}`;
          modified = `.account-list {
    padding: 1rem;
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    min-height: 100vh;
}

.account-item {
    border-bottom: 1px solid #e0e0e0;
    padding: 0.75rem 0;
    transition: all 0.2s ease;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(10px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    margin-bottom: 0.5rem;
}

.account-item:hover {
    background-color: rgba(0, 123, 255, 0.1);
    transform: translateX(4px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.account-name {
    font-weight: 600;
    color: #2c3e50;
    font-size: 1.1rem;
    margin-bottom: 0.25rem;
}

.account-meta {
    color: #7f8c8d;
    font-size: 0.9rem;
    margin-top: 0.25rem;
}

.status-hot {
    background-color: #ff6b6b;
    color: white;
    padding: 0.25rem 0.5rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
}

.status-warm {
    background-color: #feca57;
    color: #2c3e50;
    padding: 0.25rem 0.5rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
}

.status-cold {
    background-color: #48dbfb;
    color: #2c3e50;
    padding: 0.25rem 0.5rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
}

.status-unknown {
    background-color: #c8d6e5;
    color: #2c3e50;
    padding: 0.25rem 0.5rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
}

.search-container {
    position: relative;
    margin-bottom: 1rem;
}

.search-input {
    width: 100%;
    padding: 0.75rem 1rem 0.75rem 2.5rem;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    font-size: 1rem;
    transition: all 0.2s ease;
    background: rgba(255, 255, 255, 0.9);
}

.search-input:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.search-icon {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: #6c757d;
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
}

.stat-card {
    background: rgba(255, 255, 255, 0.95);
    border-radius: 12px;
    padding: 1.5rem;
    text-align: center;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    transition: transform 0.2s ease;
}

.stat-card:hover {
    transform: translateY(-2px);
}

.stat-value {
    font-size: 2rem;
    font-weight: 700;
    color: #2c3e50;
    margin-bottom: 0.5rem;
}

.stat-label {
    color: #7f8c8d;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.table-container {
    background: rgba(255, 255, 255, 0.95);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.data-table {
    width: 100%;
    border-collapse: collapse;
}

.data-table th {
    background: #f8f9fa;
    padding: 1rem;
    text-align: left;
    font-weight: 600;
    color: #2c3e50;
    border-bottom: 2px solid #e0e0e0;
}

.data-table td {
    padding: 1rem;
    border-bottom: 1px solid #e0e0e0;
    vertical-align: middle;
}

.data-table tr:hover {
    background-color: rgba(0, 123, 255, 0.05);
}

.action-buttons {
    display: flex;
    gap: 0.5rem;
}

.btn-icon {
    padding: 0.5rem;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    background: transparent;
}

.btn-icon:hover {
    background-color: rgba(0, 123, 255, 0.1);
    transform: scale(1.1);
}

.btn-edit {
    color: #007bff;
}

.btn-delete {
    color: #dc3545;
}

.empty-state {
    text-align: center;
    padding: 3rem;
    color: #6c757d;
}

.empty-state h3 {
    margin-bottom: 1rem;
    color: #2c3e50;
}

.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.modal-content {
    background: white;
    border-radius: 12px;
    padding: 2rem;
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
}

@media (max-width: 768px) {
    .stats-grid {
        grid-template-columns: 1fr;
    }
    
    .data-table {
        font-size: 0.9rem;
    }
    
    .data-table th,
    .data-table td {
        padding: 0.75rem 0.5rem;
    }
}`;
          lang = 'css';
          break;
          
        case 'page':
          original = `<apex:page standardController="Account" extensions="AccountController">
    <apex:form>
        <apex:pageBlock title="Account Details">
            <apex:pageBlockSection>
                <apex:inputField value="{!Account.Name}"/>
                <apex:inputField value="{!Account.Industry}"/>
                <apex:inputField value="{!Account.Type}"/>
                <apex:inputField value="{!Account.Industry}"/>
            </apex:pageBlockSection>
        </apex:pageBlock>
    </apex:form>
</apex:page>`;
          modified = `<apex:page standardController="Account" extensions="AccountController" lightningStylesheets="true" showHeader="false" sidebar="false">
    <apex:slds />
    
    <div class="slds-scope">
        <apex:form id="accountForm">
            <!-- Header Section -->
            <div class="slds-page-header slds-page-header_joined">
                <div class="slds-page-header__row">
                    <div class="slds-page-header__col-title">
                        <div class="slds-media">
                            <div class="slds-media__figure">
                                <span class="slds-icon_container slds-icon-standard-account">
                                    <lightning-icon icon-name="standard:account" size="medium"></lightning-icon>
                                </span>
                            </div>
                            <div class="slds-media__body">
                                <div class="slds-page-header__name">
                                    <div class="slds-page-header__name-title">
                                        <h1>
                                            <span class="slds-page-header__title slds-truncate" title="Account Details">
                                                <apex:outputText value="{!Account.Name}" rendered="{!NOT(ISNULL(Account.Name))}"/>
                                                <apex:outputText value="New Account" rendered="{!ISNULL(Account.Name)}"/>
                                            </span>
                                        </h1>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="slds-page-header__col-actions">
                        <div class="slds-page-header__actions">
                            <apex:commandButton 
                                action="{!save}" 
                                value="Save" 
                                styleClass="slds-button slds-button_brand"
                                reRender="accountForm"/>
                            <apex:commandButton 
                                action="{!cancel}" 
                                value="Cancel" 
                                styleClass="slds-button slds-button_neutral"
                                reRender="accountForm"/>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Main Content -->
            <div class="slds-p-around_medium">
                <div class="slds-grid slds-wrap">
                    <!-- Basic Information -->
                    <div class="slds-col slds-size_1-of-1 slds-medium-size_2-of-3">
                        <div class="slds-card">
                            <div class="slds-card__header">
                                <h2 class="slds-card__header-title">
                                    <span class="slds-text-heading_medium">Basic Information</span>
                                </h2>
                            </div>
                            <div class="slds-card__body slds-card__body_inner">
                                <div class="slds-form slds-form_stacked">
                                    <div class="slds-form-element slds-form-element_1-col slds-m-bottom_medium">
                                        <label class="slds-form-element__label" for="accountName">
                                            <abbr class="slds-required" title="required">*</abbr>Account Name
                                        </label>
                                        <div class="slds-form-element__control">
                                            <apex:inputField 
                                                value="{!Account.Name}" 
                                                required="true"
                                                styleClass="slds-input"
                                                html-placeholder="Enter account name"/>
                                        </div>
                                    </div>
                                    
                                    <div class="slds-grid slds-gutters">
                                        <div class="slds-col">
                                            <div class="slds-form-element">
                                                <label class="slds-form-element__label" for="accountIndustry">Industry</label>
                                                <div class="slds-form-element__control">
                                                    <apex:inputField 
                                                        value="{!Account.Industry}" 
                                                        styleClass="slds-input"/>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="slds-col">
                                            <div class="slds-form-element">
                                                <label class="slds-form-element__label" for="accountType">Type</label>
                                                <div class="slds-form-element__control">
                                                    <apex:inputField 
                                                        value="{!Account.Type}" 
                                                        styleClass="slds-input"/>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="slds-grid slds-gutters slds-m-top_medium">
                                        <div class="slds-col">
                                            <div class="slds-form-element">
                                                <label class="slds-form-element__label" for="accountRating">Rating</label>
                                                <div class="slds-form-element__control">
                                                    <apex:inputField 
                                                        value="{!Account.Rating}" 
                                                        styleClass="slds-input"/>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="slds-col">
                                            <div class="slds-form-element">
                                                <label class="slds-form-element__label" for="accountPhone">Phone</label>
                                                <div class="slds-form-element__control">
                                                    <apex:inputField 
                                                        value="{!Account.Phone}" 
                                                        styleClass="slds-input"/>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Financial Information -->
                    <div class="slds-col slds-size_1-of-1 slds-medium-size_1-of-3">
                        <div class="slds-card">
                            <div class="slds-card__header">
                                <h2 class="slds-card__header-title">
                                    <span class="slds-text-heading_medium">Financial Information</span>
                                </h2>
                            </div>
                            <div class="slds-card__body slds-card__body_inner">
                                <div class="slds-form slds-form_stacked">
                                    <div class="slds-form-element slds-m-bottom_medium">
                                        <label class="slds-form-element__label" for="accountRevenue">Annual Revenue</label>
                                        <div class="slds-form-element__control">
                                            <apex:inputField 
                                                value="{!Account.AnnualRevenue}" 
                                                styleClass="slds-input"/>
                                        </div>
                                    </div>
                                    
                                    <div class="slds-form-element slds-m-bottom_medium">
                                        <label class="slds-form-element__label" for="accountEmployees">Number of Employees</label>
                                        <div class="slds-form-element__control">
                                            <apex:inputField 
                                                value="{!Account.NumberOfEmployees}" 
                                                styleClass="slds-input"/>
                                        </div>
                                    </div>
                                    
                                    <div class="slds-form-element">
                                        <label class="slds-form-element__label" for="accountOwnership">Ownership</label>
                                        <div class="slds-form-element__control">
                                            <apex:inputField 
                                                value="{!Account.Ownership}" 
                                                styleClass="slds-input"/>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Address Information -->
                <div class="slds-card slds-m-top_medium">
                    <div class="slds-card__header">
                        <h2 class="slds-card__header-title">
                            <span class="slds-text-heading_medium">Address Information</span>
                        </h2>
                    </div>
                    <div class="slds-card__body slds-card__body_inner">
                        <div class="slds-form slds-form_stacked">
                            <div class="slds-grid slds-gutters">
                                <div class="slds-col slds-size_1-of-2">
                                    <div class="slds-form-element">
                                        <label class="slds-form-element__label" for="accountBillingStreet">Billing Street</label>
                                        <div class="slds-form-element__control">
                                            <apex:inputField 
                                                value="{!Account.BillingStreet}" 
                                                styleClass="slds-input"/>
                                        </div>
                                    </div>
                                </div>
                                <div class="slds-col slds-size_1-of-2">
                                    <div class="slds-form-element">
                                        <label class="slds-form-element__label" for="accountBillingCity">Billing City</label>
                                        <div class="slds-form-element__control">
                                            <apex:inputField 
                                                value="{!Account.BillingCity}" 
                                                styleClass="slds-input"/>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="slds-grid slds-gutters slds-m-top_medium">
                                <div class="slds-col slds-size_1-of-3">
                                    <div class="slds-form-element">
                                        <label class="slds-form-element__label" for="accountBillingState">Billing State</label>
                                        <div class="slds-form-element__control">
                                            <apex:inputField 
                                                value="{!Account.BillingState}" 
                                                styleClass="slds-input"/>
                                        </div>
                                    </div>
                                </div>
                                <div class="slds-col slds-size_1-of-3">
                                    <div class="slds-form-element">
                                        <label class="slds-form-element__label" for="accountBillingPostalCode">Billing Postal Code</label>
                                        <div class="slds-form-element__control">
                                            <apex:inputField 
                                                value="{!Account.BillingPostalCode}" 
                                                styleClass="slds-input"/>
                                        </div>
                                    </div>
                                </div>
                                <div class="slds-col slds-size_1-of-3">
                                    <div class="slds-form-element">
                                        <label class="slds-form-element__label" for="accountBillingCountry">Billing Country</label>
                                        <div class="slds-form-element__control">
                                            <apex:inputField 
                                                value="{!Account.BillingCountry}" 
                                                styleClass="slds-input"/>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </apex:form>
    </div>
</apex:page>`;
          lang = 'html';
          break;
          
        case 'diff':
          // Example showing how to handle unified diff strings
          // In a real scenario, you would parse the diff string to extract original and modified content
          // 
          // Example unified diff string:
          // --- a/src/components/SimpleComponent.js
          // +++ b/src/components/SimpleComponent.js
          // @@ -1,7 +1,12 @@
          //  import React from 'react';
          // +import { useState } from 'react';
          // 
          //  function SimpleComponent() {
          // +  const [count, setCount] = useState(0);
          // +  
          //   return (
          //     <div>
          //       <h1>Hello World</h1>
          // +      <p>Count: {count}</p>
          // +      <button onClick={() => setCount(count + 1)}>Increment</button>
          //     </div>
          //   );
          // }
          // 
          // export default SimpleComponent;
          //
          // You would need to parse this diff string to extract the original and modified content
          // before passing them to the GitDiffViewer component
          original = `import React from 'react';

function SimpleComponent() {
  return (
    <div>
      <h1>Hello World</h1>
    </div>
  );
}

export default SimpleComponent;`;
          modified = `import React from 'react';
import { useState } from 'react';

function SimpleComponent() {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      <h1>Hello World</h1>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}

export default SimpleComponent;`;
          lang = 'javascript';
          break;
          
        case 'lazy':
          // Example demonstrating lazy loading with unified diff strings
          // This simulates what you'd get from a server that only sends diff data initially
          const diffString = `--- a/src/components/LazyComponent.js
+++ b/src/components/LazyComponent.js
@@ -1,5 +1,8 @@
 import React from 'react';

 function LazyComponent() {
-  return <div>Simple Component</div>;
+  const [data, setData] = useState(null);
+  
+  return <div>Enhanced Component with State</div>;
 }

 export default LazyComponent;`;
          
          // Parse the diff string to get initial content
          const parsed = parseUnifiedDiff(diffString);
          original = parsed.original;
          modified = parsed.modified;
          lang = 'javascript';
          break;
          
        default:
          original = `// Original content for ${path}`;
          modified = `// Modified content for ${path}`;
          lang = fileExtension;
      }
      
      setFileContent({
        original,
        modified,
        language: lang
      });
      setIsLoading(false);
    }, 500);
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
              <FileTree
                data={sampleData}
                onSelect={handleFileSelect}
                selectedPath={selectedFile}
              />
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex items-center gap-2">
          <GitCompare className="h-5 w-5" />
          {/* <GitGraph className="h-5 w-5" /> */}
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
              <FileTree
                data={sampleData}
                onSelect={handleFileSelect}
                selectedPath={selectedFile}
              />
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
                    {selectedFile && (
                      <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                        <span className="text-green-500 font-medium">+10</span>
                        <span>/</span>
                        <span className="text-red-500 font-medium">-5</span>
                      </div>
                    )}
                  </div>
                  {selectedFile && (
                    <p className="text-xs text-muted-foreground truncate">
                      {selectedFile}
                    </p>
                  )}
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
                    notPresentInSource={!!(selectedFile && sampleData.some(node => 
                      findNodeByPath(node, selectedFile)?.status === 'only_in_target'
                    ))}
                    notPresentInTarget={!!(selectedFile && sampleData.some(node => 
                      findNodeByPath(node, selectedFile)?.status === 'only_in_source'
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
          <span>Ready</span>
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