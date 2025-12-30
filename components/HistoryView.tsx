import React from 'react';
import { TaskHistoryItem } from '../types';
import { Clock, CheckCircle, XCircle, Loader2, AlertCircle, User, Trash2, Download, Copy } from 'lucide-react';

interface HistoryViewProps {
  history: TaskHistoryItem[];
  onSelect: (item: TaskHistoryItem) => void;
  onDelete: (id: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ history, onSelect, onDelete }) => {
  const handleDownload = async (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    try {
      // 使用fetch API获取视频内容
      const response = await fetch(url);
      const blob = await response.blob();
      // 创建Blob URL
      const blobUrl = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `sora_video.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // 释放Blob URL
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
    } catch (error) {
      console.error('下载失败:', error);
      alert('下载失败，请重试');
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onDelete(id);
  };

  const handleCopyPid = (e: React.MouseEvent, pid: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(pid);
    alert(`PID 已复制: ${pid}`);
  };

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500">
        <Clock className="w-12 h-12 mb-3 opacity-20" />
        <p>暂无历史记录。开始创作吧！</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {history.map((item) => {
        const result = item.results?.[0];
        const isSucceeded = item.status === 'succeeded';
        const hasPid = isSucceeded && result?.pid;
        const hasUrl = isSucceeded && result?.url;

        return (
          <div 
            key={item.id} 
            onClick={() => onSelect(item)}
            className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden hover:border-slate-500 transition-all cursor-pointer group relative"
          >
            <div className="aspect-video bg-slate-900 relative flex items-center justify-center overflow-hidden">
              {item.requestType.includes('character') ? (
                // Character Task Visualization
                <div className="flex flex-col items-center justify-center text-slate-600 group-hover:text-slate-500 transition-colors">
                  <User className="w-12 h-12 mb-2" />
                  <span className="text-xs font-semibold uppercase tracking-wider">角色任务</span>
                </div>
              ) : hasUrl ? (
                // Video Task Visualization
                <video 
                  src={result.url} 
                  className="w-full h-full object-contain"
                  controls
                />
              ) : item.status === 'failed' ? (
                // Failed State
                <div className="text-red-400 flex flex-col items-center p-4 text-center">
                  <XCircle className="w-8 h-8 mb-2" />
                  <span className="text-xs">生成失败</span>
                </div>
              ) : (
                // Loading State
                <div className="text-blue-400 flex flex-col items-center">
                  <Loader2 className="w-8 h-8 mb-2 animate-spin" />
                  <span className="text-xs">{item.progress}% 处理中</span>
                </div>
              )}
              
              <div className="absolute top-2 right-2 pointer-events-none">
                 {getStatusIcon(item.status)}
              </div>

              {/* Action Buttons Overlay */}
              <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-2 items-center">
                
                {hasPid && (
                   <button 
                     onClick={(e) => handleCopyPid(e, result.pid!)}
                     className="bg-slate-700/80 hover:bg-blue-600 text-white p-1.5 rounded-lg backdrop-blur-sm transition-colors"
                     title="复制 PID"
                   >
                     <Copy className="w-4 h-4" />
                   </button>
                )}

                {hasUrl && (
                  <button 
                    onClick={(e) => handleDownload(e, result.url!)}
                    className="bg-slate-700/80 hover:bg-green-600 text-white p-1.5 rounded-lg backdrop-blur-sm transition-colors"
                    title="下载视频"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                )}
                
                <button 
                  onClick={(e) => handleDelete(e, item.id)}
                  className="bg-slate-700/80 hover:bg-red-600 text-white p-1.5 rounded-lg backdrop-blur-sm transition-colors"
                  title="删除记录"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                 <span className="text-xs font-mono text-slate-500">{item.id.slice(0, 8)}...</span>
                 <span className="text-xs text-slate-400">{new Date(item.timestamp).toLocaleTimeString()}</span>
              </div>
              <p className="text-sm text-slate-200 line-clamp-2 font-medium" title={item.requestPrompt || "无提示词"}>
                {item.requestType === 'video' ? (item.requestPrompt || "Sora 视频") : item.requestType.replace('character_', '角色 ').replace('upload', '上传').replace('create', '创建')}
              </p>
              {hasPid && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-500 whitespace-nowrap">PID:</span>
                  <code className="flex-1 bg-slate-900 px-2 py-1 rounded text-xs font-mono text-blue-400 truncate border border-slate-700">
                    {result.pid}
                  </code>
                  <button 
                    onClick={(e) => handleCopyPid(e, result.pid!)}
                    className="p-1 hover:bg-slate-700 rounded transition-colors text-slate-400 hover:text-white"
                    title="复制 PID"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

function getStatusIcon(status: string) {
  switch (status) {
    case 'succeeded': return <div className="bg-green-500/20 text-green-400 p-1 rounded-full"><CheckCircle className="w-4 h-4" /></div>;
    case 'failed': return <div className="bg-red-500/20 text-red-400 p-1 rounded-full"><AlertCircle className="w-4 h-4" /></div>;
    default: return <div className="bg-blue-500/20 text-blue-400 p-1 rounded-full"><Loader2 className="w-4 h-4 animate-spin" /></div>;
  }
}