import React, { useState, useEffect, useRef } from 'react';
import { Settings, Video, User, History, Wand2, Download } from 'lucide-react';
import { SoraService } from './services/api';
import { TaskHistoryItem, TaskResult, CharacterInput } from './types';
import { DEFAULT_API_HOST, ASPECT_RATIOS, DURATIONS, SIZES } from './constants';

import { Input, Textarea, Select } from './components/ui/Input';
import { Button } from './components/ui/Button';
import { FileUploader } from './components/ui/FileUploader';
import { HistoryView } from './components/HistoryView';
import { ResultModal } from './components/ResultModal';

const App: React.FC = () => {
  // Config State
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('sora_api_key') || '');
  const [apiHost, setApiHost] = useState(() => localStorage.getItem('sora_api_host') || DEFAULT_API_HOST);

  // Generator State
  const [prompt, setPrompt] = useState('');
  const [refImage, setRefImage] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [duration, setDuration] = useState<number>(10);
  const [remixId, setRemixId] = useState('');
  const [size, setSize] = useState("small");
  
  // Character Video Ref
  const [charVideoUrl, setCharVideoUrl] = useState<string | null>(null);
  const [charTimestamp, setCharTimestamp] = useState("0,3");

  // Character Lab State
  const [charLabMode, setCharLabMode] = useState<'upload' | 'pid'>('upload');
  const [charUploadUrl, setCharUploadUrl] = useState<string | null>(null);
  const [charPid, setCharPid] = useState('');
  const [charLabTimestamps, setCharLabTimestamps] = useState("0,3");

  // App Logic State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [history, setHistory] = useState<TaskHistoryItem[]>(() => {
    const saved = localStorage.getItem('sora_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedTask, setSelectedTask] = useState<TaskHistoryItem | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Poller Ref
  const pollIntervals = useRef<{[key: string]: ReturnType<typeof setInterval>}>({});

  useEffect(() => {
    localStorage.setItem('sora_api_key', apiKey);
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem('sora_api_host', apiHost);
  }, [apiHost]);

  useEffect(() => {
    localStorage.setItem('sora_history', JSON.stringify(history));
  }, [history]);

  // Clean up pollers on unmount
  useEffect(() => {
    return () => {
      Object.values(pollIntervals.current).forEach(clearInterval);
    };
  }, []);

  // Restore polling for running tasks on load
  useEffect(() => {
    history.forEach(task => {
      if (task.status === 'running') {
        startPolling(task.id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getService = () => {
    if (!apiKey) throw new Error("请在设置中输入您的 API Key。");
    return new SoraService(apiKey, apiHost);
  };

  const startPolling = (id: string) => {
    if (pollIntervals.current[id]) return; // Already polling

    const poll = async () => {
      try {
        const service = getService();
        const result = await service.getResult(id);
        
        updateTaskHistory(id, result);

        if (result.status === 'succeeded' || result.status === 'failed') {
          clearInterval(pollIntervals.current[id]);
          delete pollIntervals.current[id];
        }
      } catch (err) {
        console.error(`Polling error for ${id}:`, err);
        // Don't stop polling on transient network errors immediately, 
        // but typically we might want a max retry count.
      }
    };

    pollIntervals.current[id] = setInterval(poll, 3000); // Poll every 3s
  };

  const updateTaskHistory = (id: string, updates: Partial<TaskResult>) => {
    setHistory(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, ...updates };
        // Update selected task view if it's currently open
        if (selectedTask && selectedTask.id === id) {
            setSelectedTask(updated);
        }
        return updated;
      }
      return item;
    }));
  };

  const deleteTask = (id: string) => {
    if (confirm("确定要删除这条记录吗？")) {
      setHistory(prev => prev.filter(item => item.id !== id));
      if (pollIntervals.current[id]) {
        clearInterval(pollIntervals.current[id]);
        delete pollIntervals.current[id];
      }
      if (selectedTask?.id === id) {
        setSelectedTask(null);
      }
    }
  };

  const downloadAllVideos = async () => {
    const successTasks = history.filter(h => h.status === 'succeeded' && h.results?.[0]?.url);
    if (successTasks.length === 0) {
      alert("没有可下载的视频。");
      return;
    }

    if (!confirm(`准备下载 ${successTasks.length} 个视频。这可能会打开多个下载窗口，请允许浏览器下载多个文件。`)) {
      return;
    }

    successTasks.forEach((task, index) => {
      setTimeout(async () => {
        try {
          const url = task.results[0].url!;
          const response = await fetch(url);
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = `sora_video_${task.id}.mp4`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          
          setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
        } catch (error) {
          console.error(`下载视频 ${task.id} 失败:`, error);
          alert(`下载视频 ${task.id} 失败，请重试`);
        }
      }, index * 500); // Stagger downloads slightly
    });
  };

  const handleGenerate = async () => {
    if (!prompt) return alert("提示词不能为空");
    setIsSubmitting(true);
    try {
      const service = getService();
      
      const characters: CharacterInput[] = [];
      if (charVideoUrl) {
        characters.push({ url: charVideoUrl, timestamps: charTimestamp });
      }

      const id = await service.generateVideo({
        model: "sora-2",
        prompt,
        url: refImage || undefined,
        aspectRatio: aspectRatio as any,
        duration: duration as any,
        size: size as any,
        remixTargetId: remixId || undefined,
        characters: characters.length > 0 ? characters : undefined,
      });

      const newTask: TaskHistoryItem = {
        id,
        status: 'running',
        progress: 0,
        results: [],
        timestamp: Date.now(),
        requestPrompt: prompt,
        requestType: 'video'
      };

      setHistory([newTask, ...history]);
      startPolling(id);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCharacterAction = async () => {
    setIsSubmitting(true);
    try {
      const service = getService();
      let id = '';
      
      if (charLabMode === 'upload') {
        if (!charUploadUrl) throw new Error("需要视频文件或链接");
        id = await service.uploadCharacter({
          url: charUploadUrl,
          timestamps: charLabTimestamps
        });
      } else {
        if (!charPid) throw new Error("需要 PID");
        id = await service.createCharacter({
          pid: charPid,
          timestamps: charLabTimestamps
        });
      }

      const newTask: TaskHistoryItem = {
        id,
        status: 'running',
        progress: 0,
        results: [],
        timestamp: Date.now(),
        requestPrompt: charLabMode === 'upload' ? '从上传创建角色' : `从 PID 创建角色: ${charPid}`,
        requestType: charLabMode === 'upload' ? 'character_upload' : 'character_create'
      };

      setHistory([newTask, ...history]);
      startPolling(id);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const retryTask = () => {
    if (!selectedTask) return;
    // Populate form with task details if it was a video generation
    if (selectedTask.requestType === 'video' && selectedTask.requestPrompt) {
        setPrompt(selectedTask.requestPrompt);
        // We can't easily restore file inputs or other complex state without storing it all,
        // but prompt is the most important.
        setSelectedTask(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 border-r border-slate-800 flex flex-col z-20">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Wand2 className="text-white w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            Sora2 Studio
          </h1>
        </div>

        <div className="mt-auto p-4 border-t border-slate-800">
          <button 
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 text-slate-400 transition-colors"
          >
            <Settings className="w-5 h-5" />
            <span className="font-medium">设置</span>
          </button>
          
          {isSettingsOpen && (
            <div className="mt-4 space-y-4 bg-slate-900 p-4 rounded-xl border border-slate-700 shadow-xl absolute bottom-20 left-4 w-72 z-50">
               <h3 className="font-medium text-white mb-2">API 配置</h3>
               <Input 
                 label="API Key" 
                 type="password" 
                 value={apiKey} 
                 onChange={e => setApiKey(e.target.value)} 
                 placeholder="输入您的 API Key"
               />
               <Input 
                 label="API Host" 
                 value={apiHost} 
                 onChange={e => setApiHost(e.target.value)} 
                 placeholder="https://..."
               />
               <p className="text-xs text-slate-500">
                 默认: {DEFAULT_API_HOST}
               </p>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative scroll-smooth">
        <header className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 p-4 flex justify-between items-center md:hidden">
             <div className="flex items-center gap-2">
                <Wand2 className="text-blue-500 w-5 h-5" />
                <span className="font-bold">Sora2 Studio</span>
             </div>
        </header>

        <div className="max-w-5xl mx-auto p-4 md:p-6 pb-16 space-y-8">
          
          {!apiKey && (
            <div className="bg-orange-500/10 border border-orange-500/30 text-orange-200 p-3 rounded-xl mb-6 flex items-center gap-3">
              <Settings className="w-5 h-5" />
              <span>请在设置菜单中配置您的 <strong>API Key</strong> 以开始生成。</span>
            </div>
          )}

          {/* 视频生成区域 */}
          <section className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                <Video className="w-6 h-6 text-blue-400" />
                创建视频
              </h2>
              <p className="text-slate-400 text-sm">使用 Sora 2 将文本和图像转化为惊艳的视频。</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Main Inputs */}
              <div className="lg:col-span-2 space-y-5">
                <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-5">
                  <Textarea 
                    label="提示词" 
                    value={prompt} 
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="详细描述您想要生成的视频..."
                    className="min-h-[120px] text-base"
                    autoFocus
                  />
                  
                  <FileUploader 
                    label="参考图 (可选)" 
                    onFileSelect={setRefImage}
                    maxSizeMB={5}
                  />
                </div>

                {/* Character Injection */}
                <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-3">
                   <h3 className="text-md font-medium text-slate-200 flex items-center gap-2">
                     <User className="w-5 h-5 text-blue-400" />
                     角色参考 (可选)
                   </h3>
                   <p className="text-xs text-slate-500">上传角色视频以在提示词中引用。在提示词中使用 <code>@character1</code> 来放置角色。</p>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                     <FileUploader 
                       accept="video/*"
                       onFileSelect={setCharVideoUrl}
                       placeholder="上传角色视频"
                       maxSizeMB={50}
                     />
                     <Input 
                      label="时间戳 (开始, 结束)"
                      value={charTimestamp}
                      onChange={(e) => setCharTimestamp(e.target.value)}
                      placeholder="0,3"
                     />
                   </div>
                </div>
              </div>

              {/* Right Column: Settings */}
              <div className="space-y-5">
                 <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-4">
                    <h3 className="font-semibold text-slate-200 text-sm">配置</h3>
                    
                    <Select 
                      label="宽高比" 
                      options={ASPECT_RATIOS}
                      value={aspectRatio}
                      onChange={(e) => setAspectRatio(e.target.value)}
                    />

                    <Select 
                      label="时长" 
                      options={DURATIONS}
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                    />
                    
                    <Select 
                      label="质量 / 尺寸" 
                      options={SIZES}
                      value={size}
                      onChange={(e) => setSize(e.target.value)}
                    />
                 </div>

                 <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-4">
                    <h3 className="font-semibold text-slate-200 text-sm">高级</h3>
                    <Input 
                      label="混音/续作目标 ID (PID)"
                      placeholder="s_xxxxxxxx"
                      value={remixId}
                      onChange={(e) => setRemixId(e.target.value)}
                    />
                 </div>

                 <Button 
                  className="w-full py-3 text-base shadow-lg shadow-blue-900/20" 
                  onClick={handleGenerate}
                  isLoading={isSubmitting}
                  disabled={!apiKey}
                 >
                   生成视频
                 </Button>
              </div>
            </div>
          </section>

          {/* 角色实验室区域 */}
          <section className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                <User className="w-6 h-6 text-purple-400" />
                角色实验室
              </h2>
              <p className="text-slate-400 text-sm">从视频或以前的生成中创建持久的角色身份。</p>
            </div>

            <div className="max-w-2xl bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
               <div className="flex gap-4 border-b border-slate-800 pb-3">
                  <button 
                    onClick={() => setCharLabMode('upload')}
                    className={`pb-2 px-2 text-sm font-medium transition-colors relative ${charLabMode === 'upload' ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    从上传
                    {charLabMode === 'upload' && <span className="absolute bottom-[-17px] left-0 w-full h-0.5 bg-blue-500"></span>}
                  </button>
                  <button 
                    onClick={() => setCharLabMode('pid')}
                    className={`pb-2 px-2 text-sm font-medium transition-colors relative ${charLabMode === 'pid' ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    从现有生成 (PID)
                    {charLabMode === 'pid' && <span className="absolute bottom-[-17px] left-0 w-full h-0.5 bg-blue-500"></span>}
                  </button>
               </div>

               <div className="space-y-5">
                  {charLabMode === 'upload' ? (
                     <FileUploader 
                       label="源视频"
                       accept="video/*"
                       onFileSelect={setCharUploadUrl}
                       maxSizeMB={50}
                     />
                  ) : (
                    <Input 
                      label="源 PID"
                      placeholder="s_xxxxxxxxxxxxxxx"
                      value={charPid}
                      onChange={(e) => setCharPid(e.target.value)}
                    />
                  )}

                  <Input 
                    label="截取时间戳 (最多 3 秒)"
                    placeholder="e.g. 0,3"
                    value={charLabTimestamps}
                    onChange={(e) => setCharLabTimestamps(e.target.value)}
                  />

                  <Button 
                    className="w-full py-3"
                    onClick={handleCharacterAction}
                    isLoading={isSubmitting}
                    disabled={!apiKey}
                  >
                    创建角色 ID
                  </Button>
               </div>
            </div>
          </section>

          {/* 历史记录区域 */}
          <section className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                  <History className="w-6 h-6 text-green-400" />
                  生成历史
                </h2>
                <p className="text-slate-400 text-sm">查看和下载您过去的作品。</p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={downloadAllVideos} disabled={history.length === 0} title="批量下载所有生成的视频" className="py-2 px-3 text-sm">
                   <Download className="w-3 h-3 mr-1" />
                   一键下载
                </Button>
                <Button variant="danger" onClick={() => { if(confirm("确定清空所有历史记录？")) setHistory([]) }} disabled={history.length === 0} className="py-2 px-3 text-sm">
                   清空历史
                </Button>
              </div>
            </div>
            
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
              <HistoryView 
                history={history} 
                onSelect={() => {}} 
                onDelete={deleteTask}
              />
            </div>
          </section>
        </div>
      </main>

      {/* Result Modal */}
      {selectedTask && (
        <ResultModal 
          item={selectedTask} 
          onClose={() => setSelectedTask(null)}
          onRetry={retryTask}
        />
      )}

    </div>
  );
};

export default App;