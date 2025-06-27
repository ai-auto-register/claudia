import React from "react";
import { Shield, FileText, Upload, Network, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { type Agent } from "@/lib/api";
import { cn } from "@/lib/utils";

interface AgentSandboxSettingsProps {
  agent: Agent;
  onUpdate: (updates: Partial<Agent>) => void;
  className?: string;
}

/**
 * 用于管理每个代理的沙箱权限的组件
 * 提供简单的切换开关来启用/禁用沙箱以及文件/网络权限
 */
export const AgentSandboxSettings: React.FC<AgentSandboxSettingsProps> = ({ 
  agent, 
  onUpdate, 
  className 
}) => {
  const handleToggle = (field: keyof Agent, value: boolean) => {
    onUpdate({ [field]: value });
  };

  return (
    <Card className={cn("p-4 space-y-4", className)}>
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-amber-500" />
        <h4 className="font-semibold">沙箱权限</h4>
        {!agent.sandbox_enabled && (
          <Badge variant="secondary" className="text-xs">
            已禁用
          </Badge>
        )}
      </div>
      
      <div className="space-y-3">
        {/* Master sandbox toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
          <div className="space-y-1">
            <Label className="text-sm font-medium">启用沙箱</Label>
            <p className="text-xs text-muted-foreground">
              在安全的沙箱环境中运行此代理
            </p>
          </div>
          <Switch 
            checked={agent.sandbox_enabled} 
            onCheckedChange={(checked) => handleToggle('sandbox_enabled', checked)}
          />
        </div>

        {/* Permission toggles - only visible when sandbox is enabled */}
        {agent.sandbox_enabled && (
          <div className="space-y-3 pl-4 border-l-2 border-amber-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-500" />
                <div>
                  <Label className="text-sm font-medium">文件读取权限</Label>
                  <p className="text-xs text-muted-foreground">
                    允许读取文件和目录
                  </p>
                </div>
              </div>
              <Switch 
                checked={agent.enable_file_read} 
                onCheckedChange={(checked) => handleToggle('enable_file_read', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-green-500" />
                <div>
                  <Label className="text-sm font-medium">文件写入权限</Label>
                  <p className="text-xs text-muted-foreground">
                    允许创建和修改文件
                  </p>
                </div>
              </div>
              <Switch 
                checked={agent.enable_file_write} 
                onCheckedChange={(checked) => handleToggle('enable_file_write', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Network className="h-4 w-4 text-purple-500" />
                <div>
                  <Label className="text-sm font-medium">网络访问权限</Label>
                  <p className="text-xs text-muted-foreground">
                    允许出站网络连接
                  </p>
                </div>
              </div>
              <Switch 
                checked={agent.enable_network} 
                onCheckedChange={(checked) => handleToggle('enable_network', checked)}
              />
            </div>
          </div>
        )}

        {/* Warning when sandbox is disabled */}
        {!agent.sandbox_enabled && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-950/50 dark:border-amber-800 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div className="text-xs">
              <p className="font-medium">沙箱已禁用</p>
              <p>此代理将以完整的系统访问权限运行。请谨慎使用。</p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};