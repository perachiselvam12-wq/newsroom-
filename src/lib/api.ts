import type { Analysis, DashboardStats, ProcessingJob, User } from '../types';

const API_BASE = '/api';

export function getToken(): string | null {
  return localStorage.getItem('newsroom_token');
}

export function setToken(token: string): void {
  localStorage.setItem('newsroom_token', token);
}

export function removeToken(): void {
  localStorage.removeItem('newsroom_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    removeToken();
    window.dispatchEvent(new CustomEvent('newsroom_auth_expired'));
    throw new Error('Session expired. Please log in again.');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(errorData.error || `HTTP error ${response.status}`);
  }

  return response.json();
}

// --- AUTH API ---
export async function loginUser(email: string, password: string): Promise<{ token: string; user: User }> {
  const res = await request<{ token: string; user: User }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setToken(res.token);
  return res;
}

export async function registerUser(name: string, email: string, password: string, preferredLanguage = 'en'): Promise<{ token: string; user: User }> {
  const res = await request<{ token: string; user: User }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, preferredLanguage }),
  });
  setToken(res.token);
  return res;
}

export async function getCurrentUser(): Promise<{ user: User }> {
  return request<{ user: User }>('/auth/me');
}

export async function updateProfile(data: Partial<User>): Promise<{ user: User }> {
  return request<{ user: User }>('/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function resetPassword(email: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  return request<{ success: boolean; message: string }>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email, newPassword }),
  });
}

// --- CHUNKED UPLOAD (up to 1 GiB) ---
export interface UploadProgress {
  percentage: number;
  uploadedBytes: number;
  totalBytes: number;
  speedMib: number;
  etaSeconds: number;
  currentChunk: number;
  totalChunks: number;
}

export interface UploadController {
  cancel: () => void;
  pause: () => void;
  resume: () => void;
}

export async function uploadMediaChunked(
  file: File,
  onProgress?: (p: UploadProgress) => void,
  controllerRef?: { current?: UploadController }
): Promise<{ id: string; storageKey: string; originalFileName: string; fileSize: number }> {
  const chunkSize = 5 * 1024 * 1024; // 5 MiB chunks
  const totalBytes = file.size;
  const totalChunks = Math.max(1, Math.ceil(totalBytes / chunkSize));

  // Step 1: Initialize session
  const initRes = await request<{ uploadId: string; totalChunks: number; chunkSize: number }>('/upload/init', {
    method: 'POST',
    body: JSON.stringify({
      fileName: file.name,
      fileSize: totalBytes,
      mimeType: file.type || 'video/mp4',
      chunkSize,
    }),
  });

  const uploadId = initRes.uploadId;
  let isCancelled = false;
  let isPaused = false;
  let resumeResolve: (() => void) | null = null;

  if (controllerRef) {
    controllerRef.current = {
      cancel: () => {
        isCancelled = true;
        if (resumeResolve) resumeResolve();
        request(`/upload/${uploadId}`, { method: 'DELETE' }).catch(() => {});
      },
      pause: () => {
        isPaused = true;
      },
      resume: () => {
        isPaused = false;
        if (resumeResolve) {
          resumeResolve();
          resumeResolve = null;
        }
      },
    };
  }

  let uploadedBytes = 0;
  const startTime = Date.now();

  // Step 2: Upload chunks sequentially with retry
  for (let i = 0; i < totalChunks; i++) {
    if (isCancelled) {
      throw new Error('Upload cancelled by user.');
    }

    if (isPaused) {
      await new Promise<void>((resolve) => {
        resumeResolve = resolve;
      });
      if (isCancelled) throw new Error('Upload cancelled by user.');
    }

    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, totalBytes);
    const chunkBlob = file.slice(start, end);
    const currentChunkSize = end - start;

    let attempts = 0;
    let uploaded = false;

    while (attempts < 3 && !uploaded) {
      if (isCancelled) throw new Error('Upload cancelled by user.');
      attempts++;
      try {
        const token = getToken();
        const headers: Record<string, string> = {
          'x-upload-id': uploadId,
          'x-chunk-index': i.toString(),
        };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const chunkRes = await fetch(`${API_BASE}/upload/chunk?uploadId=${uploadId}&chunkIndex=${i}`, {
          method: 'POST',
          headers,
          body: chunkBlob,
        });

        if (!chunkRes.ok) {
          const errData = await chunkRes.json().catch(() => ({ error: 'Chunk upload failed' }));
          throw new Error(errData.error || `HTTP ${chunkRes.status}`);
        }

        uploaded = true;
        uploadedBytes += currentChunkSize;

        const elapsedSeconds = (Date.now() - startTime) / 1000;
        const speedBytesPerSec = elapsedSeconds > 0 ? uploadedBytes / elapsedSeconds : 0;
        const speedMib = +(speedBytesPerSec / (1024 * 1024)).toFixed(2);
        const remainingBytes = Math.max(0, totalBytes - uploadedBytes);
        const etaSeconds = speedBytesPerSec > 0 ? Math.ceil(remainingBytes / speedBytesPerSec) : 0;
        const percentage = Math.min(100, Math.round((uploadedBytes / totalBytes) * 100));

        if (onProgress) {
          onProgress({
            percentage,
            uploadedBytes,
            totalBytes,
            speedMib,
            etaSeconds,
            currentChunk: i + 1,
            totalChunks,
          });
        }
      } catch (err: any) {
        if (attempts >= 3) {
          throw new Error(`Failed to upload chunk ${i + 1}/${totalChunks} after 3 attempts: ${err.message}`);
        }
        await new Promise((r) => setTimeout(r, 1000 * attempts));
      }
    }
  }

  // Step 3: Complete upload
  const completeRes = await request<{ success: boolean; mediaFile: any }>('/upload/complete', {
    method: 'POST',
    body: JSON.stringify({ uploadId }),
  });

  return completeRes.mediaFile;
}

// --- ANALYSES & JOBS API ---
export async function createAnalysis(data: {
  title: string;
  sourceType: 'video' | 'audio' | 'text';
  mediaId?: string;
  textContent?: string;
  sourceLanguage?: 'en' | 'ta' | 'auto';
  outputLanguage?: 'en' | 'ta';
}): Promise<{ analysis: Analysis; job: ProcessingJob }> {
  return request<{ analysis: Analysis; job: ProcessingJob }>('/analyses', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getAnalyses(params?: {
  search?: string;
  sourceType?: string;
  language?: string;
  savedOnly?: boolean;
  sort?: 'newest' | 'oldest';
  page?: number;
  limit?: number;
}): Promise<{ analyses: Analysis[]; pagination: { total: number; page: number; limit: number; totalPages: number } }> {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.sourceType) query.set('sourceType', params.sourceType);
  if (params?.language) query.set('language', params.language);
  if (params?.savedOnly) query.set('savedOnly', 'true');
  if (params?.sort) query.set('sort', params.sort);
  if (params?.page) query.set('page', params.page.toString());
  if (params?.limit) query.set('limit', params.limit.toString());

  return request(`/analyses?${query.toString()}`);
}

export async function getAnalysisStats(): Promise<DashboardStats> {
  return request<DashboardStats>('/analyses/stats');
}

export async function getAnalysis(id: string): Promise<{ analysis: Analysis; job?: ProcessingJob }> {
  return request<{ analysis: Analysis; job?: ProcessingJob }>(`/analyses/${id}`);
}

export async function updateAnalysis(id: string, updates: Partial<Analysis>): Promise<{ analysis: Analysis }> {
  return request<{ analysis: Analysis }>(`/analyses/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function deleteAnalysis(id: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/analyses/${id}`, {
    method: 'DELETE',
  });
}

export async function getJobStatus(jobId: string): Promise<{ job: ProcessingJob }> {
  return request<{ job: ProcessingJob }>(`/jobs/${jobId}`);
}

export async function retryAnalysis(id: string): Promise<{ success: boolean; job: ProcessingJob }> {
  return request<{ success: boolean; job: ProcessingJob }>(`/analyses/${id}/retry`, {
    method: 'POST',
  });
}

export function getExportUrl(id: string, format: 'md' | 'txt'): string {
  const token = getToken();
  return `${API_BASE}/analyses/${id}/export?format=${format}&token=${token || ''}`;
}

export function getMediaUrl(analysisId: string): string {
  const token = getToken();
  return `${API_BASE}/media/${analysisId}?token=${token || ''}`;
}
