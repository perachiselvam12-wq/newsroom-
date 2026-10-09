import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  subscribeUserMeetings, 
  updateMeetingInFirestore, 
  deleteMeetingFromFirestore, 
  seedDemoMeetingForUser 
} from '../lib/firestoreService';
import { updateAnalysis, retryAnalysis } from '../lib/api';
import type { DashboardStats, Meeting } from '../types';
import { 
  Plus, 
  Video, 
  FileText, 
  Bookmark, 
  Clock, 
  ArrowRight, 
  Search, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  Copy,
  Check,
  Languages,
  RotateCcw,
  Sparkles,
  Database
} from 'lucide-react';

interface DashboardPageProps {
  onNewAnalysis: () => void;
  onOpenReport: (id: string) => void;
  onViewAllReports: () => void;
  onViewSaved: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNewAnalysis,
  onOpenReport,
  onViewAllReports,
  onViewSaved
}) => {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    // Real-time Firestore query scoped to current authenticated user: where('userId', '==', user.uid)
    const unsubscribe = subscribeUserMeetings(user.uid, (data) => {
      setMeetings(data);
      const totalAnalyses = data.length;
      const videosAnalyzed = data.filter(m => (m.mediaType || m.sourceType) === 'video').length;
      const savedReports = data.filter(m => m.isSaved).length;
      setStats({
        totalAnalyses,
        videosAnalyzed,
        savedReports,
        recent: data.slice(0, 8),
      });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const showNotification = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 3000);
  };

  const handleCopyHeadline = (headline: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(headline);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    showNotification('Headline copied to clipboard');
  };

  const handleToggleSave = async (meeting: Meeting, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const nextSaved = !meeting.isSaved;
      await updateMeetingInFirestore(meeting.id, { isSaved: nextSaved });
      updateAnalysis(meeting.id, { isSaved: nextSaved }).catch(() => {});
      showNotification(nextSaved ? 'Meeting saved to bookmarks' : 'Meeting removed from bookmarks');
    } catch (err: any) {
      console.error('[Dashboard] Failed to toggle save:', err);
    }
  };

  const handleDeleteMeeting = async (meetingId: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Delete meeting analysis "${title}" from Firestore?`)) return;
    try {
      await deleteMeetingFromFirestore(meetingId);
      showNotification('Meeting record deleted from Firestore');
    } catch (err: any) {
      console.error('[Dashboard] Failed to delete meeting:', err);
    }
  };

  const handleSeedSampleMeeting = async () => {
    if (!user?.uid) return;
    try {
      setIsSeeding(true);
      await seedDemoMeetingForUser(user.uid);
      showNotification('Sample newsroom briefing imported to Firestore');
    } catch (err: any) {
      alert(`Failed to import sample: ${err.message}`);
    } finally {
      setIsSeeding(false);
    }
  };

  const filteredRecent = meetings.filter(item => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.headline?.toLowerCase().includes(q) ||
      item.headlines?.primary?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Toast Feedback */}
      {actionFeedback && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 border border-slate-700 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Top Welcome & Action Banner */}
      <div className="bg-slate-900 text-white rounded-lg p-6 sm:p-8 border border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-red-400">
            <span>Newsroom Desk</span>
            <span aria-hidden="true">·</span>
            <span>Welcome, {user?.name || user?.fullName || 'Journalist'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-editorial font-bold text-white">
            Editorial Meeting Intelligence Center
          </h1>
          <p className="text-slate-300 text-sm max-w-xl">
            Ingest 1 GiB video meetings, extract verified decisions, and produce broadsheet-grade headlines in English and Tamil with Cloud Firestore persistence.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <button
            onClick={onNewAnalysis}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-red-600 rounded hover:bg-red-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Meeting Analysis</span>
          </button>
        </div>
      </div>

      {/* Real Statistics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Total Analyses
          </div>
          <div className="text-3xl font-bold text-slate-900 font-mono-num">
            {isLoading ? '—' : stats?.totalAnalyses ?? 0}
          </div>
          <div className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span>Synced in Cloud Firestore</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Videos Analyzed
          </div>
          <div className="text-3xl font-bold text-slate-900 font-mono-num">
            {isLoading ? '—' : stats?.videosAnalyzed ?? 0}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            MP4, MOV, WebM uploads
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Saved Reports
          </div>
          <div className="text-3xl font-bold text-slate-900 font-mono-num">
            {isLoading ? '—' : stats?.savedReports ?? 0}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            Bookmarked for editorial review
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Languages Active
          </div>
          <div className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <span>EN</span>
            <span className="text-slate-300 font-light">/</span>
            <span className="text-red-700">தமிழ்</span>
          </div>
          <div className="text-xs text-slate-500 mt-2">
            Bilingual speech & headline pipeline
          </div>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 font-editorial">
              Recent Meeting Dispatches
            </h2>
            <p className="text-xs text-slate-500">
              Live updates directly from your private Firestore collection.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search headlines or titles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
            <button
              onClick={onViewAllReports}
              className="text-xs font-semibold text-red-600 hover:text-red-700 whitespace-nowrap flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* List of Recent Items */}
        {isLoading ? (
          <div className="p-12 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
            <span>Fetching real-time meetings from Cloud Firestore...</span>
          </div>
        ) : filteredRecent.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Video className="w-6 h-6" />
            </div>
            <div className="max-w-sm mx-auto space-y-1">
              <p className="text-sm font-semibold text-slate-900">
                {searchQuery ? 'No meetings matched your search' : 'No meeting analyses recorded yet'}
              </p>
              <p className="text-xs text-slate-500">
                Upload a meeting video or paste notes to generate news headlines and executive reports.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={onNewAnalysis}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded transition-colors"
              >
                Upload First Video
              </button>
              <button
                onClick={handleSeedSampleMeeting}
                disabled={isSeeding}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 transition-colors flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>{isSeeding ? 'Importing...' : 'Load Sample Editorial Meeting'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredRecent.map((meeting) => {
              const headlineText =
                meeting.headlines?.primary ||
                meeting.headline ||
                meeting.analysisResult?.primaryHeadline ||
                'Analysis Processing...';
              const isVideo = (meeting.mediaType || meeting.sourceType) === 'video';

              return (
                <div
                  key={meeting.id}
                  onClick={() => onOpenReport(meeting.id)}
                  className="p-5 hover:bg-slate-50 transition-colors cursor-pointer group flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[11px]">
                        {isVideo ? <Video className="w-3 h-3 text-red-600" /> : <FileText className="w-3 h-3 text-blue-600" />}
                        <span className="capitalize">{meeting.mediaType || meeting.sourceType}</span>
                      </span>

                      <span className="text-slate-300">·</span>
                      <span className="inline-flex items-center gap-1 font-mono-num">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{new Date(meeting.createdAt).toLocaleDateString()}</span>
                      </span>

                      <span className="text-slate-300">·</span>
                      <span className="text-[11px] font-semibold text-slate-600 uppercase">
                        {meeting.outputLanguage === 'ta' ? 'தமிழ்' : 'English'}
                      </span>

                      {meeting.status === 'completed' && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Verified</span>
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-slate-900 group-hover:text-red-700 transition-colors font-editorial line-clamp-1">
                      {headlineText}
                    </h3>

                    <p className="text-xs text-slate-600 line-clamp-2">
                      {meeting.shortSummary || meeting.analysisResult?.quickSummary || meeting.title}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <button
                      onClick={(e) => handleCopyHeadline(headlineText, meeting.id, e)}
                      title="Copy headline"
                      className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                    >
                      {copiedId === meeting.id ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>

                    <button
                      onClick={(e) => handleToggleSave(meeting, e)}
                      title={meeting.isSaved ? 'Remove bookmark' : 'Bookmark report'}
                      className={`p-2 rounded transition-colors ${
                        meeting.isSaved
                          ? 'text-red-600 bg-red-50 hover:bg-red-100'
                          : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Bookmark className="w-4 h-4 fill-current" />
                    </button>

                    <button
                      onClick={(e) => handleDeleteMeeting(meeting.id, meeting.title, e)}
                      title="Delete from Firestore"
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <span className="text-xs font-semibold text-slate-700 group-hover:text-red-600 pl-2 flex items-center gap-1">
                      <span>Open Briefing</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
