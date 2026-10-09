import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAnalysisStats, deleteAnalysis, updateAnalysis, retryAnalysis } from '../lib/api';
import type { DashboardStats, Analysis } from '../types';
import { 
  Plus, 
  Video, 
  FileText, 
  Bookmark, 
  Clock, 
  ArrowRight, 
  Search, 
  ExternalLink, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  Copy,
  Check,
  Languages,
  RotateCcw
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
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      const data = await getAnalysisStats();
      setStats(data);
    } catch (err) {
      console.error('[Dashboard] Error fetching stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleCopyHeadline = (headline: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(headline);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleSave = async (analysis: Analysis, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateAnalysis(analysis.id, { isSaved: !analysis.isSaved });
      fetchStats();
    } catch (err) {
      console.error('[Dashboard] Failed to toggle save:', err);
    }
  };

  const handleRetry = async (analysis: Analysis, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await retryAnalysis(analysis.id);
      fetchStats();
    } catch (err: any) {
      alert(`Retry failed: ${err.message}`);
    }
  };

  const filteredRecent = stats?.recent.filter(item => {
    if (!searchQuery) return true;
    return (
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.headline?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }) || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Welcome & Action Banner */}
      <div className="bg-slate-900 text-white rounded-lg p-6 sm:p-8 border border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-red-400">
            <span>Newsroom Desk</span>
            <span aria-hidden="true">·</span>
            <span>Welcome, {user?.name}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-editorial font-bold text-white">
            Editorial Meeting Intelligence Center
          </h1>
          <p className="text-slate-300 text-sm max-w-xl">
            Ingest 1 GiB video meetings, extract verified decisions, and produce broadsheet-grade headlines in English and Tamil.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
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
          <div className="text-xs text-slate-500 mt-2">
            Recorded meetings processed
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
              Latest analyses generated from meeting recordings and transcripts
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search headlines or titles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-red-500 w-48 sm:w-64"
              />
            </div>
            <button
              onClick={onViewAllReports}
              className="text-xs font-semibold text-red-600 hover:text-red-700 whitespace-nowrap"
            >
              View All ({stats?.totalAnalyses ?? 0}) →
            </button>
          </div>
        </div>

        {/* List Content */}
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-500">
            Loading recent analyses...
          </div>
        ) : filteredRecent.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">No meeting reports yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Upload your first video meeting or paste meeting notes to generate journalistic headlines and summaries.
            </p>
            <button
              onClick={onNewAnalysis}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-red-600 rounded hover:bg-red-700 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create First Analysis</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredRecent.map((item) => (
              <div
                key={item.id}
                onClick={() => onOpenReport(item.id)}
                className="p-5 hover:bg-slate-50/80 transition-colors cursor-pointer group flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-semibold text-slate-700 uppercase">{item.sourceType}</span>
                    <span aria-hidden="true">·</span>
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-medium text-slate-600">
                      Output: {item.outputLanguage === 'ta' ? 'தமிழ் (Tamil)' : 'English'}
                    </span>
                    {item.processingStatus === 'completed' ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Ready</span>
                      </span>
                    ) : item.processingStatus === 'failed' ? (
                      <span className="inline-flex items-center gap-1 text-red-600 font-medium">
                        <AlertCircle className="w-3 h-3" />
                        <span>Failed</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-600 font-medium animate-pulse">
                        <Clock className="w-3 h-3" />
                        <span>Processing...</span>
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-editorial font-bold text-slate-900 group-hover:text-red-700 transition-colors truncate">
                    {item.headline || item.title}
                  </h3>

                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="text-slate-600">Meeting: {item.title}</span>
                    {item.fileName && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="truncate max-w-[200px]">{item.fileName}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => handleCopyHeadline(item.headline, item.id, e)}
                    title="Copy headline"
                    className="p-2 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors text-xs flex items-center gap-1"
                  >
                    {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={(e) => handleToggleSave(item, e)}
                    title={item.isSaved ? 'Remove from saved' : 'Save report'}
                    className={`p-2 rounded hover:bg-slate-100 transition-colors ${
                      item.isSaved ? 'text-red-600 fill-red-600' : 'text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${item.isSaved ? 'fill-current' : ''}`} />
                  </button>

                  {item.processingStatus === 'failed' && (
                    <button
                      onClick={(e) => handleRetry(item, e)}
                      title="Retry analysis"
                      className="px-2.5 py-1 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100 transition-colors flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Retry</span>
                    </button>
                  )}

                  <button
                    onClick={() => onOpenReport(item.id)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded hover:border-slate-300 hover:text-red-700 transition-colors flex items-center gap-1"
                  >
                    <span>View Report</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
