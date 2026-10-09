import React, { useState, useEffect } from 'react';
import { 
  Copy, 
  Check, 
  Bookmark, 
  Download, 
  Edit3, 
  Trash2, 
  ArrowLeft, 
  FileText, 
  Video, 
  CheckCircle2, 
  AlertCircle, 
  Share2, 
  Printer, 
  Calendar, 
  User, 
  Clock, 
  Sparkles,
  ChevronDown,
  ChevronUp,
  Search,
  ExternalLink
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { 
  getAnalysis, 
  updateAnalysis, 
  deleteAnalysis, 
  getExportUrl, 
  getMediaUrl 
} from '../lib/api';
import { 
  getMeetingFromFirestore, 
  updateMeetingInFirestore, 
  deleteMeetingFromFirestore,
  saveMeetingToFirestore 
} from '../lib/firestoreService';
import { useAuth } from '../context/AuthContext';
import type { Analysis, AnalysisResult, ImportantPoint, ActionItem, DecisionItem } from '../types';

interface ResultsPageProps {
  analysisId: string;
  onBack: () => void;
  onDeleted: () => void;
}

export const ResultsPage: React.FC<ResultsPageProps> = ({ analysisId, onBack, onDeleted }) => {
  const { user } = useAuth();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editable title state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');

  // Selected alternative headline view
  const [selectedHeadStyle, setSelectedHeadStyle] = useState<'primary' | 'breaking' | 'newspaper' | 'formal' | 'digital' | 'social'>('primary');

  // Copy feedback states
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Category filter for points
  const [pointCategoryFilter, setPointCategoryFilter] = useState<string>('all');
  const [transcriptSearch, setTranscriptSearch] = useState('');

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchAnalysisData = async () => {
    try {
      setIsLoading(true);
      // Attempt to load from Firestore first
      const firestoreMeeting = await getMeetingFromFirestore(analysisId).catch(() => null);
      if (firestoreMeeting) {
        setAnalysis(firestoreMeeting);
        setTitleInput(firestoreMeeting.title);
        setIsLoading(false);
        return;
      }

      // Fallback to backend API
      const res = await getAnalysis(analysisId);
      setAnalysis(res.analysis);
      setTitleInput(res.analysis.title);

      // Cache to Firestore under current user if signed in
      if (user?.uid && res.analysis) {
        saveMeetingToFirestore({
          ...res.analysis,
          userId: user.uid,
          mediaType: res.analysis.sourceType || 'video',
          status: 'completed',
        }).catch(() => {});
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load analysis report.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysisData();
  }, [analysisId]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSaveToggle = async () => {
    if (!analysis) return;
    const nextSaved = !analysis.isSaved;
    try {
      // Update Firestore
      await updateMeetingInFirestore(analysis.id, { isSaved: nextSaved }).catch(() => {});
      const updated = await updateAnalysis(analysis.id, { isSaved: nextSaved }).catch(() => ({
        analysis: { ...analysis, isSaved: nextSaved }
      }));
      setAnalysis(updated.analysis);
    } catch (err: any) {
      console.error('Failed to toggle save:', err);
    }
  };

  const handleSaveTitle = async () => {
    if (!analysis || !titleInput.trim()) return;
    const newTitle = titleInput.trim();
    try {
      // Update Firestore
      await updateMeetingInFirestore(analysis.id, { title: newTitle }).catch(() => {});
      const updated = await updateAnalysis(analysis.id, { title: newTitle }).catch(() => ({
        analysis: { ...analysis, title: newTitle }
      }));
      setAnalysis(updated.analysis);
      setIsEditingTitle(false);
    } catch (err: any) {
      console.error('Failed to update title:', err);
    }
  };

  const handleSetPrimaryHeadline = async (headline: string) => {
    if (!analysis) return;
    try {
      // Update Firestore
      await updateMeetingInFirestore(analysis.id, { headline }).catch(() => {});
      const updated = await updateAnalysis(analysis.id, { headline }).catch(() => ({
        analysis: { ...analysis, headline }
      }));
      setAnalysis(updated.analysis);
      setSelectedHeadStyle('primary');
      copyToClipboard(headline, 'set-primary');
    } catch (err: any) {
      console.error('Failed to update headline:', err);
    }
  };

  const handleDelete = async () => {
    if (!analysis) return;
    try {
      setIsDeleting(true);
      // Delete from Firestore
      await deleteMeetingFromFirestore(analysis.id).catch(() => {});
      await deleteAnalysis(analysis.id).catch(() => {});
      onDeleted();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
      setIsDeleting(false);
    }
  };

  const handleExportPDF = () => {
    if (!analysis || !analysis.analysisResult) return;
    const ar = analysis.analysisResult;
    const doc = new jsPDF();
    
    // PDF Styling
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('NEWSROOM AI — EXECUTIVE MEETING BRIEFING', 14, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Subject: ${analysis.title}`, 14, 28);
    doc.text(`Date: ${new Date(analysis.createdAt).toLocaleDateString()} | Language: ${analysis.outputLanguage === 'ta' ? 'Tamil' : 'English'}`, 14, 34);

    doc.line(14, 38, 196, 38);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('PRIMARY HEADLINE:', 14, 46);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const headlineLines = doc.splitTextToSize(ar.primaryHeadline, 180);
    doc.text(headlineLines, 14, 53);

    let y = 53 + (headlineLines.length * 6) + 4;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('EXECUTIVE SUMMARY:', 14, y);
    y += 6;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const execLines = doc.splitTextToSize(ar.executiveSummary || ar.quickSummary, 180);
    doc.text(execLines, 14, y);
    y += (execLines.length * 5) + 8;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('CONFIRMED DECISIONS:', 14, y);
    y += 6;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    ar.decisions?.forEach((d, idx) => {
      const decText = `${idx + 1}. ${d.decision} (Context: ${d.context})`;
      const decLines = doc.splitTextToSize(decText, 180);
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(decLines, 14, y);
      y += (decLines.length * 5) + 3;
    });

    y += 4;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    if (y > 260) {
      doc.addPage();
      y = 20;
    }
    doc.text('ACTION ITEMS:', 14, y);
    y += 6;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    ar.actionItems?.forEach((a, idx) => {
      const actText = `• [${a.status}] ${a.task} | Owner: ${a.assignedTo} | Deadline: ${a.deadline}`;
      const actLines = doc.splitTextToSize(actText, 180);
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(actLines, 14, y);
      y += (actLines.length * 5) + 2;
    });

    doc.save(`${analysis.title.replace(/[^a-zA-Z0-9]/g, '_')}_briefing.pdf`);
  };

  const handleDownloadTranscript = () => {
    if (!analysis?.analysisResult?.transcriptSegments) return;
    let text = `TRANSCRIPT: ${analysis.title}\nDate: ${new Date(analysis.createdAt).toLocaleString()}\n\n`;
    analysis.analysisResult.transcriptSegments.forEach(seg => {
      text += `[${seg.timestamp}] ${seg.speaker}: ${seg.text}\n\n`;
    });
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${analysis.title}_transcript.txt`;
    a.click();
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center space-y-3">
        <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto animate-pulse">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="text-sm font-semibold text-slate-800">Loading editorial analysis...</div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 font-editorial">Report Unavailable</h2>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">{error || 'This report could not be found.'}</p>
        <button
          onClick={onBack}
          className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded hover:bg-slate-800"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const ar: AnalysisResult = analysis.analysisResult || {
    primaryHeadline: analysis.headline || analysis.title,
    alternativeHeadlines: {
      breaking: `ALERT: ${analysis.headline}`,
      newspaper: `${analysis.headline}: Key Decisions Unveiled`,
      formal: `Official Report: ${analysis.headline}`,
      digital: `${analysis.headline} — Full Breakdown`,
      social: `Takeaways: ${analysis.headline}`,
    },
    quickSummary: 'Analysis pending or not generated.',
    detailedSummary: 'No detailed summary available.',
    executiveSummary: 'No executive summary available.',
    importantPoints: [],
    decisions: [],
    actionItems: [],
    keyFacts: [],
    pendingQuestions: [],
    transcriptSegments: [],
  };

  const filteredPoints = ar.importantPoints?.filter(p => {
    if (pointCategoryFilter === 'all') return true;
    return p.category === pointCategoryFilter;
  }) || [];

  const filteredTranscript = ar.transcriptSegments?.filter(t => {
    if (!transcriptSearch) return true;
    return (
      t.text.toLowerCase().includes(transcriptSearch.toLowerCase()) ||
      t.speaker.toLowerCase().includes(transcriptSearch.toLowerCase())
    );
  }) || [];

  // Active headline to show
  const currentHeadline = selectedHeadStyle === 'primary' 
    ? ar.primaryHeadline 
    : (ar.alternativeHeadlines?.[selectedHeadStyle] || ar.primaryHeadline);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 print-page">
      {/* Top Navigation & Action Toolbar (no-print) */}
      <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {/* Save Bookmark */}
          <button
            onClick={handleSaveToggle}
            className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors flex items-center gap-1.5 ${
              analysis.isSaved
                ? 'bg-red-50 text-red-700 border-red-200 font-semibold'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${analysis.isSaved ? 'fill-current' : ''}`} />
            <span>{analysis.isSaved ? 'Saved to Library' : 'Save Report'}</span>
          </button>

          {/* Export PDF */}
          <button
            onClick={handleExportPDF}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export PDF</span>
          </button>

          {/* Export Markdown */}
          <a
            href={getExportUrl(analysis.id, 'md')}
            download
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Export Markdown</span>
          </a>

          {/* Export Plain Text */}
          <a
            href={getExportUrl(analysis.id, 'txt')}
            download
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors flex items-center gap-1.5"
          >
            <span>Plain Text</span>
          </a>

          {/* Print View */}
          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>

          {/* Delete Action */}
          <button
            onClick={() => setShowDeleteModal(true)}
            className="p-1.5 text-slate-400 hover:text-red-600 transition-colors rounded"
            title="Delete this analysis"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* METADATA STRIP */}
      <div className="bg-slate-100/70 p-4 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-900">Subject:</span>
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  className="px-2 py-0.5 text-xs bg-white border border-slate-300 rounded"
                />
                <button
                  onClick={handleSaveTitle}
                  className="px-2 py-0.5 bg-red-600 text-white rounded text-[11px] font-semibold"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsEditingTitle(false)}
                  className="text-slate-500 hover:text-slate-800 text-[11px]"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <span className="font-medium text-slate-900 flex items-center gap-1.5">
                {analysis.title}
                <button
                  onClick={() => setIsEditingTitle(true)}
                  className="text-slate-400 hover:text-slate-600 no-print"
                  title="Edit title"
                >
                  <Edit3 className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>

          <span aria-hidden="true" className="text-slate-300">|</span>

          <div>
            <span className="text-slate-500">Source:</span>{' '}
            <span className="font-semibold uppercase text-slate-700">{analysis.sourceType}</span>
            {analysis.fileName && <span className="text-slate-500 font-mono-num"> ({analysis.fileName})</span>}
          </div>

          <span aria-hidden="true" className="text-slate-300">|</span>

          <div>
            <span className="text-slate-500">Output Language:</span>{' '}
            <span className="font-semibold text-red-700">
              {analysis.outputLanguage === 'ta' ? 'தமிழ் (Tamil Broadsheet)' : 'English (Broadsheet)'}
            </span>
          </div>
        </div>

        <div className="text-slate-500 font-mono-num">
          {new Date(analysis.createdAt).toLocaleDateString()} {new Date(analysis.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* MEDIA STREAMER (IF VIDEO/AUDIO WAS UPLOADED) */}
      {analysis.mediaPath && (
        <div className="bg-slate-950 rounded-lg overflow-hidden border border-slate-800 no-print shadow-sm">
          <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs text-slate-300 flex items-center justify-between">
            <span className="font-semibold flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5 text-red-500" />
              <span>Meeting Recording Player</span>
            </span>
            <span className="text-slate-400 font-mono-num">
              {analysis.fileSize ? `${(analysis.fileSize / (1024 * 1024)).toFixed(1)} MB` : ''}
            </span>
          </div>
          <video
            controls
            className="w-full max-h-[360px] bg-black"
            src={getMediaUrl(analysis.id)}
          >
            Your browser does not support video playback.
          </video>
        </div>
      )}

      {/* 1. AI NEWS HEADLINE GENERATOR STATION */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="space-y-0.5">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-red-600">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI News Headline Generator</span>
            </div>
            <h2 className="text-sm text-slate-500">
              Select or copy stylistic editorial angles synthesized from the meeting
            </h2>
          </div>

          {/* Headline style tabs */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-medium no-print">
            <button
              onClick={() => setSelectedHeadStyle('primary')}
              className={`px-2.5 py-1 rounded transition-colors ${
                selectedHeadStyle === 'primary' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Primary Lead
            </button>
            <button
              onClick={() => setSelectedHeadStyle('breaking')}
              className={`px-2.5 py-1 rounded transition-colors ${
                selectedHeadStyle === 'breaking' ? 'bg-white text-red-700 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Breaking News
            </button>
            <button
              onClick={() => setSelectedHeadStyle('newspaper')}
              className={`px-2.5 py-1 rounded transition-colors ${
                selectedHeadStyle === 'newspaper' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Broadsheet
            </button>
            <button
              onClick={() => setSelectedHeadStyle('formal')}
              className={`px-2.5 py-1 rounded transition-colors ${
                selectedHeadStyle === 'formal' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Boardroom
            </button>
            <button
              onClick={() => setSelectedHeadStyle('digital')}
              className={`px-2.5 py-1 rounded transition-colors ${
                selectedHeadStyle === 'digital' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Digital Web
            </button>
            <button
              onClick={() => setSelectedHeadStyle('social')}
              className={`px-2.5 py-1 rounded transition-colors ${
                selectedHeadStyle === 'social' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Social Hook
            </button>
          </div>
        </div>

        {/* Display Box for Active Headline */}
        <div className="p-6 bg-slate-50/80 rounded-lg border border-slate-200/80 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-2xl sm:text-3xl font-editorial font-bold text-slate-900 leading-tight">
              "{currentHeadline}"
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-200/60 no-print">
            <button
              onClick={() => copyToClipboard(currentHeadline, 'headline')}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-xs"
            >
              {copiedKey === 'headline' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'headline' ? 'Copied to Clipboard' : 'Copy Headline'}</span>
            </button>

            {selectedHeadStyle !== 'primary' && (
              <button
                onClick={() => handleSetPrimaryHeadline(currentHeadline)}
                className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100 transition-colors flex items-center gap-1.5"
              >
                <span>Promote to Primary Headline</span>
              </button>
            )}
          </div>
        </div>

        {/* Alternative Headlines Drawer */}
        <div className="space-y-2 pt-2">
          <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
            All Alternative Angles (5 Styles)
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded border border-slate-200 bg-white space-y-1">
              <span className="font-semibold text-red-600 uppercase text-[10px]">Breaking Alert</span>
              <p className="text-slate-800 font-medium">{ar.alternativeHeadlines?.breaking}</p>
            </div>
            <div className="p-3 rounded border border-slate-200 bg-white space-y-1">
              <span className="font-semibold text-slate-700 uppercase text-[10px]">Broadsheet Broadsheet</span>
              <p className="text-slate-800 font-medium">{ar.alternativeHeadlines?.newspaper}</p>
            </div>
            <div className="p-3 rounded border border-slate-200 bg-white space-y-1">
              <span className="font-semibold text-slate-700 uppercase text-[10px]">Formal Boardroom</span>
              <p className="text-slate-800 font-medium">{ar.alternativeHeadlines?.formal}</p>
            </div>
            <div className="p-3 rounded border border-slate-200 bg-white space-y-1">
              <span className="font-semibold text-slate-700 uppercase text-[10px]">Digital Web</span>
              <p className="text-slate-800 font-medium">{ar.alternativeHeadlines?.digital}</p>
            </div>
            <div className="p-3 rounded border border-slate-200 bg-white space-y-1 md:col-span-2">
              <span className="font-semibold text-slate-700 uppercase text-[10px]">Social Hook</span>
              <p className="text-slate-800 font-medium">{ar.alternativeHeadlines?.social}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. SUMMARIES STRIP (Quick, Executive, Detailed) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Executive & Quick Briefing (Col 7) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Executive Summary */}
          <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 font-editorial">
                Executive Decision-Maker Briefing
              </h3>
              <button
                onClick={() => copyToClipboard(ar.executiveSummary, 'exec')}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 no-print"
              >
                {copiedKey === 'exec' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copy</span>
              </button>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed font-normal">
              {ar.executiveSummary}
            </p>
          </div>

          {/* Quick Summary */}
          <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 font-editorial">
                Quick Summary (3–5 Sentences)
              </h3>
              <button
                onClick={() => copyToClipboard(ar.quickSummary, 'quick')}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 no-print"
              >
                {copiedKey === 'quick' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copy</span>
              </button>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              {ar.quickSummary}
            </p>
          </div>

          {/* Detailed Summary */}
          <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-3 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 font-editorial">
              Detailed Narrative & Discussion Flow
            </h3>
            <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line space-y-3 font-normal">
              {ar.detailedSummary}
            </div>
          </div>
        </div>

        {/* Side Panel: Confirmed Decisions & Key Facts (Col 5) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Confirmed Decisions vs Suggestions */}
          <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 font-editorial">
                Confirmed Decisions Made
              </h3>
              <span className="text-xs font-semibold text-emerald-700 font-mono-num">
                {ar.decisions?.length || 0} Ratified
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Only binding resolutions explicitly confirmed by leadership (suggestions separated).
            </p>

            <div className="space-y-3">
              {ar.decisions && ar.decisions.length > 0 ? (
                ar.decisions.map((dec, idx) => (
                  <div key={dec.id || idx} className="p-3 rounded bg-emerald-50/50 border border-emerald-200/80 space-y-1">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-bold text-slate-900 leading-snug">
                          {dec.decision}
                        </div>
                        <div className="text-[11px] text-slate-600 mt-1">
                          {dec.context}
                        </div>
                        {dec.decidedBy && (
                          <div className="text-[10px] text-slate-500 mt-1 font-semibold">
                            Ratified by: {dec.decidedBy}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-400 p-3 italic">
                  No definitive binding decisions finalized during this meeting.
                </div>
              )}
            </div>
          </div>

          {/* Key Facts & Metrics Extraction */}
          <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-4 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 font-editorial">
              Key Facts, Numbers & Entities
            </h3>
            <div className="space-y-2 text-xs">
              {ar.keyFacts && ar.keyFacts.length > 0 ? (
                ar.keyFacts.map((kf, idx) => (
                  <div key={kf.id || idx} className="p-2.5 rounded border border-slate-200 bg-slate-50 flex items-start gap-2">
                    <span className="px-1.5 py-0.5 bg-slate-200 text-slate-800 text-[10px] font-semibold rounded shrink-0">
                      {kf.category}
                    </span>
                    <div className="min-w-0">
                      <span className="font-bold text-slate-900">{kf.item}</span>
                      <span className="text-slate-600 block mt-0.5">{kf.context}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-400 italic">No isolated entities found.</div>
              )}
            </div>
          </div>

          {/* Unresolved Questions */}
          {ar.pendingQuestions && ar.pendingQuestions.length > 0 && (
            <div className="bg-amber-50/60 rounded-lg border border-amber-200 p-6 space-y-3">
              <h3 className="text-sm font-bold text-amber-900 font-editorial">
                Unresolved Questions & Pending Follow-Ups
              </h3>
              <ul className="space-y-1.5 text-xs text-amber-900/90 list-disc list-inside">
                {ar.pendingQuestions.map((q, idx) => (
                  <li key={idx} className="leading-relaxed">{q}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* 3. IMPORTANT POINTS EXTRACTION (Categorized & Ranked) */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-red-600">
              <span>Prioritized Takeaways</span>
            </div>
            <h2 className="text-xl font-editorial font-bold text-slate-900 mt-0.5">
              Important Points Extraction ({ar.importantPoints?.length || 0})
            </h2>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 no-print">
            <span className="text-xs text-slate-500">Filter Category:</span>
            <select
              value={pointCategoryFilter}
              onChange={(e) => setPointCategoryFilter(e.target.value)}
              className="px-2.5 py-1 text-xs bg-white border border-slate-300 rounded font-medium text-slate-700"
            >
              <option value="all">All Categories</option>
              <option value="Main Announcements">Main Announcements</option>
              <option value="Important Facts & Figures">Important Facts & Figures</option>
              <option value="Key Discussions">Key Discussions</option>
              <option value="Decisions Made">Decisions Made</option>
              <option value="Problems Identified">Problems Identified</option>
              <option value="Proposed Solutions">Proposed Solutions</option>
              <option value="Future Plans">Future Plans</option>
              <option value="Action Items">Action Items</option>
              <option value="Pending Issues">Pending Issues</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPoints.length > 0 ? (
            filteredPoints.map((pt, idx) => (
              <div
                key={pt.id || idx}
                className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-slate-700">{pt.category}</span>
                  <span
                    className={`font-semibold ${
                      pt.importance === 'High'
                        ? 'text-red-700'
                        : pt.importance === 'Medium'
                        ? 'text-amber-700'
                        : 'text-slate-600'
                    }`}
                  >
                    {pt.importance} Priority
                  </span>
                </div>

                <h4 className="text-sm font-bold text-slate-900 leading-snug">
                  {pt.title}
                </h4>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {pt.explanation}
                </p>

                {(pt.speaker || pt.timestamp) && (
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1 border-t border-slate-200/60 font-mono-num">
                    {pt.speaker && <span>Speaker: {pt.speaker}</span>}
                    {pt.timestamp && <span>Timestamp: {pt.timestamp}</span>}
                  </div>
                )}

                {pt.excerpt && (
                  <div className="text-[11px] italic text-slate-500 border-l-2 border-slate-300 pl-2">
                    "{pt.excerpt}"
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="col-span-2 text-center py-6 text-xs text-slate-400">
              No points matched this category filter.
            </div>
          )}
        </div>
      </div>

      {/* 4. ACTION ITEMS MATRIX */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 sm:p-8 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-editorial font-bold text-slate-900">
              Action Items & Accountabilities
            </h2>
            <p className="text-xs text-slate-500">
              Explicit tasks assigned with deadlines. Owners not stated are labeled "Not specified".
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-700 font-mono-num">
            {ar.actionItems?.length || 0} Tasks Assigned
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold border-b border-slate-200 text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Task Description</th>
                <th className="py-2.5 px-3">Assigned Owner</th>
                <th className="py-2.5 px-3">Stated Deadline</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Source Ref</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ar.actionItems && ar.actionItems.length > 0 ? (
                ar.actionItems.map((act, idx) => (
                  <tr key={act.id || idx} className="hover:bg-slate-50/60">
                    <td className="py-3 px-3 font-medium text-slate-900 max-w-sm">
                      {act.task}
                    </td>
                    <td className="py-3 px-3 text-slate-700">
                      {act.assignedTo || 'Not specified'}
                    </td>
                    <td className="py-3 px-3 text-slate-700 font-mono-num">
                      {act.deadline || 'Not specified'}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                        {act.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500 font-mono-num">
                      {act.timestamp || 'N/A'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400 italic">
                    No explicit action items assigned during this discussion.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. VERBATIM SYNCHRONIZED TRANSCRIPT VIEWER */}
      {ar.transcriptSegments && ar.transcriptSegments.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 sm:p-8 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xl font-editorial font-bold text-slate-900">
                Spoken Dialogue Transcript
              </h2>
              <p className="text-xs text-slate-500">
                Synchronized speech segments with speaker attribution and timestamps
              </p>
            </div>

            <div className="flex items-center gap-3 no-print">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search transcript text..."
                  value={transcriptSearch}
                  onChange={(e) => setTranscriptSearch(e.target.value)}
                  className="pl-8 pr-3 py-1 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-red-500 w-48"
                />
              </div>

              <button
                onClick={handleDownloadTranscript}
                className="px-3 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .txt</span>
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-3 pr-2 divide-y divide-slate-100">
            {filteredTranscript.map((seg, idx) => (
              <div key={seg.id || idx} className="pt-3 first:pt-0 flex items-start gap-4 text-xs">
                <div className="w-20 shrink-0 font-mono-num text-[11px] text-slate-400">
                  {seg.timestamp}
                </div>
                <div className="w-28 shrink-0 font-semibold text-slate-800 truncate">
                  {seg.speaker}
                </div>
                <div className="flex-1 text-slate-700 leading-relaxed font-normal">
                  {seg.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 font-editorial">
              Delete Analysis & Media?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              This will permanently delete this analysis, headlines, generated summaries, and associated uploaded video files. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded transition-colors"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Deletion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
