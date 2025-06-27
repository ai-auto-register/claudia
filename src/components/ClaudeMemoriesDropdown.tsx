import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Edit2, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { api, type ClaudeMdFile } from "@/lib/api";
import { formatUnixTimestamp } from "@/lib/date-utils";

interface ClaudeMemoriesDropdownProps {
  /**
   * 用于搜索 CLAUDE.md 文件的项目路径
   */
  projectPath: string;
  /**
   * 点击编辑按钮时的回调
   */
  onEditFile: (file: ClaudeMdFile) => void;
  /**
   * 可选的样式类名
   */
  className?: string;
}

/**
 * ClaudeMemoriesDropdown 组件 - 显示项目中的所有 CLAUDE.md 文件
 *
 * @example
 * <ClaudeMemoriesDropdown
 *   projectPath="/Users/example/project"
 *   onEditFile={(file) => console.log('编辑文件:', file)}
 * />
 */
export const ClaudeMemoriesDropdown: React.FC<ClaudeMemoriesDropdownProps> = ({
  projectPath,
  onEditFile,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [files, setFiles] = useState<ClaudeMdFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Load CLAUDE.md files when dropdown opens
  useEffect(() => {
    if (isOpen && files.length === 0) {
      loadClaudeMdFiles();
    }
  }, [isOpen]);
  
  const loadClaudeMdFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      const foundFiles = await api.findClaudeMdFiles(projectPath);
      setFiles(foundFiles);
    } catch (err) {
      console.error("加载 CLAUDE.md 文件失败:", err);
      setError("加载 CLAUDE.md 文件失败");
    } finally {
      setLoading(false);
    }
  };
  
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  return (
    <div className={cn("w-full", className)}>
      <Card className="overflow-hidden">
        {/* Dropdown Header */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between p-3 hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">CLAUDE.md 记忆</span>
            {files.length > 0 && !loading && (
              <span className="text-xs text-muted-foreground">({files.length})</span>
            )}
          </div>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </motion.div>
        </button>
        
        {/* Dropdown Content */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: "auto" }}
              exit={{ height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="border-t border-border">
                {loading ? (
                  <div className="p-4 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : error ? (
                  <div className="p-3 text-xs text-destructive">{error}</div>
                ) : files.length === 0 ? (
                  <div className="p-3 text-xs text-muted-foreground text-center">
                    在此项目中未找到 CLAUDE.md 文件
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto">
                    {files.map((file, index) => (
                      <motion.div
                        key={file.absolute_path}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center justify-between p-3 hover:bg-accent/50 transition-colors border-b border-border last:border-b-0"
                      >
                        <div className="flex-1 min-w-0 mr-2">
                          <p className="text-xs font-mono truncate">{file.relative_path}</p>
                          <div className="flex items-center space-x-3 mt-1">
                            <span className="text-xs text-muted-foreground">
                              {formatFileSize(file.size)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              修改于 {formatUnixTimestamp(file.modified)}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditFile(file);
                          }}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
}; 