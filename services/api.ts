import { SoraVideoRequest, UploadCharacterRequest, CreateCharacterRequest, ApiResponse, TaskResult } from '../types';

export class SoraService {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, ""); // Remove trailing slash
  }

  private get headers() {
    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${this.apiKey}`,
    };
  }

  // Helper to handle the initial response which might be direct ID or wrapped in data
  private async handleInitResponse(response: Response): Promise<string> {
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }
    const json = await response.json();
    
    // Check standard wrapper
    if (json.code !== undefined && json.code !== 0) {
        throw new Error(json.msg || "Unknown API Error");
    }

    if (json.data && json.data.id) {
      return json.data.id;
    }
    
    // Fallback if direct ID returned (unlikely based on docs but possible)
    if (json.id) return json.id;

    throw new Error("Invalid response format: No Task ID received");
  }

  async generateVideo(payload: SoraVideoRequest): Promise<string> {
    // Force webhook to -1 for polling
    const finalPayload = { ...payload, webHook: "-1" };
    
    const res = await fetch(`${this.baseUrl}/v1/video/sora-video`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(finalPayload),
    });
    return this.handleInitResponse(res);
  }

  async uploadCharacter(payload: UploadCharacterRequest): Promise<string> {
    const finalPayload = { ...payload, webHook: "-1" };
    const res = await fetch(`${this.baseUrl}/v1/video/sora-upload-character`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(finalPayload),
    });
    return this.handleInitResponse(res);
  }

  async createCharacter(payload: CreateCharacterRequest): Promise<string> {
    const finalPayload = { ...payload, webHook: "-1" };
    const res = await fetch(`${this.baseUrl}/v1/video/sora-create-character`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(finalPayload),
    });
    return this.handleInitResponse(res);
  }

  async getResult(id: string): Promise<TaskResult> {
    const res = await fetch(`${this.baseUrl}/v1/draw/result`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ id }),
    });
    
    if (!res.ok) {
        throw new Error(`Failed to fetch result: ${res.statusText}`);
    }

    const json: ApiResponse<TaskResult> = await res.json();
    
    if (json.code !== 0) {
      // Sometimes code -22 means task not found/ready?
      throw new Error(json.msg || `Error fetching result for ID: ${id}`);
    }

    return json.data;
  }
}
