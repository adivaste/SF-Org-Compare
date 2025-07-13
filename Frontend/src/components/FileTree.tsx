import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { getFileIcon } from "@/lib/utils";

interface FileNode {
  name: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  path: string;
  metadata?: {
    status?: 'modified' | 'added' | 'deleted' | 'renamed';
    changes?: {
      additions: number;
      deletions: number;
    };
    apiVersion?: string;
    lastModifiedBy?: string;
    lastModifiedDate?: string;
    type?: 'ApexClass' | 'ApexTrigger' | 'VisualforcePage' | 'CustomObject' | 'Layout' | string;
  };
}

interface FileTreeProps {
  data: FileNode[];
  onFileSelect: (path: string) => void;
  selectedFile?: string;
  className?: string;
}

const statusColors = {
  modified: {
    bg: "bg-yellow-500/10",
    text: "text-yellow-500",
    border: "border-yellow-500/20",
  },
  added: {
    bg: "bg-green-500/10",
    text: "text-green-500",
    border: "border-green-500/20",
  },
  deleted: {
    bg: "bg-red-500/10",
    text: "text-red-500",
    border: "border-red-500/20",
  },
  renamed: {
    bg: "bg-blue-500/10",
    text: "text-blue-500",
    border: "border-blue-500/20",
  },
  onlyInSource: {
    bg: "bg-blue-500/10",
    text: "text-blue-500",
    border: "border-blue-500/20",
  },
  onlyInTarget: {
    bg: "bg-orange-500/10",
    text: "text-orange-500",
    border: "border-orange-500/20",
  },
} as const;

export function FileTree({ data, onFileSelect, selectedFile, className }: FileTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  const handleToggle = (path: string) => {
    setExpandedFolders(prev => ({ ...prev, [path]: !prev[path] }));
  };

  return (
    <ScrollArea className={cn("h-full py-2 pr-2", className)}>
      {data.map((node, index) => (
        <FileTreeNode
          key={`${node.path}-${index}`}
          node={node}
          onFileSelect={onFileSelect}
          selectedFile={selectedFile}
          expandedFolders={expandedFolders}
          onToggle={handleToggle}
        />
      ))}
    </ScrollArea>
  );
}

const FileTreeNode = ({ 
  node, 
  level = 0, 
  onFileSelect, 
  selectedFile,
  expandedFolders,
  onToggle
}: { 
  node: FileNode; 
  level?: number; 
  onFileSelect: (path: string) => void;
  selectedFile?: string;
  expandedFolders: Record<string, boolean>;
  onToggle: (path: string) => void;
}) => {
  const isOpen = expandedFolders[node.path];
  const paddingLeft = `${level * 1}rem`;
  const isSelected = selectedFile === node.path;
  const status = node.metadata?.status;
  const statusColor = status ? statusColors[status] : undefined;
  const fileIcon = node.type === 'file' ? getFileIcon(node.path) : null;

  return (
    <TooltipProvider>
      <div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "w-full h-7 px-2 justify-start gap-2 relative group",
                isSelected && "bg-accent text-accent-foreground",
                node.type === "directory" && isOpen && "bg-muted",
                status && statusColor?.bg
              )}
              style={{ paddingLeft }}
              onClick={() => {
                if (node.type === "file") {
                  onFileSelect(node.path);
                } else {
                  onToggle(node.path);
                }
              }}
            >
              {node.type === "directory" && (
                <div className="shrink-0">
                  {isOpen ? (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </div>
              )}
              <div className="flex items-center gap-2 min-w-0">
                {fileIcon && (
                  <span className="shrink-0 text-xs" aria-hidden="true">
                    {fileIcon}
                  </span>
                )}
                <span className="truncate flex-1 text-xs">
                  {node.name}
                </span>
                {status && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "h-4 text-[10px] font-normal px-1 ml-auto",
                      statusColor?.text,
                      statusColor?.border
                    )}
                  >
                    {status}
                  </Badge>
                )}
                {node.metadata?.changes && (
                  <div className="text-[10px] tabular-nums whitespace-nowrap">
                    <span className="text-green-500">+{node.metadata.changes.additions}</span>
                    <span className="text-muted-foreground">/</span>
                    <span className="text-red-500">-{node.metadata.changes.deletions}</span>
                  </div>
                )}
              </div>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" align="start" className="max-w-[300px]">
            <div className="text-xs space-y-1">
              <p className="font-medium">{node.name}</p>
              {node.metadata?.type && (
                <p className="text-muted-foreground">Type: {node.metadata.type}</p>
              )}
              {node.metadata?.apiVersion && (
                <p className="text-muted-foreground">API: v{node.metadata.apiVersion}</p>
              )}
              {node.metadata?.lastModifiedBy && (
                <p className="text-muted-foreground">Modified by: {node.metadata.lastModifiedBy}</p>
              )}
              {node.metadata?.lastModifiedDate && (
                <p className="text-muted-foreground">
                  Modified: {new Date(node.metadata.lastModifiedDate).toLocaleString()}
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
        {node.type === "directory" && isOpen && node.children && (
          <div>
            {node.children.map((child, index) => (
              <FileTreeNode
                key={`${child.path}-${index}`}
                node={child}
                level={level + 1}
                onFileSelect={onFileSelect}
                selectedFile={selectedFile}
                expandedFolders={expandedFolders}
                onToggle={onToggle}
              />
            ))}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}; 