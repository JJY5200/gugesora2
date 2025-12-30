import React, { useState, useRef } from 'react';
import { Upload, X } from 'lucide-react';

interface FileUploaderProps {
  label?: string;
  onFileSelect: (base64: string | null) => void;
  accept?: string;
  placeholder?: string;
  maxSizeMB?: number;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ 
  label, 
  onFileSelect, 
  accept = "image/*", 
  placeholder = "点击上传或拖拽文件到此处",
  maxSizeMB = 10
}) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    processFile(file);
  };

  const processFile = (file: File | undefined) => {
    setError(null);
    if (!file) return;

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`文件大小超过 ${maxSizeMB}MB 限制。`);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setPreview(result);
      onFileSelect(result);
    };
    reader.onerror = () => {
      setError("读取文件失败。");
    };
    reader.readAsDataURL(file);
  };

  const clearFile = () => {
    setPreview(null);
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && <label className="text-sm font-medium text-slate-400">{label}</label>}
      
      {!preview ? (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-700 hover:border-blue-500 hover:bg-slate-800/50 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-all group"
        >
          <Upload className="w-8 h-8 text-slate-500 group-hover:text-blue-400 mb-2" />
          <p className="text-sm text-slate-400 group-hover:text-slate-300 text-center">{placeholder}</p>
          <p className="text-xs text-slate-600 mt-1">最大 {maxSizeMB}MB</p>
          <input 
            ref={fileInputRef}
            type="file" 
            accept={accept} 
            onChange={handleFileChange}
            className="hidden" 
          />
        </div>
      ) : (
        <div className="relative rounded-lg overflow-hidden border border-slate-700 bg-slate-900">
           {accept.startsWith('image') ? (
             <img src={preview} alt="Preview" className="w-full h-48 object-cover" />
           ) : (
             <video src={preview} className="w-full h-48 object-cover bg-black" controls />
           )}
           <button 
            onClick={clearFile}
            className="absolute top-2 right-2 bg-black/70 hover:bg-red-600 text-white p-1.5 rounded-full transition-colors"
           >
             <X className="w-4 h-4" />
           </button>
        </div>
      )}
      
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
};