import React from "react";
import { StreamMessage } from "./StreamMessage";
import type { ClaudeStreamMessage } from "./AgentExecution";

/**
 * 演示组件，展示所有不同的消息类型和工具
 */
export const AgentExecutionDemo: React.FC = () => {
  // 基于提供的JSONL会话的示例消息
  const messages: ClaudeStreamMessage[] = [
    // 跳过元消息（不应渲染）
    {
      type: "user",
      isMeta: true,
      message: { content: [] },
      timestamp: "2025-06-11T14:08:53.771Z"
    },
    
    // 摘要消息
    {
      leafUuid: "3c5ecb4f-c1f0-40c2-a357-ab7642ad28b8",
      summary: "JSONL查看器模型配置与设置",
      type: "summary" as any
    },
    
    // 助手使用编辑工具
    {
      type: "assistant",
      message: {
        content: [{
          type: "tool_use",
          name: "Edit",
          input: {
            file_path: "/Users/mufeedvh/dev/jsonl-viewer/script.js",
            new_string: "reader.onerror = () => reject(new Error('Failed to read file'));",
            old_string: "reader.onerror = e => reject(new Error('Failed to read file'));"
          }
        }],
        usage: { input_tokens: 4, output_tokens: 158 }
      }
    },
    
    // 用户的编辑工具结果
    {
      type: "user",
      message: {
        content: [{
          type: "tool_result",
          content: `文件 /Users/mufeedvh/dev/jsonl-viewer/script.js 已更新。以下是运行 \`cat -n\` 命令查看编辑后文件片段的结果：
   220       readFileAsText(file) {
   221         return new Promise((resolve, reject) => {
   222           const reader = new FileReader();
   223           reader.onload = e => resolve(e.target.result);
   224           reader.onerror = () => reject(new Error('Failed to read file'));
   225           reader.readAsText(file);
   226         });
   227       }
   228`
        }]
      }
    },
    
    // 助手使用MCP工具
    {
      type: "assistant",
      message: {
        content: [{
          type: "tool_use",
          name: "mcp__ide__getDiagnostics",
          input: {}
        }],
        usage: { input_tokens: 4, output_tokens: 37 }
      }
    },
    
    // 用户的空工具结果
    {
      type: "user",
      message: {
        content: [{
          type: "tool_result",
          content: ""
        }]
      }
    },
    
    // 助手使用写入工具（大内容）
    {
      type: "assistant",
      message: {
        content: [{
          type: "tool_use",
          name: "Write",
          input: {
            file_path: "/Users/mufeedvh/dev/jsonl-viewer/styles.css",
            content: `/* 重置和基础样式 */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    line-height: 1.6;
    color: #333;
    background: #f8fafc;
    min-height: 100vh;
}

/* 容器 */
.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
}

/* 头部 */
.header {
    text-align: center;
    margin-bottom: 40px;
}

.header h1 {
    font-size: 2.5rem;
    font-weight: 700;
    color: #1a202c;
    margin-bottom: 8px;
}

.header p {
    color: #718096;
    font-size: 1.1rem;
}

/* 输入区域 */
.input-section {
    display: grid;
    gap: 20px;
    margin-bottom: 30px;
}

/* 拖放区域 */
.drop-zone {
    border: 2px dashed #cbd5e0;
    border-radius: 12px;
    padding: 40px 20px;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s ease;
    background: white;
    position: relative;
}

.drop-zone:hover,
.drop-zone.drag-over {
    border-color: #4299e1;
    background: #ebf8ff;
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(66, 153, 225, 0.1);
}

/* ... 更多CSS行 ... */
/* 此内容超过1000个字符，因此应显示最大化按钮 */
` + '\n'.repeat(100) + '/* 非常长的CSS文件结束 */'
          }
        }]
      }
    }
  ];

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-4">
      <h1 className="text-2xl font-bold mb-6">代理执行演示</h1>
      
      {messages.map((message, idx) => (
        <StreamMessage key={idx} message={message} streamMessages={messages} />
      ))}
    </div>
  );
};