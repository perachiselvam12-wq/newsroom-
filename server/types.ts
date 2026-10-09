export type SourceType = 'video' | 'audio' | 'text';
export type JobStatus = 'queued' | 'extracting_audio' | 'transcribing' | 'analyzing' | 'generating_report' | 'completed' | 'failed' | 'cancelled';
export type ImportanceLevel = 'High' | 'Medium' | 'Low';
export type PointCategory = 
  | 'Main Announcements'
  | 'Important Facts & Figures'
  | 'Key Discussions'
  | 'Decisions Made'
  | 'Problems Identified'
  | 'Proposed Solutions'
  | 'Future Plans'
  | 'Action Items'
  | 'Pending Issues';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'editor' | 'journalist' | 'admin';
  preferredLanguage?: 'en' | 'ta';
  theme?: 'light' | 'dark';
  createdAt: string;
  updatedAt: string;
}

export interface ImportantPoint {
  id: string;
  category: PointCategory;
  title: string;
  explanation: string;
  importance: ImportanceLevel;
  speaker?: string;
  timestamp?: string;
  excerpt?: string;
}

export interface DecisionItem {
  id: string;
  decision: string;
  context: string;
  isConfirmed: boolean;
  decidedBy?: string;
  timestamp?: string;
}

export interface ActionItem {
  id: string;
  task: string;
  assignedTo: string; // or "Not specified"
  deadline: string;   // or "Not specified"
  status: 'Pending' | 'In Progress' | 'Completed';
  timestamp?: string;
}

export interface KeyFact {
  id: string;
  category: 'Number' | 'Date' | 'Name' | 'Organization' | 'Claim';
  item: string;
  context: string;
}

export interface TranscriptSegment {
  id: string;
  speaker: string;
  timestamp: string;
  text: string;
}

export interface AlternativeHeadlines {
  breaking: string;
  newspaper: string;
  formal: string;
  digital: string;
  social: string;
}

export interface AnalysisResult {
  primaryHeadline: string;
  alternativeHeadlines: AlternativeHeadlines;
  quickSummary: string;
  detailedSummary: string;
  executiveSummary: string;
  importantPoints: ImportantPoint[];
  decisions: DecisionItem[];
  actionItems: ActionItem[];
  keyFacts: KeyFact[];
  pendingQuestions: string[];
  transcriptSegments: TranscriptSegment[];
  detectedLanguage?: string;
}

export interface Analysis {
  id: string;
  userId: string;
  title: string;
  sourceType: SourceType;
  fileName?: string;
  fileSize?: number;
  mediaPath?: string;
  sourceLanguage: 'en' | 'ta' | 'auto';
  outputLanguage: 'en' | 'ta';
  uploadStatus: 'completed' | 'failed';
  processingStatus: JobStatus;
  headline: string;
  analysisResult?: AnalysisResult;
  isSaved: boolean;
  jobId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MediaFile {
  id: string;
  userId: string;
  analysisId?: string;
  storageKey: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  filePath: string;
  uploadStatus: 'uploading' | 'completed' | 'failed';
  createdAt: string;
}

export interface ProcessingJob {
  id: string;
  analysisId: string;
  userId: string;
  jobType: 'video_analysis' | 'audio_analysis' | 'text_analysis';
  status: JobStatus;
  progress: number; // 0 - 100
  currentStage: string;
  errorCode?: string;
  errorMessage?: string;
  retryCount: number;
  startedAt: string;
  completedAt?: string;
}

export interface UploadSession {
  uploadId: string;
  userId: string;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  chunkSize: number;
  totalChunks: number;
  uploadedChunks: number[];
  completed: boolean;
  targetPath: string;
  createdAt: string;
  updatedAt: string;
}
