import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import { db } from './server/db.js';
import {
  hashPassword,
  comparePassword,
  generateToken,
  requireAuth,
  seedDefaultUser,
  type AuthRequest
} from './server/auth.js';
import {
  initUpload,
  saveChunkStream,
  completeUpload,
  cancelUpload
} from './server/upload.js';
import { createProcessingJob, retryAnalysisJob } from './server/worker.js';
import type { Analysis, User } from './server/types.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

const app = express();

app.use(cors());

// Seed default editor user
seedDefaultUser();

// Raw binary stream handler for chunk uploads BEFORE express.json()
app.post('/api/upload/chunk', requireAuth, async (req: AuthRequest, res) => {
  const uploadId = (req.query.uploadId || req.headers['x-upload-id']) as string;
  const chunkIndexStr = (req.query.chunkIndex || req.headers['x-chunk-index']) as string;
  const chunkIndex = parseInt(chunkIndexStr, 10);

  if (!uploadId || isNaN(chunkIndex)) {
    res.status(400).json({ error: 'Missing uploadId or valid chunkIndex parameter.' });
    return;
  }

  try {
    const result = await saveChunkStream(uploadId, chunkIndex, req);
    res.json(result);
  } catch (err: any) {
    console.error(`[Upload] Chunk ${chunkIndex} error for ${uploadId}:`, err);
    res.status(500).json({ error: err.message || 'Failed to save chunk' });
  }
});

// JSON and URL-encoded parsers for all standard routes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// --- HEALTH CHECK ---
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Newsroom AI Backend',
    geminiConfigured: !!process.env.GEMINI_API_KEY
  });
});

// --- AUTHENTICATION ROUTES ---
app.post('/api/auth/register', (req, res) => {
  const { name, email, password, preferredLanguage } = req.body;
  if (!name || !email || !password) {
    res.status(400).json({ error: 'Name, email, and password are required.' });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters.' });
    return;
  }

  const existing = db.getUserByEmail(email);
  if (existing) {
    res.status(409).json({ error: 'An account with this email address already exists.' });
    return;
  }

  const newUser: User = {
    id: `usr_${crypto.randomUUID()}`,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    passwordHash: hashPassword(password),
    role: 'journalist',
    preferredLanguage: preferredLanguage === 'ta' ? 'ta' : 'en',
    theme: 'light',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.createUser(newUser);
  const token = generateToken(newUser);

  res.status(201).json({
    token,
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      preferredLanguage: newUser.preferredLanguage,
      theme: newUser.theme
    }
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  const user = db.getUserByEmail(email);
  if (!user || !comparePassword(password, user.passwordHash)) {
    res.status(401).json({ error: 'Invalid email or password credentials.' });
    return;
  }

  const token = generateToken(user);
  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      preferredLanguage: user.preferredLanguage,
      theme: user.theme
    }
  });
});

app.get('/api/auth/me', requireAuth, (req: AuthRequest, res) => {
  const user = req.user!;
  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      preferredLanguage: user.preferredLanguage,
      theme: user.theme
    }
  });
});

app.patch('/api/auth/profile', requireAuth, (req: AuthRequest, res) => {
  const { name, preferredLanguage, theme } = req.body;
  const updated = db.updateUser(req.user!.id, {
    ...(name ? { name: name.trim() } : {}),
    ...(preferredLanguage ? { preferredLanguage } : {}),
    ...(theme ? { theme } : {})
  });
  res.json({ user: updated });
});

app.post('/api/auth/reset-password', (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) {
    res.status(400).json({ error: 'Email and new password are required.' });
    return;
  }
  const user = db.getUserByEmail(email);
  if (!user) {
    res.status(404).json({ error: 'User with this email not found.' });
    return;
  }
  db.updateUser(user.id, { passwordHash: hashPassword(newPassword) });
  res.json({ success: true, message: 'Password reset successfully. You may now login.' });
});

// --- CHUNKED UPLOAD ROUTES (up to 1 GiB) ---
app.post('/api/upload/init', requireAuth, (req: AuthRequest, res) => {
  const { fileName, fileSize, mimeType, chunkSize } = req.body;
  if (!fileName || !fileSize) {
    res.status(400).json({ error: 'fileName and fileSize are required.' });
    return;
  }

  try {
    const session = initUpload(req.user!.id, fileName, fileSize, mimeType, chunkSize);
    res.json(session);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/upload/session/:uploadId', requireAuth, (req: AuthRequest, res) => {
  const { uploadId } = req.params;
  const session = db.getUploadSession(uploadId, req.user!.id);
  if (!session) {
    res.status(404).json({ error: 'Upload session not found.' });
    return;
  }
  res.json({
    uploadId: session.uploadId,
    uploadedChunks: session.uploadedChunks,
    totalChunks: session.totalChunks,
    chunkSize: session.chunkSize,
    completed: session.completed
  });
});

app.post('/api/upload/complete', requireAuth, async (req: AuthRequest, res) => {
  const { uploadId } = req.body;
  if (!uploadId) {
    res.status(400).json({ error: 'uploadId is required.' });
    return;
  }

  try {
    const mediaFile = await completeUpload(uploadId, req.user!.id);
    res.json({ success: true, mediaFile });
  } catch (err: any) {
    console.error('[Upload] Completion error:', err);
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/upload/:uploadId', requireAuth, (req: AuthRequest, res) => {
  const { uploadId } = req.params;
  cancelUpload(uploadId, req.user!.id);
  res.json({ success: true, message: 'Upload session cancelled and cleaned.' });
});

// --- ANALYSES & REPORTS ROUTES ---
app.post('/api/analyses', requireAuth, (req: AuthRequest, res) => {
  const {
    title,
    sourceType, // 'video' | 'audio' | 'text'
    mediaId,
    textContent,
    sourceLanguage = 'auto',
    outputLanguage = 'en'
  } = req.body;

  if (!title) {
    res.status(400).json({ error: 'Meeting title is required.' });
    return;
  }

  if (sourceType === 'text' && (!textContent || !textContent.trim())) {
    res.status(400).json({ error: 'Meeting text content is required for text analysis.' });
    return;
  }

  let mediaFile;
  if (sourceType !== 'text') {
    if (!mediaId) {
      res.status(400).json({ error: 'Uploaded media ID is required for audio/video analysis.' });
      return;
    }
    mediaFile = db.getMediaFileById(mediaId, req.user!.id);
    if (!mediaFile) {
      res.status(404).json({ error: 'Uploaded media file not found or unauthorized.' });
      return;
    }
  }

  const analysisId = `ans_${crypto.randomUUID()}`;
  const newAnalysis: Analysis = {
    id: analysisId,
    userId: req.user!.id,
    title: title.trim(),
    sourceType: sourceType as 'video' | 'audio' | 'text',
    fileName: mediaFile?.originalFileName,
    fileSize: mediaFile?.fileSize,
    mediaPath: mediaFile?.filePath,
    sourceLanguage: sourceLanguage as 'en' | 'ta' | 'auto',
    outputLanguage: outputLanguage as 'en' | 'ta',
    uploadStatus: 'completed',
    processingStatus: 'queued',
    headline: 'Processing Newsroom Analysis...',
    isSaved: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.createAnalysis(newAnalysis);

  if (mediaFile) {
    db.updateMediaFile(mediaFile.id, { analysisId });
  }

  // Launch background job
  const job = createProcessingJob(
    analysisId,
    req.user!.id,
    sourceType === 'video' ? 'video_analysis' : sourceType === 'audio' ? 'audio_analysis' : 'text_analysis',
    {
      filePath: mediaFile?.filePath,
      mimeType: mediaFile?.mimeType,
      textContent: textContent,
      sourceLanguage: sourceLanguage as 'en' | 'ta' | 'auto',
      outputLanguage: outputLanguage as 'en' | 'ta',
      title: title.trim()
    }
  );

  res.status(201).json({
    analysis: newAnalysis,
    job
  });
});

app.get('/api/analyses', requireAuth, (req: AuthRequest, res) => {
  const userId = req.user!.id;
  let list = db.getAnalysesByUserId(userId);

  const search = typeof req.query.search === 'string' ? req.query.search.toLowerCase() : '';
  const sourceType = typeof req.query.sourceType === 'string' ? req.query.sourceType : '';
  const language = typeof req.query.language === 'string' ? req.query.language : '';
  const savedOnly = req.query.savedOnly === 'true';
  const sort = req.query.sort === 'oldest' ? 'oldest' : 'newest';

  if (savedOnly) {
    list = list.filter(a => a.isSaved);
  }

  if (sourceType) {
    list = list.filter(a => a.sourceType === sourceType);
  }

  if (language) {
    list = list.filter(a => a.outputLanguage === language || a.sourceLanguage === language);
  }

  if (search) {
    list = list.filter(a => 
      a.title.toLowerCase().includes(search) || 
      a.headline?.toLowerCase().includes(search) ||
      a.analysisResult?.quickSummary?.toLowerCase().includes(search)
    );
  }

  if (sort === 'oldest') {
    list = list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  } else {
    list = list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 12;
  const total = list.length;
  const startIndex = (page - 1) * limit;
  const paginated = list.slice(startIndex, startIndex + limit);

  res.json({
    analyses: paginated,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  });
});

app.get('/api/analyses/stats', requireAuth, (req: AuthRequest, res) => {
  const userAnalyses = db.getAnalysesByUserId(req.user!.id);
  const totalAnalyses = userAnalyses.length;
  const videosAnalyzed = userAnalyses.filter(a => a.sourceType === 'video').length;
  const savedReports = userAnalyses.filter(a => a.isSaved).length;
  const recent = userAnalyses.slice(0, 5);

  res.json({
    totalAnalyses,
    videosAnalyzed,
    savedReports,
    recent
  });
});

app.get('/api/analyses/:id', requireAuth, (req: AuthRequest, res) => {
  const analysis = db.getAnalysisById(req.params.id, req.user!.id);
  if (!analysis) {
    res.status(404).json({ error: 'Analysis not found or access denied.' });
    return;
  }
  const job = analysis.jobId ? db.getJobById(analysis.jobId, req.user!.id) : undefined;
  res.json({ analysis, job });
});

app.patch('/api/analyses/:id', requireAuth, (req: AuthRequest, res) => {
  const { title, headline, isSaved } = req.body;
  const updated = db.updateAnalysis(req.params.id, {
    ...(title ? { title: title.trim() } : {}),
    ...(headline ? { headline: headline.trim() } : {}),
    ...(typeof isSaved === 'boolean' ? { isSaved } : {})
  }, req.user!.id);

  if (!updated) {
    res.status(404).json({ error: 'Analysis not found or access denied.' });
    return;
  }
  res.json({ analysis: updated });
});

app.delete('/api/analyses/:id', requireAuth, (req: AuthRequest, res) => {
  const success = db.deleteAnalysis(req.params.id, req.user!.id);
  if (!success) {
    res.status(404).json({ error: 'Analysis not found or access denied.' });
    return;
  }
  res.json({ success: true, message: 'Analysis and media deleted successfully.' });
});

// Export analysis as Markdown / Plain Text
app.get('/api/analyses/:id/export', requireAuth, (req: AuthRequest, res) => {
  const format = req.query.format === 'txt' ? 'txt' : 'md';
  const analysis = db.getAnalysisById(req.params.id, req.user!.id);
  if (!analysis || !analysis.analysisResult) {
    res.status(404).json({ error: 'Analysis report not found or processing incomplete.' });
    return;
  }

  const ar = analysis.analysisResult;
  let content = '';

  if (format === 'md') {
    content = `# ${ar.primaryHeadline}\n\n`;
    content += `**Source Meeting**: ${analysis.title}\n`;
    content += `**Date**: ${new Date(analysis.createdAt).toLocaleDateString()}\n`;
    content += `**Language**: ${analysis.outputLanguage === 'ta' ? 'Tamil (தமிழ்)' : 'English'}\n\n`;
    content += `---\n\n`;

    content += `## Alternative Headlines\n`;
    content += `- **Breaking Alert**: ${ar.alternativeHeadlines?.breaking}\n`;
    content += `- **Newspaper Broadsheet**: ${ar.alternativeHeadlines?.newspaper}\n`;
    content += `- **Corporate / Boardroom**: ${ar.alternativeHeadlines?.formal}\n`;
    content += `- **Digital News**: ${ar.alternativeHeadlines?.digital}\n`;
    content += `- **Social Media**: ${ar.alternativeHeadlines?.social}\n\n`;

    content += `## Quick Summary\n${ar.quickSummary}\n\n`;
    content += `## Executive Summary\n${ar.executiveSummary}\n\n`;
    content += `## Detailed Report\n${ar.detailedSummary}\n\n`;

    content += `## Important Points\n`;
    ar.importantPoints?.forEach((p, idx) => {
      content += `### ${idx + 1}. [${p.importance}] ${p.title} (${p.category})\n`;
      content += `${p.explanation}\n`;
      if (p.speaker) content += `*Speaker*: ${p.speaker} | *Timestamp*: ${p.timestamp || 'N/A'}\n`;
      if (p.excerpt) content += `> "${p.excerpt}"\n\n`;
    });

    content += `## Confirmed Decisions\n`;
    ar.decisions?.forEach((d, idx) => {
      content += `${idx + 1}. **${d.decision}**\n   *Context*: ${d.context}\n`;
      if (d.decidedBy) content += `   *Decided by*: ${d.decidedBy}\n`;
    });
    content += `\n`;

    content += `## Action Items\n`;
    ar.actionItems?.forEach((a, idx) => {
      content += `- [ ] **${a.task}** | Owner: ${a.assignedTo} | Deadline: ${a.deadline} | Status: ${a.status}\n`;
    });
    content += `\n`;

    content += `## Key Facts & Metrics\n`;
    ar.keyFacts?.forEach(kf => {
      content += `- **[${kf.category}] ${kf.item}**: ${kf.context}\n`;
    });
    content += `\n`;

    if (ar.pendingQuestions?.length) {
      content += `## Unresolved Questions & Pending Follow-Ups\n`;
      ar.pendingQuestions.forEach(q => {
        content += `- ${q}\n`;
      });
      content += `\n`;
    }

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(analysis.title)}_report.md"`);
    res.send(content);
  } else {
    // Plain Text
    content = `${ar.primaryHeadline.toUpperCase()}\n`;
    content += `Meeting: ${analysis.title}\n`;
    content += `Date: ${new Date(analysis.createdAt).toLocaleDateString()}\n\n`;
    content += `QUICK SUMMARY:\n${ar.quickSummary}\n\n`;
    content += `EXECUTIVE BRIEFING:\n${ar.executiveSummary}\n\n`;
    content += `DETAILED REPORT:\n${ar.detailedSummary}\n\n`;
    content += `CONFIRMED DECISIONS:\n`;
    ar.decisions?.forEach((d, idx) => {
      content += `${idx + 1}. ${d.decision} (Context: ${d.context})\n`;
    });
    content += `\nACTION ITEMS:\n`;
    ar.actionItems?.forEach((a, idx) => {
      content += `${idx + 1}. ${a.task} | Assigned: ${a.assignedTo} | Deadline: ${a.deadline}\n`;
    });

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(analysis.title)}_report.txt"`);
    res.send(content);
  }
});

// Stream media file with HTTP 206 Partial Content (range requests) for playback
app.get('/api/media/:analysisId', requireAuth, (req: AuthRequest, res) => {
  const analysis = db.getAnalysisById(req.params.analysisId, req.user!.id);
  if (!analysis || !analysis.mediaPath || !fs.existsSync(analysis.mediaPath)) {
    res.status(404).json({ error: 'Media file not found.' });
    return;
  }

  const filePath = analysis.mediaPath;
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  const ext = path.extname(filePath).toLowerCase();
  let contentType = 'video/mp4';
  if (ext === '.mp3') contentType = 'audio/mp3';
  else if (ext === '.wav') contentType = 'audio/wav';
  else if (ext === '.webm') contentType = 'video/webm';
  else if (ext === '.mov') contentType = 'video/quicktime';
  else if (ext === '.m4a') contentType = 'audio/m4a';

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    const fileStream = fs.createReadStream(filePath, { start, end });
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType,
    });
    fileStream.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': contentType,
    });
    fs.createReadStream(filePath).pipe(res);
  }
});

// --- JOBS STATUS & POLLING ---
app.get('/api/jobs/:id', requireAuth, (req: AuthRequest, res) => {
  const job = db.getJobById(req.params.id, req.user!.id);
  if (!job) {
    res.status(404).json({ error: 'Processing job not found.' });
    return;
  }
  res.json({ job });
});

app.post('/api/jobs/:id/retry', requireAuth, (req: AuthRequest, res) => {
  const job = db.getJobById(req.params.id, req.user!.id);
  if (!job) {
    res.status(404).json({ error: 'Processing job not found.' });
    return;
  }
  try {
    const updatedJob = retryAnalysisJob(job.analysisId, req.user!.id);
    res.json({ success: true, job: updatedJob });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/analyses/:id/retry', requireAuth, (req: AuthRequest, res) => {
  try {
    const updatedJob = retryAnalysisJob(req.params.id, req.user!.id);
    res.json({ success: true, job: updatedJob });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Mount Vite or serve static files
async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Newsroom AI] Full-stack server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[Newsroom AI] Fatal startup error:', err);
  process.exit(1);
});
