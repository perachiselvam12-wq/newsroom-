import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { User, Analysis, MediaFile, ProcessingJob, UploadSession } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const CHUNKS_DIR = path.join(DATA_DIR, 'chunks');

// Ensure directories exist
for (const dir of [DATA_DIR, UPLOADS_DIR, CHUNKS_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

interface DatabaseSchema {
  users: User[];
  analyses: Analysis[];
  mediaFiles: MediaFile[];
  processingJobs: ProcessingJob[];
  uploadSessions: UploadSession[];
}

const defaultSchema: DatabaseSchema = {
  users: [],
  analyses: [],
  mediaFiles: [],
  processingJobs: [],
  uploadSessions: []
};

class Database {
  private data: DatabaseSchema = defaultSchema;

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
      } else {
        this.save();
      }
    } catch (err) {
      console.error('[DB] Failed to load db.json, initializing fresh database', err);
      this.data = { ...defaultSchema };
      this.save();
    }
  }

  private save(): void {
    try {
      const tempFile = `${DB_FILE}.${Date.now()}.tmp`;
      fs.writeFileSync(tempFile, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempFile, DB_FILE);
    } catch (err) {
      console.error('[DB] Failed to save db.json atomically', err);
    }
  }

  // Users
  getUserByEmail(email: string): User | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  getUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  createUser(user: User): User {
    this.data.users.push(user);
    this.save();
    return user;
  }

  updateUser(id: string, updates: Partial<User>): User | undefined {
    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx === -1) return undefined;
    this.data.users[idx] = { ...this.data.users[idx], ...updates, updatedAt: new Date().toISOString() };
    this.save();
    return this.data.users[idx];
  }

  // Analyses
  getAnalysesByUserId(userId: string): Analysis[] {
    return this.data.analyses
      .filter(a => a.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getAnalysisById(id: string, userId?: string): Analysis | undefined {
    const analysis = this.data.analyses.find(a => a.id === id);
    if (!analysis) return undefined;
    if (userId && analysis.userId !== userId) return undefined;
    return analysis;
  }

  createAnalysis(analysis: Analysis): Analysis {
    this.data.analyses.push(analysis);
    this.save();
    return analysis;
  }

  updateAnalysis(id: string, updates: Partial<Analysis>, userId?: string): Analysis | undefined {
    const idx = this.data.analyses.findIndex(a => a.id === id && (!userId || a.userId === userId));
    if (idx === -1) return undefined;
    this.data.analyses[idx] = { ...this.data.analyses[idx], ...updates, updatedAt: new Date().toISOString() };
    this.save();
    return this.data.analyses[idx];
  }

  deleteAnalysis(id: string, userId: string): boolean {
    const idx = this.data.analyses.findIndex(a => a.id === id && a.userId === userId);
    if (idx === -1) return false;
    
    // Also remove associated media files if exist
    const analysis = this.data.analyses[idx];
    if (analysis.mediaPath && fs.existsSync(analysis.mediaPath)) {
      try {
        fs.unlinkSync(analysis.mediaPath);
      } catch (err) {
        console.warn(`[DB] Failed to unlink media file: ${analysis.mediaPath}`, err);
      }
    }

    this.data.analyses.splice(idx, 1);
    this.data.mediaFiles = this.data.mediaFiles.filter(m => m.analysisId !== id);
    this.data.processingJobs = this.data.processingJobs.filter(j => j.analysisId !== id);
    this.save();
    return true;
  }

  // Media files
  createMediaFile(media: MediaFile): MediaFile {
    this.data.mediaFiles.push(media);
    this.save();
    return media;
  }

  getMediaFileById(id: string, userId?: string): MediaFile | undefined {
    return this.data.mediaFiles.find(m => m.id === id && (!userId || m.userId === userId));
  }

  updateMediaFile(id: string, updates: Partial<MediaFile>): MediaFile | undefined {
    const idx = this.data.mediaFiles.findIndex(m => m.id === id);
    if (idx === -1) return undefined;
    this.data.mediaFiles[idx] = { ...this.data.mediaFiles[idx], ...updates };
    this.save();
    return this.data.mediaFiles[idx];
  }

  // Processing jobs
  createJob(job: ProcessingJob): ProcessingJob {
    this.data.processingJobs.push(job);
    this.save();
    return job;
  }

  getJobById(id: string, userId?: string): ProcessingJob | undefined {
    return this.data.processingJobs.find(j => j.id === id && (!userId || j.userId === userId));
  }

  getJobByAnalysisId(analysisId: string): ProcessingJob | undefined {
    return this.data.processingJobs.find(j => j.analysisId === analysisId);
  }

  updateJob(id: string, updates: Partial<ProcessingJob>): ProcessingJob | undefined {
    const idx = this.data.processingJobs.findIndex(j => j.id === id);
    if (idx === -1) return undefined;
    this.data.processingJobs[idx] = { ...this.data.processingJobs[idx], ...updates };
    this.save();
    return this.data.processingJobs[idx];
  }

  // Upload sessions
  createUploadSession(session: UploadSession): UploadSession {
    this.data.uploadSessions.push(session);
    this.save();
    return session;
  }

  getUploadSession(uploadId: string, userId?: string): UploadSession | undefined {
    return this.data.uploadSessions.find(s => s.uploadId === uploadId && (!userId || s.userId === userId));
  }

  updateUploadSession(uploadId: string, updates: Partial<UploadSession>): UploadSession | undefined {
    const idx = this.data.uploadSessions.findIndex(s => s.uploadId === uploadId);
    if (idx === -1) return undefined;
    this.data.uploadSessions[idx] = { 
      ...this.data.uploadSessions[idx], 
      ...updates, 
      updatedAt: new Date().toISOString() 
    };
    this.save();
    return this.data.uploadSessions[idx];
  }

  deleteUploadSession(uploadId: string): boolean {
    const idx = this.data.uploadSessions.findIndex(s => s.uploadId === uploadId);
    if (idx === -1) return false;
    this.data.uploadSessions.splice(idx, 1);
    this.save();
    return true;
  }
}

export const db = new Database();
export { DATA_DIR, UPLOADS_DIR, CHUNKS_DIR };
