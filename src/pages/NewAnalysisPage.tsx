import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  Video, 
  FileAudio, 
  FileText, 
  Languages, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  Pause, 
  Play, 
  ArrowRight,
  Clock,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { 
  uploadMediaChunked, 
  createAnalysis, 
  getJobStatus, 
  getAnalysis,
  type UploadProgress,
  type UploadController 
} from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { saveMeetingToFirestore } from '../lib/firestoreService';
import type { Meeting } from '../types';

interface NewAnalysisPageProps {
  onAnalysisReady: (analysisId: string) => void;
  onCancel: () => void;
}

export const NewAnalysisPage: React.FC<NewAnalysisPageProps> = ({ onAnalysisReady, onCancel }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'upload' | 'text'>('upload');
  
  // Form fields
  const [title, setTitle] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState<'auto' | 'en' | 'ta'>('auto');
  const [outputLanguage, setOutputLanguage] = useState<'en' | 'ta'>('en');
  const [textContent, setTextContent] = useState('');

  // Upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedMediaId, setUploadedMediaId] = useState<string | null>(null);

  // Background Job Processing state
  const [jobId, setJobId] = useState<string | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [jobProgress, setJobProgress] = useState<number>(0);
  const [jobStage, setJobStage] = useState<string>('Initializing pipeline...');
  const [jobError, setJobError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadControllerRef = useRef<UploadController | undefined>(undefined);
  const pollIntervalRef = useRef<any>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const handleFileSelect = (file: File) => {
    setUploadError(null);
    const maxBytes = 1024 * 1024 * 1024; // 1 GiB
    if (file.size > maxBytes) {
      setUploadError('File exceeds maximum limit of 1 GiB (1,073,741,824 bytes).');
      return;
    }
    setSelectedFile(file);
    if (!title) {
      // Auto-populate title from clean filename
      const clean = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      setTitle(clean.charAt(0).toUpperCase() + clean.slice(1));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleStartAnalysis = async () => {
    setUploadError(null);
    setJobError(null);

    if (!title.trim()) {
      setUploadError('Please provide a descriptive meeting title.');
      return;
    }

    if (activeTab === 'upload') {
      if (!selectedFile && !uploadedMediaId) {
        setUploadError('Please choose a meeting video or audio file to analyze.');
        return;
      }
    } else {
      if (!textContent.trim()) {
        setUploadError('Please input or paste meeting notes or discussion text.');
        return;
      }
    }

    try {
      let mediaId = uploadedMediaId;

      // If file chosen and not uploaded yet, run chunked upload first
      if (activeTab === 'upload' && selectedFile && !uploadedMediaId) {
        setIsUploading(true);
        const media = await uploadMediaChunked(
          selectedFile,
          (progress) => {
            setUploadProgress(progress);
          },
          uploadControllerRef
        );
        mediaId = media.id;
        setUploadedMediaId(media.id);
        setIsUploading(false);
      }

      // Submit analysis job
      setIsProcessing(true);
      setJobStage('Submitting meeting to newsroom analysis worker...');

      const res = await createAnalysis({
        title: title.trim(),
        sourceType: activeTab === 'upload' ? (selectedFile?.type.includes('audio') ? 'audio' : 'video') : 'text',
        mediaId: mediaId || undefined,
        textContent: activeTab === 'text' ? textContent.trim() : undefined,
        sourceLanguage,
        outputLanguage,
      });

      setAnalysisId(res.analysis.id);
      setJobId(res.job.id);
      setJobProgress(res.job.progress);
      setJobStage(res.job.currentStage);

      // Start polling job status
      startJobPolling(res.job.id, res.analysis.id);

    } catch (err: any) {
      console.error('[NewAnalysis] Process error:', err);
      setIsUploading(false);
      setIsProcessing(false);
      setUploadError(err.message || 'Operation failed. Please try again.');
    }
  };

  const startJobPolling = (jId: string, aId: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    pollIntervalRef.current = setInterval(async () => {
      try {
        const { job } = await getJobStatus(jId);
        setJobProgress(job.progress);
        setJobStage(job.currentStage);

        if (job.status === 'completed') {
          clearInterval(pollIntervalRef.current);
          setIsProcessing(false);

          // Save meeting record to Firestore under the authenticated user's UID
          try {
            const { analysis } = await getAnalysis(aId);
            if (user?.uid) {
              const meetingPayload: Meeting = {
                id: analysis.id,
                userId: user.uid,
                title: analysis.title,
                mediaType: analysis.sourceType || (selectedFile?.type.includes('audio') ? 'audio' : 'video'),
                sourceType: analysis.sourceType || (selectedFile?.type.includes('audio') ? 'audio' : 'video'),
                mediaFileName: selectedFile?.name || analysis.fileName || '',
                mediaDuration: 'Meeting Recording',
                status: 'completed',
                processingStatus: 'completed',
                uploadStatus: 'completed',
                sourceLanguage,
                outputLanguage,
                originalTranscript:
                  analysis.analysisResult?.transcriptSegments
                    ?.map((s) => `[${s.timestamp}] ${s.speaker}: ${s.text}`)
                    .join('\n\n') || textContent || '',
                headline: analysis.headline || analysis.analysisResult?.primaryHeadline || analysis.title,
                headlines: {
                  primary: analysis.headline || analysis.analysisResult?.primaryHeadline || analysis.title,
                  breaking: analysis.analysisResult?.alternativeHeadlines?.breaking || '',
                  newspaper: analysis.analysisResult?.alternativeHeadlines?.newspaper || '',
                  formal: analysis.analysisResult?.alternativeHeadlines?.formal || '',
                  digital: analysis.analysisResult?.alternativeHeadlines?.digital || '',
                  social: analysis.analysisResult?.alternativeHeadlines?.social || '',
                },
                shortSummary: analysis.analysisResult?.quickSummary || '',
                detailedSummary: analysis.analysisResult?.detailedSummary || '',
                keyPoints: analysis.analysisResult?.importantPoints || [],
                actionItems: analysis.analysisResult?.actionItems || [],
                keyDecisions: analysis.analysisResult?.decisions || [],
                keyFacts: analysis.analysisResult?.keyFacts || [],
                sentiment: 'Objective & Constructive',
                importance: 'High',
                isSaved: false,
                analysisResult: analysis.analysisResult,
                createdAt: analysis.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              await saveMeetingToFirestore(meetingPayload);
            }
          } catch (syncErr) {
            console.warn('[NewAnalysis] Firestore synchronization warning:', syncErr);
          }

          onAnalysisReady(aId);
        } else if (job.status === 'failed') {
          clearInterval(pollIntervalRef.current);
          setIsProcessing(false);
          setJobError(job.errorMessage || 'Analysis failed in background processor.');
        }
      } catch (err: any) {
        console.warn('[Polling] error checking job status:', err);
      }
    }, 1500);
  };

  const handlePauseResume = () => {
    if (!uploadControllerRef.current) return;
    if (isPaused) {
      uploadControllerRef.current.resume();
      setIsPaused(false);
    } else {
      uploadControllerRef.current.pause();
      setIsPaused(true);
    }
  };

  const handleCancelUpload = () => {
    if (uploadControllerRef.current) {
      uploadControllerRef.current.cancel();
    }
    setIsUploading(false);
    setIsPaused(false);
    setUploadProgress(null);
    setSelectedFile(null);
  };

  // Sample templates for instant testing
  const loadEnglishSample = () => {
    setActiveTab('text');
    setTitle('Q3 Global Product Strategy & Autonomous Drone Launch Council');
    setSourceLanguage('en');
    setOutputLanguage('en');
    setTextContent(`MEETING TRANSCRIPT — Q3 Global Product Council
Date: October 8, 2026 | Attendees: Dr. Evelyn Vance (Chief Technology Officer), Marcus Sterling (VP of Hardware), Priya Sundaram (Lead Systems Architect), Liam Davis (Director of Regulatory Affairs)

00:00 [Dr. Vance]: Good morning team. Today our sole agenda is finalizing our commercial drone deployment timeline and resolving the battery density bottleneck before our public press conference on November 15.
01:30 [Marcus Sterling]: The revised lithium-silicon cell test completed yesterday at our Nevada testing facility. It yields 420 Watt-hours per kilogram, which gives the Falcon-X drone a flight duration of 64 minutes under full sensor payload.
03:10 [Dr. Vance]: That is a breakthrough number. What are the thermals looking like in sustained desert environments?
04:00 [Marcus Sterling]: Under 45°C ambient temperatures, peak cell temperatures peaked at 52°C. Well below our 60°C safety envelope.
05:15 [Liam Davis]: From a regulatory standpoint, the Federal Aviation Administration granted our Part 107 BVLOS (Beyond Visual Line of Sight) waiver on Tuesday for commercial corridors in Nevada and Arizona.
06:45 [Dr. Vance]: This is decisive. We officially ratify the November 15 launch date for Falcon-X. Let's make sure production reaches 5,000 units by December 1. Marcus, you own manufacturing sign-off by October 25.
08:20 [Priya Sundaram]: What about the obstacle avoidance edge neural network? We are still seeing edge-case reflections in foggy conditions.
09:10 [Dr. Vance]: Priya, deploy model version 4.2 with LiDAR sensor fusion to address fog reflections. That task must be verified by October 30. We will not ship firmware with false positives.
10:30 [Marcus Sterling]: Understood. We will have final pre-production validation completed next week.
11:00 [Dr. Vance]: Meeting adjourned. Key commitment is Falcon-X commercial announcement on November 15.`);
  };

  const loadTamilSample = () => {
    setActiveTab('text');
    setTitle('சென்னை தகவல் தொழில்நுட்ப பூங்கா முதலீட்டு திட்டக்குழு கூட்டம்');
    setSourceLanguage('ta');
    setOutputLanguage('ta');
    setTextContent(`கூட்ட குறிப்புகள் — சென்னை தொழில் முதலீட்டு வழிகாட்டி குழு
தேதி: 08 அக்டோபர் 2026 | பங்கேற்பாளர்கள்: அமைச்சர் சுந்தர்ராஜன், முதன்மை செயலாளர் ராஜேஷ் கண்ணா, சிப்காட் இயக்குனர் மீனாட்சி, முதலீட்டு குழு தலைவர் கார்த்திக்

00:00 [அமைச்சர் சுந்தர்ராஜன்]: வணக்கம் அனைவருக்கும். இன்றைய கூட்டத்தில் தென் சென்னையில் அமையவிருக்கும் புதிய செயற்கை நுண்ணறிவு மற்றும் செமிகண்டக்டர் பூங்காவிற்கான நிதி ஒதுக்கீடு மற்றும் நிலம் கையகப்படுத்துதல் குறித்து இறுதி முடிவெடுக்க வேண்டும்.
01:45 [செயலாளர் ராஜேஷ் கண்ணா]: சிறுசேரி அருகே 350 ஏக்கர் நிலம் அடையாளம் காணப்பட்டுள்ளது. இதற்காக முதல் கட்டமாக ₹1,200 கோடி நிதி முதலீடு தேவைப்படுகிறது. மூன்று பன்னாட்டு சிப் வடிவமைப்பு நிறுவனங்கள் ஏற்கனவே புரிந்துணர்வு ஒப்பந்தத்தில் கையெழுத்திட தயாராக உள்ளன.
03:30 [மீனாட்சி]: நிலத்திற்கான சுற்றுச்சூழல் மற்றும் நீர் ஆதார அனுமதி அடுத்த திங்கட்கிழமைக்குள் கிடைக்கப்பெறும். சாலை இணைப்பு பணிகளை நவம்பர் 10-க்குள் தொடங்க வேண்டும்.
05:10 [அமைச்சர் சுந்தர்ராஜன்]: இது மிகவும் முக்கியமான திட்டம். அமைச்சரவை ஒப்புதல் பெற்று ₹1,200 கோடி நிதியை உடனடியாக விடுவிக்க உத்தரவிடுகிறேன். கட்டுமான பணிகளை 2026 டிசம்பர் 1-க்குள் தொடங்க வேண்டும்.
06:30 [கார்த்திக்]: திட்டத்தின் மூலம் 25,000 இளைஞர்களுக்கு நேரடி வேலைவாய்ப்பு உருவாகும் என்று கணக்கிடப்பட்டுள்ளது.
07:45 [அமைச்சர் சுந்தர்ராஜன்]: உறுதி செய்யப்பட்ட முடிவு: ₹1,200 கோடி ஒதுக்கீடு ஒப்புதல் அளிக்கப்பட்டது. முதன்மை செயலாளர் ராஜேஷ் கண்ணா நவம்பர் 5-க்குள் சர்வதேச ஒப்பந்தங்களை இறுதி செய்ய வேண்டும்.`);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Heading */}
      <div className="border-b border-slate-200 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-red-600 mb-1">
            New Analysis
          </div>
          <h1 className="text-2xl sm:text-3xl font-editorial font-bold text-slate-900">
            Ingest & Analyze Meeting Content
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Upload up to 1 GiB recordings or enter raw transcript notes to produce verified news headlines.
          </p>
        </div>

        {/* Quick Sample Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadEnglishSample}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 transition-colors"
          >
            Sample Meeting (EN)
          </button>
          <button
            type="button"
            onClick={loadTamilSample}
            className="px-3 py-1.5 text-xs font-medium text-red-800 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition-colors"
          >
            Sample Meeting (தமிழ்)
          </button>
        </div>
      </div>

      {uploadError && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Main Configuration Card */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
        {/* Title Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-800 mb-1.5">
            Meeting Title / Editorial Subject *
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Q4 Financial Review & EMEA Expansion Council"
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 transition-colors"
          />
        </div>

        {/* Language Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Source Spoken Language
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSourceLanguage('auto')}
                className={`py-2 px-2.5 text-xs rounded border transition-colors ${
                  sourceLanguage === 'auto'
                    ? 'border-red-600 bg-red-50 text-red-700 font-semibold'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                Auto-Detect
              </button>
              <button
                type="button"
                onClick={() => setSourceLanguage('en')}
                className={`py-2 px-2.5 text-xs rounded border transition-colors ${
                  sourceLanguage === 'en'
                    ? 'border-red-600 bg-red-50 text-red-700 font-semibold'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setSourceLanguage('ta')}
                className={`py-2 px-2.5 text-xs rounded border transition-colors ${
                  sourceLanguage === 'ta'
                    ? 'border-red-600 bg-red-50 text-red-700 font-semibold'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                தமிழ் (Tamil)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Target Report & Headline Language
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOutputLanguage('en')}
                className={`py-2 px-3 text-xs rounded border transition-colors ${
                  outputLanguage === 'en'
                    ? 'border-red-600 bg-red-50 text-red-700 font-semibold'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                English Broadsheet
              </button>
              <button
                type="button"
                onClick={() => setOutputLanguage('ta')}
                className={`py-2 px-3 text-xs rounded border transition-colors ${
                  outputLanguage === 'ta'
                    ? 'border-red-600 bg-red-50 text-red-700 font-semibold'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                தமிழ் அறிக்கை (Tamil)
              </button>
            </div>
          </div>
        </div>

        {/* Input Method Segmented Control */}
        <div className="pt-2">
          <label className="block text-xs font-semibold text-slate-800 mb-2">
            Ingestion Method
          </label>
          <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-lg max-w-sm">
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`flex-1 py-1.5 px-3 text-xs font-medium rounded transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'upload' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>Video / Audio (1 GiB)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('text')}
              className={`flex-1 py-1.5 px-3 text-xs font-medium rounded transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'text' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Transcript / Notes</span>
            </button>
          </div>
        </div>

        {/* TAB 1: FILE UPLOAD ZONE (1 GiB Support) */}
        {activeTab === 'upload' && (
          <div className="space-y-4 pt-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
              accept="video/mp4,video/quicktime,video/webm,video/mkv,audio/mp3,audio/wav,audio/m4a,audio/mpeg"
              className="hidden"
            />

            {!selectedFile ? (
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-red-500 rounded-lg p-10 text-center cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-all group"
              >
                <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="text-sm font-semibold text-slate-900">
                  Click to select meeting video or drag and drop
                </div>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Supports MP4, MOV, WebM, WAV, MP3, M4A up to 1 GiB (1,073,741,824 bytes). High-speed chunked stream upload.
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded bg-slate-900 text-white flex items-center justify-center shrink-0">
                      {selectedFile.type.includes('audio') ? <FileAudio className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900 truncate">
                        {selectedFile.name}
                      </div>
                      <div className="text-xs text-slate-500 font-mono-num">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · {selectedFile.type || 'Media file'}
                      </div>
                    </div>
                  </div>

                  {!isUploading && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setUploadProgress(null);
                        setUploadedMediaId(null);
                      }}
                      className="text-slate-400 hover:text-slate-600 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Upload Progress Bar & Stats */}
                {isUploading && uploadProgress && (
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">
                        Uploading chunk {uploadProgress.currentChunk} of {uploadProgress.totalChunks}
                      </span>
                      <span className="font-mono-num font-bold text-red-600">
                        {uploadProgress.percentage}%
                      </span>
                    </div>

                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-red-600 h-2 transition-all duration-200"
                        style={{ width: `${uploadProgress.percentage}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 font-mono-num">
                      <div>
                        {(uploadProgress.uploadedBytes / (1024 * 1024)).toFixed(1)} MB / {(uploadProgress.totalBytes / (1024 * 1024)).toFixed(1)} MB
                      </div>
                      <div className="flex items-center gap-3">
                        <span>{uploadProgress.speedMib} MiB/s</span>
                        <span>ETA: {uploadProgress.etaSeconds}s</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handlePauseResume}
                        className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 flex items-center gap-1"
                      >
                        {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                        <span>{isPaused ? 'Resume' : 'Pause'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelUpload}
                        className="px-2.5 py-1 text-xs font-medium text-red-700 bg-white border border-red-200 rounded hover:bg-red-50 flex items-center gap-1"
                      >
                        <X className="w-3 h-3" />
                        <span>Cancel Upload</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TEXT INPUT ZONE */}
        {activeTab === 'text' && (
          <div className="space-y-2 pt-2">
            <label className="block text-xs font-semibold text-slate-800">
              Meeting Dialogue Transcript / Discussion Notes *
            </label>
            <textarea
              rows={10}
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Paste raw transcript with speaker cues or unedited meeting notes here..."
              className="w-full p-3.5 text-xs font-mono bg-white border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 transition-colors leading-relaxed"
            />
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Supports raw verbatim notes, dialogue transcripts, and meeting minutes.</span>
              <span className="font-mono-num">{textContent.length} characters</span>
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isUploading || isProcessing}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleStartAnalysis}
            disabled={isUploading || isProcessing}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-semibold text-white bg-red-600 rounded hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50"
          >
            {isUploading ? (
              <span>Uploading Chunks ({uploadProgress?.percentage || 0}%)...</span>
            ) : isProcessing ? (
              <span>Processing News Analysis...</span>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate News Analysis</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* PROCESSING OVERLAY MODAL */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl border border-slate-200">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <RefreshCw className="w-6 h-6 animate-spin" />
              </div>
              <h3 className="text-xl font-editorial font-bold text-slate-900">
                Newsroom AI Processing In Progress
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Analyzing spoken dialogue, filtering confirmed decisions, and writing editorial headlines.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">{jobStage}</span>
                <span className="font-mono-num font-bold text-red-600">{jobProgress}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-red-600 h-2.5 transition-all duration-300"
                  style={{ width: `${jobProgress}%` }}
                />
              </div>
            </div>

            {/* Stages indicator */}
            <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
              <div className={`flex items-center gap-2 ${jobProgress >= 10 ? 'text-slate-900 font-semibold' : 'text-slate-400'}`}>
                <CheckCircle2 className={`w-3.5 h-3.5 ${jobProgress >= 10 ? 'text-emerald-600' : 'text-slate-300'}`} />
                <span>Media Ingestion & Validation</span>
              </div>
              <div className={`flex items-center gap-2 ${jobProgress >= 40 ? 'text-slate-900 font-semibold' : 'text-slate-400'}`}>
                <CheckCircle2 className={`w-3.5 h-3.5 ${jobProgress >= 40 ? 'text-emerald-600' : 'text-slate-300'}`} />
                <span>Multilingual Speech Transcription (EN & தமிழ்)</span>
              </div>
              <div className={`flex items-center gap-2 ${jobProgress >= 70 ? 'text-slate-900 font-semibold' : 'text-slate-400'}`}>
                <CheckCircle2 className={`w-3.5 h-3.5 ${jobProgress >= 70 ? 'text-emerald-600' : 'text-slate-300'}`} />
                <span>Decision Resolution & Semantic Analysis</span>
              </div>
              <div className={`flex items-center gap-2 ${jobProgress >= 90 ? 'text-slate-900 font-semibold' : 'text-slate-400'}`}>
                <CheckCircle2 className={`w-3.5 h-3.5 ${jobProgress >= 90 ? 'text-emerald-600' : 'text-slate-300'}`} />
                <span>Headline Synthesis & Broadsheet Dispatch</span>
              </div>
            </div>

            {jobError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{jobError}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
