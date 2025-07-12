import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight, ChevronDown, FolderClosed, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

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
  };
}

interface SidebarProps {
  data: FileNode[];
  onFileSelect: (path: string) => void;
  selectedFile?: string;
  className?: string;
}

const FileTreeNode = ({ 
  node, 
  level = 0, 
  onFileSelect, 
  selectedFile 
}: { 
  node: FileNode; 
  level?: number; 
  onFileSelect: (path: string) => void;
  selectedFile?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const paddingLeft = `${level * 1}rem`;
  const isSelected = selectedFile === node.path;

  const statusColors = {
    modified: "text-yellow-500",
    added: "text-green-500",
    deleted: "text-red-500",
    renamed: "text-blue-500",
  };

  const statusColor = node.metadata?.status ? statusColors[node.metadata.status] : "";

  return (
    <div>
      <Button
        variant="ghost"
        className={cn(
          "w-full h-8 px-2 justify-start gap-2",
          isSelected && "bg-accent",
          node.type === "directory" && isOpen && "bg-muted"
        )}
        style={{ paddingLeft }}
        onClick={() => {
          if (node.type === "file") {
            onFileSelect(node.path);
          } else {
            setIsOpen(!isOpen);
          }
        }}
      >
        {node.type === "directory" ? (
          isOpen ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          )
        ) : null}
        {node.type === "directory" ? (
          isOpen ? (
            <FolderOpen className="h-4 w-4 shrink-0 text-primary" />
          ) : (
            <FolderClosed className="h-4 w-4 shrink-0 text-muted-foreground" />
          )
        ) : (
          <div className="w-4 h-4 relative">
            <svg
              className={cn("h-4 w-4 shrink-0", statusColor)}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            {node.metadata?.changes && (
              <div className="absolute -right-1 -top-1 flex items-center text-[10px] font-medium">
                <span className="text-green-500">+{node.metadata.changes.additions}</span>
                <span>/</span>
                <span className="text-red-500">-{node.metadata.changes.deletions}</span>
              </div>
            )}
          </div>
        )}
        <span className="truncate flex-1 text-sm">{node.name}</span>
        {node.metadata?.status && (
          <span className={cn("text-[10px] font-medium", statusColor)}>
            {node.metadata.status}
          </span>
        )}
      </Button>
      {node.type === "directory" && isOpen && node.children && (
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

const statusColors = {
  modified: "text-yellow-500",
  added: "text-green-500",
  deleted: "text-red-500",
  renamed: "text-blue-500",
} as const;

export function Sidebar({ data, onFileSelect, selectedFile, className }: SidebarProps) {
  const [isFilesOpen, setIsFilesOpen] = useState(true);
  const [isStatsOpen, setIsStatsOpen] = useState(true);

  // Calculate statistics
  const stats = data.reduce((acc, node) => {
    const countChanges = (node: FileNode) => {
      if (node.metadata?.changes) {
        acc.totalAdditions += node.metadata.changes.additions;
        acc.totalDeletions += node.metadata.changes.deletions;
      }
      if (node.metadata?.status) {
        acc.byStatus[node.metadata.status] = (acc.byStatus[node.metadata.status] || 0) + 1;
      }
      if (node.children) {
        node.children.forEach(countChanges);
      }
    };
    countChanges(node);
    return acc;
  }, {
    totalAdditions: 0,
    totalDeletions: 0,
    byStatus: {} as Record<string, number>
  });

  return (
    <div className={cn("h-full flex flex-col", className)}>
      <div className="space-y-2 px-4 py-2">
        <Collapsible open={isStatsOpen} onOpenChange={setIsStatsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between">
              <span className="font-semibold">Statistics</span>
              <ChevronRight className={cn(
                "h-4 w-4 transition-transform",
                isStatsOpen && "transform rotate-90"
              )} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2">
            <div className="text-sm space-y-1 mt-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Changes</span>
                <div>
                  <span className="text-green-500">+{stats.totalAdditions}</span>
                  {" / "}
                  <span className="text-red-500">-{stats.totalDeletions}</span>
                </div>
              </div>
              {Object.entries(stats.byStatus).map(([status, count]) => (
                <div key={status} className="flex justify-between">
                  <span className="text-muted-foreground capitalize">{status}</span>
                  <span className={statusColors[status as keyof typeof statusColors]}>
                    {count} files
                  </span>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        <Collapsible open={isFilesOpen} onOpenChange={setIsFilesOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between">
              <span className="font-semibold">Files</span>
              <ChevronRight className={cn(
                "h-4 w-4 transition-transform",
                isFilesOpen && "transform rotate-90"
              )} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ScrollArea className="h-[calc(100vh-12rem)] pr-4">
              {data.map((node, index) => (
                <FileTreeNode
                  key={`${node.path}-${index}`}
                  node={node}
                  onFileSelect={onFileSelect}
                  selectedFile={selectedFile}
                />
              ))}
            </ScrollArea>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
} 