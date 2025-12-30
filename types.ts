export interface SoraVideoRequest {
  model: "sora-2";
  prompt: string;
  url?: string; // Reference image URL or Base64
  aspectRatio?: "16:9" | "9:16";
  duration?: 10 | 15;
  remixTargetId?: string;
  characters?: CharacterInput[];
  size?: "small" | "large";
  webHook?: string;
  shutProgress?: boolean;
}

export interface CharacterInput {
  url: string;
  timestamps: string; // "start,end" e.g., "0,3"
}

export interface UploadCharacterRequest {
  url: string;
  timestamps?: string;
  webHook?: string;
  shutProgress?: boolean;
}

export interface CreateCharacterRequest {
  pid: string;
  timestamps: string;
  webHook?: string;
  shutProgress?: boolean;
}

export interface ApiResponse<T> {
  code: number;
  msg: string;
  data: T;
}

export interface TaskInitResponse {
  id: string;
}

export interface TaskResult {
  id: string;
  results: Array<{
    url?: string;
    removeWatermark?: boolean;
    pid?: string;
    character_id?: string;
  }>;
  progress: number;
  status: "running" | "succeeded" | "failed";
  failure_reason?: string;
  error?: string;
}

export interface TaskHistoryItem extends TaskResult {
  timestamp: number;
  requestPrompt?: string;
  requestType: 'video' | 'character_upload' | 'character_create';
}
