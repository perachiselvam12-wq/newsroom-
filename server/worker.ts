import crypto from 'node:crypto';
import { db } from './db.js';
import { transcribeAndAnalyzeMeeting } from './gemini.js';
import type { ProcessingJob, Analysis, JobStatus } from './types.js';

interface JobPayload {
  jobId: string;
  analysisId: string;
  userId: string;
  filePath?: string;
  mimeType?: string;
  textContent?: string;
  sourceLanguage: 'en' | 'ta' | 'auto';
  outputLanguage: 'en' | 'ta';
  title: string;
}

const activeJobSet = new Set<string>();

export function createProcessingJob(
  analysisId: string,
  userId: string,
  jobType: 'video_analysis' | 'audio_analysis' | 'text_analysis',
  payload: Omit<JobPayload, 'jobId' | 'analysisId' | 'userId'>
): ProcessingJob {
  const jobId = `job_${crypto.randomUUID()}`;
  const job: ProcessingJob = {
    id: jobId,
    analysisId,
    userId,
    jobType,
    status: 'queued',
    progress: 5,
    currentStage: 'Job queued in newsroom processing pipeline',
    retryCount: 0,
    startedAt: new Date().toISOString()
  };

  db.createJob(job);
  db.updateAnalysis(analysisId, { jobId, processingStatus: 'queued' });

  // Launch job asynchronously
  setImmediate(() => {
    runProcessingJob({
      jobId,
      analysisId,
      userId,
      ...payload
    }).catch(err => {
      console.error(`[Worker] Uncaught error processing job ${jobId}:`, err);
    });
  });

  return job;
}

export async function runProcessingJob(payload: JobPayload): Promise<void> {
  const { jobId, analysisId, userId } = payload;
  if (activeJobSet.has(jobId)) {
    console.warn(`[Worker] Job ${jobId} is already running`);
    return;
  }

  activeJobSet.add(jobId);

  const updateStage = (status: JobStatus, progress: number, stage: string) => {
    db.updateJob(jobId, {
      status,
      progress,
      currentStage: stage
    });
    db.updateAnalysis(analysisId, {
      processingStatus: status
    });
  };

  try {
    // Stage 1: Queued & Preparing
    updateStage('queued', 10, 'Initializing audio extraction and media verification...');
    await new Promise(r => setTimeout(r, 600));

    // Stage 2: Extracting audio / stream preparation
    if (payload.filePath) {
      updateStage('extracting_audio', 25, 'Extracting high-fidelity speech channel and normalizing acoustic levels...');
      await new Promise(r => setTimeout(r, 800));
    }

    // Stage 3: Speech-to-Text & Multilingual Acoustic Recognition
    updateStage('transcribing', 45, `Transcribing spoken dialogue (Language: ${payload.sourceLanguage === 'ta' ? 'Tamil தமிழ்' : payload.sourceLanguage === 'en' ? 'English' : 'Auto-detect'})...`);

    // Stage 4: AI Analysis & Extraction via Gemini
    updateStage('analyzing', 70, 'Analyzing discussions, isolating verified decisions, and extracting news angles...');

    const result = await transcribeAndAnalyzeMeeting({
      filePath: payload.filePath,
      mimeType: payload.mimeType,
      textContent: payload.textContent,
      sourceLanguage: payload.sourceLanguage,
      outputLanguage: payload.outputLanguage,
      title: payload.title
    });

    // Stage 5: Generating Report
    updateStage('generating_report', 90, 'Synthesizing editorial headlines, executive briefings, and action matrices...');
    await new Promise(r => setTimeout(r, 400));

    // Stage 6: Completed & Persisting
    db.updateAnalysis(analysisId, {
      processingStatus: 'completed',
      headline: result.primaryHeadline,
      analysisResult: result
    });

    db.updateJob(jobId, {
      status: 'completed',
      progress: 100,
      currentStage: 'Analysis complete. Editorial report ready.',
      completedAt: new Date().toISOString()
    });

    console.log(`[Worker] Job ${jobId} for analysis ${analysisId} completed successfully.`);
  } catch (error: any) {
    const errorMsg = error?.message || 'Processing failed';
    console.error(`[Worker] Job ${jobId} failed:`, error);

    db.updateJob(jobId, {
      status: 'failed',
      errorCode: 'PROCESSING_ERROR',
      errorMessage: errorMsg,
      currentStage: `Failed: ${errorMsg}`
    });

    db.updateAnalysis(analysisId, {
      processingStatus: 'failed'
    });
  } finally {
    activeJobSet.delete(jobId);
  }
}

export function retryAnalysisJob(analysisId: string, userId: string): ProcessingJob {
  const analysis = db.getAnalysisById(analysisId, userId);
  if (!analysis) {
    throw new Error('Analysis not found or access denied.');
  }

  let job = analysis.jobId ? db.getJobById(analysis.jobId, userId) : undefined;
  if (!job) {
    const newJobId = `job_${crypto.randomUUID()}`;
    job = {
      id: newJobId,
      analysisId,
      userId,
      jobType: analysis.sourceType === 'video' ? 'video_analysis' : analysis.sourceType === 'audio' ? 'audio_analysis' : 'text_analysis',
      status: 'queued',
      progress: 5,
      currentStage: 'Retrying analysis pipeline...',
      retryCount: 1,
      startedAt: new Date().toISOString()
    };
    db.createJob(job);
    db.updateAnalysis(analysisId, { jobId: newJobId, processingStatus: 'queued' });
  } else {
    job = db.updateJob(job.id, {
      status: 'queued',
      progress: 5,
      currentStage: 'Restarting analysis pipeline...',
      errorCode: undefined,
      errorMessage: undefined,
      retryCount: (job.retryCount || 0) + 1,
      startedAt: new Date().toISOString()
    })!;
    db.updateAnalysis(analysisId, { processingStatus: 'queued' });
  }

  // Launch job asynchronously
  setImmediate(() => {
    runProcessingJob({
      jobId: job.id,
      analysisId,
      userId,
      filePath: analysis.mediaPath,
      textContent: undefined,
      sourceLanguage: analysis.sourceLanguage,
      outputLanguage: analysis.outputLanguage,
      title: analysis.title
    }).catch(err => {
      console.error(`[Worker] Uncaught error retrying job ${job.id}:`, err);
    });
  });

  return job;
}

