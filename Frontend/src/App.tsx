import { useState } from 'react';
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
import { Menu, Settings, GitCompare, ChevronDown, ChevronRight, FileIcon, FolderIcon } from 'lucide-react';
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
  status?: 'modified' | 'added' | 'deleted';
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
    children: [
      {
        name: 'AccountService.cls',
        type: 'file',
        path: '/force-app/AccountService.cls',
        status: 'modified'
      },
      {
        name: 'AccountTrigger.trigger',
        type: 'file',
        path: '/force-app/AccountTrigger.trigger',
        status: 'added'
      },
      {
        name: 'ContactService.cls',
        type: 'file',
        path: '/force-app/ContactService.cls',
        status: 'modified'
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
            status: 'deleted'
          },
          {
            name: 'ValidationUtils.cls',
            type: 'file',
            path: '/force-app/utils/ValidationUtils.cls',
            status: 'added'
          }
        ]
      }
    ]
  }
];

function FileTree({ 
  data, 
  onSelect, 
  selectedPath 
}: { 
  data: FileNode[]; 
  onSelect: (path: string) => void;
  selectedPath?: string;
}) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const renderNode = (node: FileNode, level: number = 0) => {
    const isExpanded = expandedFolders.has(node.path);
    const isSelected = node.path === selectedPath;
    const statusColors = {
      modified: 'bg-yellow-400',
      added: 'bg-green-400',
      deleted: 'bg-red-400'
    };

    return (
      <div key={node.path}>
        <Button
          variant="ghost"
          className={cn(
            "w-full h-8 px-2 justify-start gap-2 relative group",
            isSelected && "bg-accent",
            "hover:bg-accent/50"
          )}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
          onClick={() => {
            if (node.type === 'directory') {
              toggleFolder(node.path);
            } else {
              onSelect(node.path);
            }
          }}
        >
          {node.type === 'directory' ? (
            isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
          ) : (
            <FileIcon className="h-4 w-4" />
          )}
          <span className="text-sm truncate flex-1">{node.name}</span>
          {node.status && (
            <div className={cn(
              "w-2 h-2 rounded-sm",
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

  return <div className="py-2">{data.map(node => renderNode(node))}</div>;
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
  const [selectedFile, setSelectedFile] = useState<string>();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [fileContent, setFileContent] = useState<FileContent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<DiffSettings>({
    fontSize: 14,
    showDiffOnly: false,
    extraLines: 3,
    renderSideBySide: true,
    enableSyntaxHighlight: true,
    wrapLines: false,
    theme: 'light',
    enableWidgets: true,
    enableExtendData: false
  });

  const handleSettingChange = (key: keyof DiffSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleFileSelect = async (path: string) => {
    setSelectedFile(path);
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
            <FileTree
              data={sampleData}
              onSelect={handleFileSelect}
              selectedPath={selectedFile}
            />
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
            onCollapse={() => setIsSidebarCollapsed(true)}
            onExpand={() => setIsSidebarCollapsed(false)}
            className="hidden md:block"
          >
            <FileTree
              data={sampleData}
              onSelect={handleFileSelect}
              selectedPath={selectedFile}
            />
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          <ResizablePanel defaultSize={80}>
            <Card className="h-full rounded-none border-0">
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <h2 className="text-sm font-medium">
                    {selectedFile || 'No file selected'}
                  </h2>
                  {selectedFile && (
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <span className="text-green-500">+10</span>
                      <span>/</span>
                      <span className="text-red-500">-5</span>
                    </div>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
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
      </div>
  );
}

export default App;
