import React, { useEffect, useState } from "react";
import { api, type ClaudeInstallation } from "@/lib/api";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Terminal, Package, Check, FolderInput } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface ClaudeVersionSelectorProps {
  /**
   * Currently selected Claude installation path
   */
  selectedPath?: string | null;
  /**
   * Callback when a Claude installation is selected
   */
  onSelect: (installation: ClaudeInstallation) => void;
  /**
   * Optional className for styling
   */
  className?: string;
  /**
   * Whether to show a save button (for settings page)
   */
  showSaveButton?: boolean;
  /**
   * Callback when save button is clicked
   */
  onSave?: () => void;
  /**
   * Whether the save operation is in progress
   */
  isSaving?: boolean;
}

/**
 * ClaudeVersionSelector component for selecting Claude Code installations
 * 
 * @example
 * <ClaudeVersionSelector
 *   selectedPath={currentPath}
 *   onSelect={(installation) => setSelectedInstallation(installation)}
 * />
 */
export const ClaudeVersionSelector: React.FC<ClaudeVersionSelectorProps> = ({
  selectedPath,
  onSelect,
  className,
  showSaveButton = false,
  onSave,
  isSaving = false,
}) => {
  const [installations, setInstallations] = useState<ClaudeInstallation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInstallation, setSelectedInstallation] = useState<ClaudeInstallation | null>(null);
  const [showManualPathDialog, setShowManualPathDialog] = useState(false);
  const [manualPath, setManualPath] = useState("");
  const [manualPathError, setManualPathError] = useState<string | null>(null);

  useEffect(() => {
    loadInstallations();
  }, []);

  useEffect(() => {
    // Update selected installation when selectedPath changes
    if (selectedPath && installations.length > 0) {
      const found = installations.find(i => i.path === selectedPath);
      if (found) {
        setSelectedInstallation(found);
      }
    }
  }, [selectedPath, installations]);

  const loadInstallations = async () => {
    try {
      setLoading(true);
      setError(null);
      const foundInstallations = await api.listClaudeInstallations();
      setInstallations(foundInstallations);
      
      // If we have a selected path, find and select it
      if (selectedPath) {
        const found = foundInstallations.find(i => i.path === selectedPath);
        if (found) {
          setSelectedInstallation(found);
        }
      } else if (foundInstallations.length > 0) {
        // Auto-select the first (best) installation
        setSelectedInstallation(foundInstallations[0]);
        onSelect(foundInstallations[0]);
      }
    } catch (err) {
      console.error("Failed to load Claude installations:", err);
      setError(err instanceof Error ? err.message : "加载 Claude 安装失败");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (installation: ClaudeInstallation) => {
    setSelectedInstallation(installation);
    onSelect(installation);
  };

  const handleManualPathSubmit = () => {
    if (!manualPath.trim()) {
      setManualPathError("请输入有效的路径");
      return;
    }

    // 创建一个手动安装项
    const manualInstallation: ClaudeInstallation = {
      path: manualPath.trim(),
      source: "manual",
    };

    // 添加到安装列表
    const updatedInstallations = [manualInstallation, ...installations];
    setInstallations(updatedInstallations);
    
    // 选择这个手动安装项
    handleSelect(manualInstallation);
    
    // 关闭对话框并重置状态
    setShowManualPathDialog(false);
    setManualPath("");
    setManualPathError(null);
  };

  const getSourceIcon = (source: string) => {
    if (source.includes("nvm")) return <Package className="w-4 h-4" />;
    if (source === "manual") return <FolderInput className="w-4 h-4" />;
    return <Terminal className="w-4 h-4" />;
  };

  const getSourceLabel = (source: string) => {
    if (source === "which") return "系统路径";
    if (source === "homebrew") return "Homebrew";
    if (source === "system") return "系统";
    if (source.startsWith("nvm")) return source.replace("nvm ", "NVM ");
    if (source === "local-bin") return "本地 bin";
    if (source === "claude-local") return "Claude 本地";
    if (source === "npm-global") return "NPM 全局";
    if (source === "yarn" || source === "yarn-global") return "Yarn";
    if (source === "bun") return "Bun";
    if (source === "manual") return "手动输入";
    return source;
  };

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center py-8", className)}>
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className={cn("p-4", className)}>
        <div className="text-sm text-destructive">{error}</div>
      </Card>
    );
  }

  if (installations.length === 0) {
    return (
      <Card className={cn("p-4", className)}>
        <div className="text-sm text-muted-foreground">
          在您的系统上未找到 Claude Code 安装。
        </div>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <div className="flex justify-between items-center mb-3">
          <Label className="text-sm font-medium">
            选择 Claude Code 安装
          </Label>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowManualPathDialog(true)}
            className="gap-1"
          >
            <FolderInput className="h-4 w-4" />
            手动输入路径
          </Button>
        </div>
        <RadioGroup
          value={selectedInstallation?.path}
          onValueChange={(value: string) => {
            const installation = installations.find(i => i.path === value);
            if (installation) {
              handleSelect(installation);
            }
          }}
        >
          <div className="space-y-2">
            {installations.map((installation) => (
              <Card
                key={installation.path}
                className={cn(
                  "relative cursor-pointer transition-colors",
                  selectedInstallation?.path === installation.path
                    ? "border-primary"
                    : "hover:border-muted-foreground/50"
                )}
                onClick={() => handleSelect(installation)}
              >
                <div className="flex items-start p-4">
                  <RadioGroupItem
                    value={installation.path}
                    id={installation.path}
                    className="mt-1"
                  />
                  <div className="ml-3 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getSourceIcon(installation.source)}
                      <span className="font-medium text-sm">
                        {getSourceLabel(installation.source)}
                      </span>
                      {installation.version && (
                        <Badge variant="secondary" className="text-xs">
                          v{installation.version}
                        </Badge>
                      )}
                      {selectedPath === installation.path && (
                        <Badge variant="default" className="text-xs">
                          <Check className="w-3 h-3 mr-1" />
                          当前
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono break-all">
                      {installation.path}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </RadioGroup>
      </div>

      {showSaveButton && onSave && (
        <div className="flex justify-end">
          <Button
            onClick={onSave}
            disabled={!selectedInstallation || isSaving}
            size="sm"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                保存中...
              </>
            ) : (
              "保存选择"
            )}
          </Button>
        </div>
      )}

      {/* 手动输入路径对话框 */}
      <Dialog open={showManualPathDialog} onOpenChange={setShowManualPathDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>手动输入 Claude Code 路径</DialogTitle>
            <DialogDescription>
              请输入 Claude Code 二进制文件的完整路径
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Input
              value={manualPath}
              onChange={(e) => {
                setManualPath(e.target.value);
                setManualPathError(null);
              }}
              placeholder="/usr/local/bin/claude 或 C:\Program Files\Claude\claude.exe"
              className="font-mono text-sm"
            />
            {manualPathError && (
              <p className="text-xs text-destructive mt-1">{manualPathError}</p>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManualPathDialog(false)}>
              取消
            </Button>
            <Button onClick={handleManualPathSubmit}>
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};