import React from 'react';
import { TaskHistoryItem } from '../types';
import { X, Download, Copy, RefreshCw, UserCheck } from 'lucide-react';
import { Button } from './ui/Button';

interface ResultModalProps {
  item: TaskHistoryItem | null;
  onClose: () => void;
  onRetry: () => void;
}

export const ResultModal: React.FC<ResultModalProps> = ({ item, onClose, onRetry }) => {
  if (!item) return null;

  const result = item.results && item.results.length > 0 ? item.results[0] : null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-white">任务详情</h3>
            <span className="text-xs font-mono text-slate-500">{item.id}</span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: Media */}
            <div className="space-y-4">
              {item.status === 'succeeded' ? (
                result?.url ? (
                  <div className="rounded-xl overflow-hidden bg-black border border-slate-800 shadow-lg">
                    <video src={result.url} controls autoPlay loop className="w-full h-auto" />
                  </div>
                ) : result?.character_id ? (
                  <div className="aspect-video bg-blue-900/10 border border-blue-900/30 rounded-xl flex items-center justify-center text-blue-400 flex-col p-6">
                    <UserCheck className="w-16 h-16 mb-4" />
                    <p className="font-semibold mb-2">角色已创建</p>
                    <p className="text-sm text-center text-blue-300/70">使用右侧的 ID 来引用此角色。</p>
                  </div>
                ) : (
                   <div className="aspect-video bg-slate-800 rounded-xl flex items-center justify-center text-slate-500">
                     <p>无预览可用</p>
                   </div>
                )
              ) : item.status === 'failed' ? (
                 <div className="aspect-video bg-red-900/10 border border-red-900/30 rounded-xl flex items-center justify-center text-red-400 flex-col p-6">
                    <p className="font-semibold mb-2">生成失败</p>
                    <p className="text-sm text-center">{item.failure_reason || item.error || "发生未知错误"}</p>
                 </div>
              ) : (
                <div className="aspect-video bg-slate-800 rounded-xl flex items-center justify-center flex-col text-blue-400 animate-pulse">
                   <RefreshCw className="w-8 h-8 mb-4 animate-spin" />
                   <p>处理中: {item.progress}%</p>
                </div>
              )}

              {result?.url && (
                <div className="flex gap-2">
                  <a href={result.url} download target="_blank" rel="noreferrer" className="flex-1">
                    <Button variant="secondary" className="w-full">
                      <Download className="w-4 h-4" /> 下载视频
                    </Button>
                  </a>
                </div>
              )}
            </div>

            {/* Right: Info */}
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">提示词 / 描述</h4>
                <div className="bg-slate-800 p-4 rounded-lg text-slate-200 text-sm leading-relaxed border border-slate-700">
                  {item.requestPrompt || "无"}
                </div>
              </div>

              {result?.pid && (
                <div>
                   <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">PID (用于混音/续作)</h4>
                   <div className="flex gap-2">
                     <code className="bg-slate-950 px-3 py-2 rounded text-slate-400 font-mono text-sm flex-1 truncate border border-slate-800">
                       {result.pid}
                     </code>
                     <Button variant="ghost" onClick={() => copyToClipboard(result.pid!)} title="复制 PID">
                       <Copy className="w-4 h-4" />
                     </Button>
                   </div>
                </div>
              )}
              
               {result?.character_id && (
                <div>
                   <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">角色 ID</h4>
                   <div className="flex gap-2">
                     <code className="bg-slate-950 px-3 py-2 rounded text-green-400 font-mono text-sm flex-1 truncate border border-slate-800">
                       {result.character_id}
                     </code>
                     <Button variant="ghost" onClick={() => copyToClipboard(result.character_id!)} title="复制 ID">
                       <Copy className="w-4 h-4" />
                     </Button>
                   </div>
                   <p className="text-xs text-slate-500 mt-2">在提示词中使用 <code>@character1</code> 来引用此角色。</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-800">
                  <span className="text-xs text-slate-500 block mb-1">状态</span>
                  <span className={`text-sm font-medium capitalize ${
                    item.status === 'succeeded' ? 'text-green-400' : 
                    item.status === 'failed' ? 'text-red-400' : 'text-blue-400'
                  }`}>
                    {item.status === 'succeeded' ? '成功' : item.status === 'failed' ? '失败' : '运行中'}
                  </span>
                </div>
                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-800">
                  <span className="text-xs text-slate-500 block mb-1">类型</span>
                  <span className="text-sm font-medium text-slate-200 capitalize">
                    {item.requestType.replace('character_upload', '上传创建角色').replace('character_create', 'PID 创建角色').replace('video', '视频生成')}
                  </span>
                </div>
              </div>
              
               {item.status !== 'running' && item.requestType === 'video' && (
                 <div className="pt-6 border-t border-slate-800">
                    <p className="text-slate-500 text-xs mb-3">对结果不满意？</p>
                    <Button variant="primary" onClick={onRetry} className="w-full">
                       <RefreshCw className="w-4 h-4" /> 重试 / 基于此重绘
                    </Button>
                 </div>
               )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};