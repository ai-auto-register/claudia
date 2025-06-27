import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Maximize2, 
  Minimize2, 
  Copy, 
  RefreshCw, 
  RotateCcw, 
  ChevronDown,
  Bot,
  Clock,
  Hash,
  DollarSign,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Toast, ToastContainer } from '@/components/ui/toast';
import { Popover } from '@/components/ui/popover';
import { api, type AgentRunWithMetrics } from '@/lib/api';
import { useOutputCache } from '@/lib/outputCache';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { StreamMessage } from './StreamMessage';
import { ErrorBoundary } from './ErrorBoundary';
import { formatISOTimestamp } from '@/lib/date-utils';
import { AGENT_ICONS } from './CCAgents';
import type { ClaudeStreamMessage } from './AgentExecution';

interface AgentRunOutputViewerProps {
  /**
   * 要显示的代理运行
   */
  run: AgentRunWithMetrics;
  /**
   * 查看器关闭时的回调
   */
  onClose: () => void;
  /**
   * 打开完整视图的可选回调
   */
  onOpenFullView?: () => void;
  /**
   * 可选的样式类名
   */
  className?: string;
}

/**
 * AgentRunOutputViewer - 用于查看代理执行输出的模态组件
 *
 * @example
 * <AgentRunOutputViewer
 *   run={agentRun}
 *   onClose={() => setSelectedRun(null)}
 * />
 */
export function AgentRunOutputViewer({ 
  run, 
  onClose, 
  onOpenFullView,
  className 
}: AgentRunOutputViewerProps) {
  const [messages, setMessages] = useState<ClaudeStreamMessage[]>([]);
  const [rawJsonlOutput, setRawJsonlOutput] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [copyPopoverOpen, setCopyPopoverOpen] = useState(false);
  const [hasUserScrolled, setHasUserScrolled] = useState(false);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const outputEndRef = useRef<HTMLDivElement>(null);
  const fullscreenScrollRef = useRef<HTMLDivElement>(null);
  const fullscreenMessagesEndRef = useRef<HTMLDivElement>(null);
  const unlistenRefs = useRef<UnlistenFn[]>([]);
  const { getCachedOutput, setCachedOutput } = useOutputCache();

  // 自动滚动逻辑
  const isAtBottom = () => {
    const container = isFullscreen ? fullscreenScrollRef.current : scrollAreaRef.current;
    if (container) {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      return distanceFromBottom < 1;
    }
    return true;
  };

  const scrollToBottom = () => {
    if (!hasUserScrolled) {
      const endRef = isFullscreen ? fullscreenMessagesEndRef.current : outputEndRef.current;
      if (endRef) {
        endRef.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  // 在组件卸载时清理监听器
  useEffect(() => {
    return () => {
      unlistenRefs.current.forEach(unlisten => unlisten());
    };
  }, []);

  // 当消息变化时自动滚动
  useEffect(() => {
    const shouldAutoScroll = !hasUserScrolled || isAtBottom();
    if (shouldAutoScroll) {
      scrollToBottom();
    }
  }, [messages, hasUserScrolled, isFullscreen]);

  const loadOutput = async (skipCache = false) => {
    if (!run.id) return;

    try {
      // 如果不跳过缓存，先检查缓存
      if (!skipCache) {
        const cached = getCachedOutput(run.id);
        if (cached) {
          const cachedJsonlLines = cached.output.split('\n').filter(line => line.trim());
          setRawJsonlOutput(cachedJsonlLines);
          setMessages(cached.messages);
          // 如果缓存较新（不到5秒）且会话未运行，仅使用缓存
          if (Date.now() - cached.lastUpdated < 5000 && run.status !== 'running') {
            return;
          }
        }
      }

      setLoading(true);
      const rawOutput = await api.getSessionOutput(run.id);
      
      // 将JSONL输出解析为消息
      const jsonlLines = rawOutput.split('\n').filter(line => line.trim());
      setRawJsonlOutput(jsonlLines);
      
      const parsedMessages: ClaudeStreamMessage[] = [];
      for (const line of jsonlLines) {
        try {
          const message = JSON.parse(line) as ClaudeStreamMessage;
          parsedMessages.push(message);
        } catch (err) {
          console.error("解析消息失败:", err, line);
        }
      }
      setMessages(parsedMessages);
      
      // 更新缓存
      setCachedOutput(run.id, {
        output: rawOutput,
        messages: parsedMessages,
        lastUpdated: Date.now(),
        status: run.status
      });
      
      // 为正在运行的会话设置实时事件监听器
      if (run.status === 'running') {
        setupLiveEventListeners();
        
        try {
          await api.streamSessionOutput(run.id);
        } catch (streamError) {
          console.warn('启动流式传输失败，将改用轮询:', streamError);
        }
      }
    } catch (error) {
      console.error('加载代理输出失败:', error);
      setToast({ message: '加载代理输出失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const setupLiveEventListeners = async () => {
    if (!run.id) return;
    
    try {
      // 清理现有监听器
      unlistenRefs.current.forEach(unlisten => unlisten());
      unlistenRefs.current = [];

      // 设置带有运行ID隔离的实时事件监听器
      const outputUnlisten = await listen<string>(`agent-output:${run.id}`, (event) => {
        try {
          // 存储原始JSONL
          setRawJsonlOutput(prev => [...prev, event.payload]);
          
          // 解析并显示
          const message = JSON.parse(event.payload) as ClaudeStreamMessage;
          setMessages(prev => [...prev, message]);
        } catch (err) {
          console.error("解析消息失败:", err, event.payload);
        }
      });

      const errorUnlisten = await listen<string>(`agent-error:${run.id}`, (event) => {
        console.error("代理错误:", event.payload);
        setToast({ message: event.payload, type: 'error' });
      });

      const completeUnlisten = await listen<boolean>(`agent-complete:${run.id}`, () => {
        setToast({ message: '代理执行已完成', type: 'success' });
      });

      const cancelUnlisten = await listen<boolean>(`agent-cancelled:${run.id}`, () => {
        setToast({ message: '代理执行已取消', type: 'error' });
      });

      unlistenRefs.current = [outputUnlisten, errorUnlisten, completeUnlisten, cancelUnlisten];
    } catch (error) {
      console.error('设置实时事件监听器失败:', error);
    }
  };

  // 复制功能
  const handleCopyAsJsonl = async () => {
    const jsonl = rawJsonlOutput.join('\n');
    await navigator.clipboard.writeText(jsonl);
    setCopyPopoverOpen(false);
    setToast({ message: '输出已复制为JSONL格式', type: 'success' });
  };

  const handleCopyAsMarkdown = async () => {
    let markdown = `# 代理执行: ${run.agent_name}\n\n`;
    markdown += `**任务:** ${run.task}\n`;
    markdown += `**模型:** ${run.model === 'opus' ? 'Claude 4 Opus' : 'Claude 4 Sonnet'}\n`;
    markdown += `**日期:** ${formatISOTimestamp(run.created_at)}\n`;
    if (run.metrics?.duration_ms) markdown += `**持续时间:** ${(run.metrics.duration_ms / 1000).toFixed(2)}秒\n`;
    if (run.metrics?.total_tokens) markdown += `**总令牌数:** ${run.metrics.total_tokens}\n`;
    if (run.metrics?.cost_usd) markdown += `**成本:** $${run.metrics.cost_usd.toFixed(4)} 美元\n`;
    markdown += `\n---\n\n`;

    for (const msg of messages) {
      if (msg.type === "system" && msg.subtype === "init") {
        markdown += `## 系统初始化\n\n`;
        markdown += `- 会话ID: \`${msg.session_id || '无'}\`\n`;
        markdown += `- 模型: \`${msg.model || '默认'}\`\n`;
        if (msg.cwd) markdown += `- 工作目录: \`${msg.cwd}\`\n`;
        if (msg.tools?.length) markdown += `- 工具: ${msg.tools.join(', ')}\n`;
        markdown += `\n`;
      } else if (msg.type === "assistant" && msg.message) {
        markdown += `## 助手\n\n`;
        for (const content of msg.message.content || []) {
          if (content.type === "text") {
            markdown += `${content.text}\n\n`;
          } else if (content.type === "tool_use") {
            markdown += `### 工具: ${content.name}\n\n`;
            markdown += `\`\`\`json\n${JSON.stringify(content.input, null, 2)}\n\`\`\`\n\n`;
          }
        }
        if (msg.message.usage) {
          markdown += `*令牌数: ${msg.message.usage.input_tokens} 输入, ${msg.message.usage.output_tokens} 输出*\n\n`;
        }
      } else if (msg.type === "user" && msg.message) {
        markdown += `## 用户\n\n`;
        for (const content of msg.message.content || []) {
          if (content.type === "text") {
            markdown += `${content.text}\n\n`;
          } else if (content.type === "tool_result") {
            markdown += `### 工具结果\n\n`;
            markdown += `\`\`\`\n${content.content}\n\`\`\`\n\n`;
          }
        }
      } else if (msg.type === "result") {
        markdown += `## 执行结果\n\n`;
        if (msg.result) {
          markdown += `${msg.result}\n\n`;
        }
        if (msg.error) {
          markdown += `**错误:** ${msg.error}\n\n`;
        }
      }
    }

    await navigator.clipboard.writeText(markdown);
    setCopyPopoverOpen(false);
    setToast({ message: '输出已复制为Markdown格式', type: 'success' });
  };

  const refreshOutput = async () => {
    setRefreshing(true);
    await loadOutput(true); // 跳过缓存
    setRefreshing(false);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = target;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    setHasUserScrolled(distanceFromBottom > 50);
  };

  // Load output on mount
  useEffect(() => {
    if (!run.id) return;
    
    // Check cache immediately for instant display
    const cached = getCachedOutput(run.id);
    if (cached) {
      const cachedJsonlLines = cached.output.split('\n').filter(line => line.trim());
      setRawJsonlOutput(cachedJsonlLines);
      setMessages(cached.messages);
    }
    
    // Then load fresh data
    loadOutput();
  }, [run.id]);

  const displayableMessages = useMemo(() => {
    return messages.filter((message) => {
      if (message.isMeta && !message.leafUuid && !message.summary) return false;

      if (message.type === "user" && message.message) {
        if (message.isMeta) return false;

        const msg = message.message;
        if (!msg.content || (Array.isArray(msg.content) && msg.content.length === 0)) return false;

        if (Array.isArray(msg.content)) {
          let hasVisibleContent = false;
          for (const content of msg.content) {
            if (content.type === "text") { hasVisibleContent = true; break; }
            if (content.type === "tool_result") {
              // 检查此工具结果是否将显示为小部件
              let willBeSkipped = false;
              if (content.tool_use_id) {
                // Find the corresponding tool use
                for (let i = messages.indexOf(message) - 1; i >= 0; i--) {
                  const prevMsg = messages[i];
                  if (prevMsg.type === 'assistant' && prevMsg.message?.content && Array.isArray(prevMsg.message.content)) {
                    const toolUse = prevMsg.message.content.find((c: any) => c.type === 'tool_use' && c.id === content.tool_use_id);
                    if (toolUse) {
                      const toolName = toolUse.name?.toLowerCase();
                      const toolsWithWidgets = ['task','edit','multiedit','todowrite','ls','read','glob','bash','write','grep'];
                      if (toolsWithWidgets.includes(toolName) || toolUse.name?.startsWith('mcp__')) {
                        willBeSkipped = true;
                      }
                      break;
                    }
                  }
                }
              }
              if (!willBeSkipped) { hasVisibleContent = true; break; }
            }
          }
          if (!hasVisibleContent) return false;
        }
      }
      return true;
    });
  }, [messages]);

  const renderIcon = (iconName: string) => {
    const Icon = AGENT_ICONS[iconName as keyof typeof AGENT_ICONS] || Bot;
    return <Icon className="h-5 w-5" />;
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return "无";
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}秒`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}分 ${remainingSeconds}秒`;
  };

  const formatTokens = (tokens?: number) => {
    if (!tokens) return "0";
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}k`;
    }
    return tokens.toString();
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className={`fixed inset-x-4 top-[10%] bottom-[10%] z-50 max-w-4xl mx-auto ${className}`}
      >
        <Card className="h-full flex flex-col shadow-xl">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="mt-0.5">
                  {renderIcon(run.agent_icon)}
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {run.agent_name}
                    {run.status === 'running' && (
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-green-600 font-medium">运行中</span>
                      </div>
                    )}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1 truncate">
                    {run.task}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                    <Badge variant="outline" className="text-xs">
                      {run.model === 'opus' ? 'Claude 4 Opus' : 'Claude 4 Sonnet'}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatISOTimestamp(run.created_at)}</span>
                    </div>
                    {run.metrics?.duration_ms && (
                      <span>{formatDuration(run.metrics.duration_ms)}</span>
                    )}
                    {run.metrics?.total_tokens && (
                      <div className="flex items-center gap-1">
                        <Hash className="h-3 w-3" />
                        <span>{formatTokens(run.metrics.total_tokens)}</span>
                      </div>
                    )}
                    {run.metrics?.cost_usd && (
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        <span>${run.metrics.cost_usd.toFixed(4)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Popover
                  trigger={
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      复制
                      <ChevronDown className="h-3 w-3 ml-1" />
                    </Button>
                  }
                  content={
                    <div className="w-44 p-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={handleCopyAsJsonl}
                      >
                        复制为JSONL
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={handleCopyAsMarkdown}
                      >
                        复制为Markdown
                      </Button>
                    </div>
                  }
                  open={copyPopoverOpen}
                  onOpenChange={setCopyPopoverOpen}
                  align="end"
                />
                {onOpenFullView && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onOpenFullView}
                    title="在完整视图中打开"
                    className="h-8 px-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  title={isFullscreen ? "退出全屏" : "进入全屏"}
                  className="h-8 px-2"
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={refreshOutput}
                  disabled={refreshing}
                  title="刷新输出"
                  className="h-8 px-2"
                >
                  <RotateCcw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onClose}
                  className="h-8 px-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className={`${isFullscreen ? 'h-[calc(100vh-120px)]' : 'flex-1'} p-0 overflow-hidden`}>
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex items-center space-x-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>正在加载输出...</span>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>暂无可用输出</p>
              </div>
            ) : (
              <div 
                ref={scrollAreaRef}
                className="h-full overflow-y-auto p-4 space-y-2"
                onScroll={handleScroll}
              >
                <AnimatePresence>
                  {displayableMessages.map((message: ClaudeStreamMessage, index: number) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ErrorBoundary>
                        <StreamMessage message={message} streamMessages={messages} />
                      </ErrorBoundary>
                    </motion.div>
                  ))}
                </AnimatePresence>
                <div ref={outputEndRef} />
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 bg-background z-[60] flex flex-col">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-3">
              {renderIcon(run.agent_icon)}
              <div>
                <h3 className="font-semibold text-lg">{run.agent_name}</h3>
                <p className="text-sm text-muted-foreground">{run.task}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Popover
                trigger={
                  <Button
                    variant="outline"
                    size="sm"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    复制输出
                    <ChevronDown className="h-3 w-3 ml-2" />
                  </Button>
                }
                content={
                  <div className="w-44 p-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={handleCopyAsJsonl}
                    >
                      复制为JSONL
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={handleCopyAsMarkdown}
                    >
                      复制为Markdown
                    </Button>
                  </div>
                }
                align="end"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={refreshOutput}
                disabled={refreshing}
              >
                <RotateCcw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFullscreen(false)}
              >
                <Minimize2 className="h-4 w-4 mr-2" />
                退出全屏
              </Button>
            </div>
          </div>
          <div 
            ref={fullscreenScrollRef}
            className="flex-1 overflow-y-auto p-6"
            onScroll={handleScroll}
          >
            <div className="max-w-4xl mx-auto space-y-2">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  暂无可用输出
                </div>
              ) : (
                <>
                  <AnimatePresence>
                    {displayableMessages.map((message: ClaudeStreamMessage, index: number) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ErrorBoundary>
                          <StreamMessage message={message} streamMessages={messages} />
                        </ErrorBoundary>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  <div ref={fullscreenMessagesEndRef} />
                </>
              )}
            </div>
          </div>
        </div>
      )}

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
    </>
  );
} 