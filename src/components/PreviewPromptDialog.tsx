import React from "react";
import { motion } from "framer-motion";
import { Globe, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PreviewPromptDialogProps {
  /**
   * Whether the dialog is open
   */
  isOpen: boolean;
  /**
   * The detected URL to preview
   */
  url: string;
  /**
   * Callback when user confirms opening preview
   */
  onConfirm: () => void;
  /**
   * Callback when user cancels
   */
  onCancel: () => void;
}

/**
 * 对话框组件，提示用户在预览窗格中打开检测到的 URL
 * 
 * @example
 * <PreviewPromptDialog
 *   isOpen={showPrompt}
 *   url="http://localhost:3000"
 *   onConfirm={() => openPreview(url)}
 *   onCancel={() => setShowPrompt(false)}
 * />
 */
export const PreviewPromptDialog: React.FC<PreviewPromptDialogProps> = ({
  isOpen,
  url,
  onConfirm,
  onCancel,
}) => {
  // Extract domain for display
  const getDomain = (urlString: string) => {
    try {
      const urlObj = new URL(urlString);
      return urlObj.hostname;
    } catch {
      return urlString;
    }
  };

  const domain = getDomain(url);
  const isLocalhost = domain.includes('localhost') || domain.includes('127.0.0.1');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            打开预览？
          </DialogTitle>
          <DialogDescription>
            在终端输出中检测到一个 URL。您想在预览窗格中打开它吗？
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="flex items-start gap-3">
              <ExternalLink className={`h-4 w-4 mt-0.5 ${isLocalhost ? 'text-green-500' : 'text-blue-500'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  {isLocalhost ? '本地开发服务器' : '外部 URL'}
                </p>
                <p className="text-xs text-muted-foreground mt-1 break-all">
                  {url}
                </p>
              </div>
            </div>
          </div>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-3 text-xs text-muted-foreground"
          >
            预览将在屏幕右侧的拆分视图中打开。
          </motion.div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            取消
          </Button>
          <Button onClick={onConfirm} className="gap-2">
            <ExternalLink className="h-4 w-4" />
            打开预览
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 