import React, { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Loader2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toast, ToastContainer } from "@/components/ui/toast";
import { api, type Agent } from "@/lib/api";
import { cn } from "@/lib/utils";
import MDEditor from "@uiw/react-md-editor";
import { type AgentIconName } from "./CCAgents";
import { AgentSandboxSettings } from "./AgentSandboxSettings";
import { IconPicker, ICON_MAP } from "./IconPicker";

interface CreateAgentProps {
  /**
   * Optional agent to edit (if provided, component is in edit mode)
   */
  agent?: Agent;
  /**
   * Callback to go back to the agents list
   */
  onBack: () => void;
  /**
   * Callback when agent is created/updated
   */
  onAgentCreated: () => void;
  /**
   * Optional className for styling
   */
  className?: string;
}

/**
 * CreateAgent 组件，用于创建或编辑 CC 代理
 * 
 * @example
 * <CreateAgent onBack={() => setView('list')} onAgentCreated={handleCreated} />
 */
export const CreateAgent: React.FC<CreateAgentProps> = ({
  agent,
  onBack,
  onAgentCreated,
  className,
}) => {
  const [name, setName] = useState(agent?.name || "");
  const [selectedIcon, setSelectedIcon] = useState<AgentIconName>((agent?.icon as AgentIconName) || "bot");
  const [systemPrompt, setSystemPrompt] = useState(agent?.system_prompt || "");
  const [defaultTask, setDefaultTask] = useState(agent?.default_task || "");
  const [model, setModel] = useState(agent?.model || "sonnet");
  const [sandboxEnabled, setSandboxEnabled] = useState(agent?.sandbox_enabled ?? true);
  const [enableFileRead, setEnableFileRead] = useState(agent?.enable_file_read ?? true);
  const [enableFileWrite, setEnableFileWrite] = useState(agent?.enable_file_write ?? true);
  const [enableNetwork, setEnableNetwork] = useState(agent?.enable_network ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [showIconPicker, setShowIconPicker] = useState(false);

  const isEditMode = !!agent;

  const handleSave = async () => {
    if (!name.trim()) {
      setError("代理名称是必填项");
      return;
    }

    if (!systemPrompt.trim()) {
      setError("系统提示是必填项");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      
      if (isEditMode && agent.id) {
        await api.updateAgent(
          agent.id, 
          name, 
          selectedIcon, 
          systemPrompt, 
          defaultTask || undefined, 
          model,
          sandboxEnabled,
          enableFileRead,
          enableFileWrite,
          enableNetwork
        );
      } else {
        await api.createAgent(
          name, 
          selectedIcon, 
          systemPrompt, 
          defaultTask || undefined, 
          model,
          sandboxEnabled,
          enableFileRead,
          enableFileWrite,
          enableNetwork
        );
      }
      
      onAgentCreated();
    } catch (err) {
      console.error("Failed to save agent:", err);
      setError(isEditMode ? "更新代理失败" : "创建代理失败");
      setToast({ 
        message: isEditMode ? "更新代理失败" : "创建代理失败", 
        type: "error" 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if ((name !== (agent?.name || "") || 
         selectedIcon !== (agent?.icon || "bot") || 
         systemPrompt !== (agent?.system_prompt || "") ||
         defaultTask !== (agent?.default_task || "") ||
         model !== (agent?.model || "sonnet") ||
         sandboxEnabled !== (agent?.sandbox_enabled ?? true) ||
         enableFileRead !== (agent?.enable_file_read ?? true) ||
         enableFileWrite !== (agent?.enable_file_write ?? true) ||
         enableNetwork !== (agent?.enable_network ?? false)) && 
        !confirm("You have unsaved changes. Are you sure you want to leave?")) {
      return;
    }
    onBack();
  };

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      <div className="w-full max-w-5xl mx-auto flex flex-col h-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between p-4 border-b border-border"
        >
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h2 className="text-lg font-semibold">
                {isEditMode ? "编辑 CC 代理" : "创建 CC 代理"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {isEditMode ? "更新您的 Claude Code 代理" : "创建新的 Claude Code 代理"}
              </p>
            </div>
          </div>
          
          <Button
            onClick={handleSave}
            disabled={saving || !name.trim() || !systemPrompt.trim()}
            size="sm"
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {saving ? "正在保存..." : "保存"}
          </Button>
        </motion.div>
        
        {/* Error display */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mx-4 mt-4 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive"
          >
            {error}
          </motion.div>
        )}
        
        {/* Form */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="space-y-6"
          >
            {/* Basic Information */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-4">基本信息</h3>
              </div>
              
              {/* Name and Icon */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">代理名称</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="例如：代码助手"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>代理图标</Label>
                  <div
                    onClick={() => setShowIconPicker(true)}
                    className="h-10 px-3 py-2 bg-background border border-input rounded-md cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      {(() => {
                        const Icon = ICON_MAP[selectedIcon] || ICON_MAP.bot;
                        return (
                          <>
                            <Icon className="h-4 w-4" />
                            <span className="text-sm">{selectedIcon}</span>
                          </>
                        );
                      })()}
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </div>

              {/* Model Selection */}
              <div className="space-y-2">
                <Label>模型</Label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => setModel("sonnet")}
                    className={cn(
                      "flex-1 px-4 py-2.5 rounded-full border-2 font-medium transition-all",
                      "hover:scale-[1.02] active:scale-[0.98]",
                      model === "sonnet" 
                        ? "border-primary bg-primary text-primary-foreground shadow-lg" 
                        : "border-muted-foreground/30 hover:border-muted-foreground/50"
                    )}
                  >
                    <div className="flex items-center justify-center gap-2.5">
                      <div className={cn(
                        "w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                        model === "sonnet" ? "border-primary-foreground" : "border-current"
                      )}>
                        {model === "sonnet" && (
                          <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                        )}
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-semibold">Claude 4 Sonnet</div>
                        <div className="text-xs opacity-80">更快，对大多数任务更高效</div>
                      </div>
                    </div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setModel("opus")}
                    className={cn(
                      "flex-1 px-4 py-2.5 rounded-full border-2 font-medium transition-all",
                      "hover:scale-[1.02] active:scale-[0.98]",
                      model === "opus" 
                        ? "border-primary bg-primary text-primary-foreground shadow-lg" 
                        : "border-muted-foreground/30 hover:border-muted-foreground/50"
                    )}
                  >
                    <div className="flex items-center justify-center gap-2.5">
                      <div className={cn(
                        "w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                        model === "opus" ? "border-primary-foreground" : "border-current"
                      )}>
                        {model === "opus" && (
                          <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                        )}
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-semibold">Claude 4 Opus</div>
                        <div className="text-xs opacity-80">能力更强，更适合复杂任务</div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Default Task */}
              <div className="space-y-2">
                <Label htmlFor="default-task">默认任务 (可选)</Label>
                <Input
                  id="default-task"
                  type="text"
                  placeholder="例如：审查此代码是否存在安全问题"
                  value={defaultTask}
                  onChange={(e) => setDefaultTask(e.target.value)}
                  className="max-w-md"
                />
                <p className="text-xs text-muted-foreground">
                  这将在执行代理时用作默认任务占位符
                </p>
              </div>

              {/* Sandbox Settings */}
              <AgentSandboxSettings
                agent={{
                  id: agent?.id,
                  name,
                  icon: selectedIcon,
                  system_prompt: systemPrompt,
                  default_task: defaultTask || undefined,
                  model,
                  sandbox_enabled: sandboxEnabled,
                  enable_file_read: enableFileRead,
                  enable_file_write: enableFileWrite,
                  enable_network: enableNetwork,
                  created_at: agent?.created_at || "",
                  updated_at: agent?.updated_at || ""
                }}
                onUpdate={(updates) => {
                  if ('sandbox_enabled' in updates) setSandboxEnabled(updates.sandbox_enabled!);
                  if ('enable_file_read' in updates) setEnableFileRead(updates.enable_file_read!);
                  if ('enable_file_write' in updates) setEnableFileWrite(updates.enable_file_write!);
                  if ('enable_network' in updates) setEnableNetwork(updates.enable_network!);
                }}
              />

              {/* System Prompt Editor */}
              <div className="space-y-2">
                <Label>系统提示</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  定义您的 CC 代理的行为和能力
                </p>
                <div className="rounded-lg border border-border overflow-hidden shadow-sm" data-color-mode="dark">
                  <MDEditor
                    value={systemPrompt}
                    onChange={(val) => setSystemPrompt(val || "")}
                    preview="edit"
                    height={400}
                    visibleDragbar={false}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
      
      {/* Toast Notification */}
      <ToastContainer>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onDismiss={() => setToast(null)}
          />
        )}
      </ToastContainer>

      {/* Icon Picker Dialog */}
      <IconPicker
        value={selectedIcon}
        onSelect={(iconName) => {
          setSelectedIcon(iconName as AgentIconName);
          setShowIconPicker(false);
        }}
        isOpen={showIconPicker}
        onClose={() => setShowIconPicker(false)}
      />
    </div>
  );
}; 