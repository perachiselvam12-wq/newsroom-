import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import { db, UPLOADS_DIR, CHUNKS_DIR } from './db.js';
import type { UploadSession, MediaFile } from './types.js';

export const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1 GiB (1,073,741,824 bytes)

const ALLOWED_MIME_TYPES = new Set([
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-matroska',
  'video/x-msvideo',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/webm',
  'audio/m4a',
  'audio/x-m4a',
  'audio/aac',
  'audio/ogg'
]);

const ALLOWED_EXTENSIONS = new Set([
  '.mp4', '.mov', '.webm', '.mkv', '.avi',
  '.mp3', '.wav', '.m4a', '.aac', '.ogg'
]);

export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function initUpload(userId: string, originalFileName: string, fileSize: number, mimeType: string, chunkSize = 5 * 1024 * 1024) {
  if (fileSize > MAX_FILE_SIZE) {
    throw new Error(`File size ${fileSize} exceeds maximum allowed limit of 1 GiB (1,073,741,824 bytes).`);
  }

  const ext = path.extname(originalFileName).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext) && !ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error(`Unsupported file type: ${mimeType || ext}. Supported formats: MP4, MOV, WebM, MP3, WAV, M4A.`);
  }

  const uploadId = `upl_${crypto.randomUUID()}`;
  const totalChunks = Math.max(1, Math.ceil(fileSize / chunkSize));
  const chunkDir = path.join(CHUNKS_DIR, uploadId);

  if (!fs.existsSync(chunkDir)) {
    fs.mkdirSync(chunkDir, { recursive: true });
  }

  const targetPath = path.join(UPLOADS_DIR, `${uploadId}_${sanitizeFileName(originalFileName)}`);

  const session: UploadSession = {
    uploadId,
    userId,
    originalFileName,
    fileSize,
    mimeType: mimeType || 'application/octet-stream',
    chunkSize,
    totalChunks,
    uploadedChunks: [],
    completed: false,
    targetPath,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.createUploadSession(session);
  return {
    uploadId,
    chunkSize,
    totalChunks,
    maxFileSize: MAX_FILE_SIZE
  };
}

export async function saveChunkStream(uploadId: string, chunkIndex: number, req: Request): Promise<{ uploadId: string; chunkIndex: number; uploadedChunksCount: number; totalChunks: number }> {
  const session = db.getUploadSession(uploadId);
  if (!session) {
    throw new Error('Upload session not found or expired.');
  }

  const chunkDir = path.join(CHUNKS_DIR, uploadId);
  if (!fs.existsSync(chunkDir)) {
    fs.mkdirSync(chunkDir, { recursive: true });
  }

  const chunkFilePath = path.join(chunkDir, `${chunkIndex}.chunk`);

  return new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(chunkFilePath);
    
    req.pipe(writeStream);

    writeStream.on('finish', () => {
      if (!session.uploadedChunks.includes(chunkIndex)) {
        session.uploadedChunks.push(chunkIndex);
        session.uploadedChunks.sort((a, b) => a - b);
        db.updateUploadSession(uploadId, { uploadedChunks: session.uploadedChunks });
      }

      resolve({
        uploadId,
        chunkIndex,
        uploadedChunksCount: session.uploadedChunks.length,
        totalChunks: session.totalChunks
      });
    });

    writeStream.on('error', (err) => {
      reject(new Error(`Failed to write chunk ${chunkIndex}: ${err.message}`));
    });

    req.on('error', (err) => {
      writeStream.destroy();
      reject(new Error(`Network error receiving chunk ${chunkIndex}: ${err.message}`));
    });
  });
}

export async function completeUpload(uploadId: string, userId: string): Promise<MediaFile> {
  const session = db.getUploadSession(uploadId, userId);
  if (!session) {
    throw new Error('Upload session not found or unauthorized.');
  }

  const chunkDir = path.join(CHUNKS_DIR, uploadId);
  if (!fs.existsSync(chunkDir)) {
    throw new Error('Chunk directory missing.');
  }

  // Verify all chunks exist
  for (let i = 0; i < session.totalChunks; i++) {
    const chunkPath = path.join(chunkDir, `${i}.chunk`);
    if (!fs.existsSync(chunkPath)) {
      throw new Error(`Missing chunk ${i} of ${session.totalChunks}. Please resume or re-upload missing chunks.`);
    }
  }

  // Merge chunks into target file
  const writeStream = fs.createWriteStream(session.targetPath);

  for (let i = 0; i < session.totalChunks; i++) {
    const chunkPath = path.join(chunkDir, `${i}.chunk`);
    const chunkBuffer = fs.readFileSync(chunkPath);
    writeStream.write(chunkBuffer);
  }

  await new Promise<void>((resolve, reject) => {
    writeStream.end((err?: Error | null) => {
      if (err) reject(err);
      else resolve();
    });
  });

  // Clean up chunks
  try {
    fs.rmSync(chunkDir, { recursive: true, force: true });
  } catch (err) {
    console.warn(`[Upload] Failed to remove chunk dir: ${chunkDir}`, err);
  }

  // Verify merged file size
  const stat = fs.statSync(session.targetPath);
  db.updateUploadSession(uploadId, { completed: true });

  const mediaFile: MediaFile = {
    id: `med_${crypto.randomUUID()}`,
    userId: session.userId,
    storageKey: uploadId,
    originalFileName: session.originalFileName,
    mimeType: session.mimeType,
    fileSize: stat.size,
    filePath: session.targetPath,
    uploadStatus: 'completed',
    createdAt: new Date().toISOString()
  };

  db.createMediaFile(mediaFile);
  return mediaFile;
}

export function cancelUpload(uploadId: string, userId: string): void {
  const session = db.getUploadSession(uploadId, userId);
  if (!session) return;

  const chunkDir = path.join(CHUNKS_DIR, uploadId);
  if (fs.existsSync(chunkDir)) {
    try {
      fs.rmSync(chunkDir, { recursive: true, force: true });
    } catch (e) {
      console.warn('[Upload] Error cleaning up chunk dir', e);
    }
  }

  if (fs.existsSync(session.targetPath)) {
    try {
      fs.unlinkSync(session.targetPath);
    } catch (e) {
      console.warn('[Upload] Error cleaning up partial file', e);
    }
  }

  db.deleteUploadSession(uploadId);
}
