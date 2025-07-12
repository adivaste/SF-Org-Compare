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
import { Menu, Settings, GitCompare, ChevronDown, ChevronRight, FileIcon, FolderIcon, Code, FileText, Palette, Zap, Search, Regex, CaseSensitive, WholeWord, FileSearch, Filter, ListTree, List } from 'lucide-react';
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
                    status: 'modified'
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
      default:
        return <FileIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const filterNodes = (nodes: FileNode[]): FileNode[] => {
    if (!searchTerm) return nodes;
    
    return nodes.filter(node => {
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
      return matchesSearch || hasMatchingChildren;
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
        <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Files
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
}`;
          modified = `public class AccountService {
    public static void updateAccountRating(Id accountId) {
        Account acc = [SELECT Id, AnnualRevenue, NumberOfEmployees FROM Account WHERE Id = :accountId AND IsActive = true ORDER BY CreatedDate DESC LIMIT 1];
        
        if (acc.AnnualRevenue > 1000000 || acc.NumberOfEmployees > 500) {
            acc.Rating = 'Hot';
        } else if (acc.AnnualRevenue > 500000) {
            acc.Rating = 'Warm';
        }
        
        update acc;
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
          modified = `trigger AccountTrigger on Account (before insert, before update, after insert) {
    for(Account acc : Trigger.new) {
        if(acc.AnnualRevenue > 1000000 || acc.NumberOfEmployees > 500) {
            acc.Rating = 'Hot';
        } else if(acc.AnnualRevenue > 500000) {
            acc.Rating = 'Warm';
        }
        
        // Send notification
        if(Trigger.isAfter && Trigger.isInsert) {
            sendNotification(acc);
        }
    }
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
import { refreshApex } from '@salesforce/apex';

export default class AccountList extends LightningElement {
    @api recordId;
    @track accounts = [];
    @track error;
    @track isLoading = false;
    
    @wire(getAccounts)
    wiredAccounts({ error, data }) {
        this.isLoading = true;
        if (data) {
            this.accounts = data.map(account => ({
                ...account,
                displayName: account.Name + ' (' + account.Type + ')'
            }));
            this.error = undefined;
        } else if (error) {
            this.error = error;
            this.accounts = [];
        }
        this.isLoading = false;
    }
    
    handleRefresh() {
        return refreshApex(this.wiredAccounts);
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
    <lightning-card title="Account List" icon-name="standard:account">
        <div class="slds-p-around_medium">
            <lightning-spinner if:true={isLoading}></lightning-spinner>
            <template if:true={accounts}>
                <template for:each={accounts} for:item="account">
                    <div key={account.Id} class="slds-p-vertical_small slds-border_bottom">
                        <div class="slds-grid slds-grid_align-spread">
                            <div>
                                <strong>{account.displayName}</strong>
                                <div class="slds-text-body_small slds-text-color_weak">
                                    {account.Industry} • {account.Type}
                                </div>
                            </div>
                            <lightning-button-icon 
                                icon-name="utility:edit" 
                                variant="bare" 
                                onclick={handleEdit} 
                                data-id={account.Id}>
                            </lightning-button-icon>
                        </div>
                    </div>
                </template>
            </template>
        </div>
    </lightning-card>
</template>`;
          lang = 'html';
          break;
          
        case 'css':
          original = `.account-list {
    padding: 1rem;
}

.account-item {
    border-bottom: 1px solid #e0e0e0;
    padding: 0.5rem 0;
}

.account-name {
    font-weight: bold;
    color: #333;
}`;
          modified = `.account-list {
    padding: 1rem;
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.account-item {
    border-bottom: 1px solid #e0e0e0;
    padding: 0.75rem 0;
    transition: all 0.2s ease;
}

.account-item:hover {
    background-color: rgba(0, 123, 255, 0.1);
    transform: translateX(4px);
}

.account-name {
    font-weight: 600;
    color: #2c3e50;
    font-size: 1.1rem;
}

.account-meta {
    color: #7f8c8d;
    font-size: 0.9rem;
    margin-top: 0.25rem;
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
            </apex:pageBlockSection>
        </apex:pageBlock>
    </apex:form>
</apex:page>`;
          modified = `<apex:page standardController="Account" extensions="AccountController" lightningStylesheets="true">
    <apex:form>
        <apex:pageBlock title="Account Details" mode="edit">
            <apex:pageBlockSection columns="2">
                <apex:inputField value="{!Account.Name}" required="true"/>
                <apex:inputField value="{!Account.Industry}"/>
                <apex:inputField value="{!Account.Type}"/>
                <apex:inputField value="{!Account.AnnualRevenue}"/>
                <apex:inputField value="{!Account.NumberOfEmployees}"/>
                <apex:inputField value="{!Account.Rating}"/>
            </apex:pageBlockSection>
            <apex:pageBlockButtons>
                <apex:commandButton action="{!save}" value="Save" styleClass="btn-primary"/>
                <apex:commandButton action="{!cancel}" value="Cancel"/>
            </apex:pageBlockButtons>
        </apex:pageBlock>
    </apex:form>
</apex:page>`;
          lang = 'html';
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
