import React, { useState, useEffect } from 'react';
import { getAnalyses, deleteAnalysis, updateAnalysis } from '../lib/api';
import type { Analysis } from '../types';
import { 
  Search, 
  Filter, 
  Trash2, 
  Bookmark, 
  ArrowRight, 
  Video, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  ArrowUpDown,
  FileAudio
} from 'lucide-react';

interface HistoryPageProps {
  onOpenReport: (id: string) => void;
  onNewAnalysis: () => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ onOpenReport, onNewAnalysis }) => {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters & Search
  const [search, setSearch] = useState('');
  const [sourceType, setSourceType] = useState('');
  const [language, setLanguage] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Deletion modal
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchList = async () => {
    try {
      setIsLoading(true);
      const res = await getAnalyses({
        search: search || undefined,
        sourceType: sourceType || undefined,
        language: language || undefined,
        sort,
        page,
        limit: 10
      });
      setAnalyses(res.analyses);
      setTotalPages(res.pagination.totalPages);
      setTotalCount(res.pagination.total);
    } catch (err) {
      console.error('[History] Fetch failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [search, sourceType, language, sort, page]);

  const handleToggleSave = async (item: Analysis, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateAnalysis(item.id, { isSaved: !item.isSaved });
      fetchList();
    } catch (err) {
      console.error('Toggle save failed:', err);
    }
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteAnalysis(deletingId);
      setDeletingId(null);
      fetchList();
    } catch (err: any) {
      alert(`Deletion failed: ${err.message}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="border-b border-slate-200 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-red-600 mb-1">
            Archive & Dispatches
          </div>
          <h1 className="text-2xl sm:text-3xl font-editorial font-bold text-slate-900">
            All Meeting Analyses
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Search, filter, and inspect previous meeting reports and headline digests.
          </p>
        </div>

        <button
          onClick={onNewAnalysis}
          className="px-4 py-2 text-xs font-semibold text-white bg-red-600 rounded hover:bg-red-700 transition-colors shadow-sm self-start sm:self-auto"
        >
          + New Analysis
        </button>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
        {/* Search */}
        <div className="lg:col-span-2 relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search titles, headlines, or content..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>

        {/* Source Type Filter */}
        <div>
          <select
            value={sourceType}
            onChange={(e) => {
              setSourceType(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded font-medium text-slate-700"
          >
            <option value="">All Source Types</option>
            <option value="video">Video Uploads</option>
            <option value="audio">Audio Uploads</option>
            <option value="text">Transcript Notes</option>
          </select>
        </div>

        {/* Language Filter */}
        <div>
          <select
            value={language}
            onChange={(e) => {
              setLanguage(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded font-medium text-slate-700"
          >
            <option value="">All Languages</option>
            <option value="en">English Output</option>
            <option value="ta">Tamil Output (தமிழ்)</option>
          </select>
        </div>

        {/* Sort */}
        <div>
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as 'newest' | 'oldest');
              setPage(1);
            }}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded font-medium text-slate-700"
          >
            <option value="newest">Sort: Newest First</option>
            <option value="oldest">Sort: Oldest First</option>
          </select>
        </div>
      </div>

      {/* LIST OR EMPTY STATE */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-16 text-center text-xs text-slate-500">
            Loading reports archive...
          </div>
        ) : analyses.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">No matching reports found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try adjusting your search criteria or create a new meeting analysis.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {analyses.map((item) => (
              <div
                key={item.id}
                onClick={() => onOpenReport(item.id)}
                className="p-5 hover:bg-slate-50/80 transition-colors cursor-pointer group flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-semibold text-slate-700 uppercase">{item.sourceType}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-num">{new Date(item.createdAt).toLocaleDateString()}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-medium text-red-700">
                      Output: {item.outputLanguage === 'ta' ? 'தமிழ்' : 'English'}
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

                  <div className="text-xs text-slate-500 truncate">
                    Meeting Subject: <span className="text-slate-700 font-medium">{item.title}</span>
                    {item.fileName && <span> · File: {item.fileName}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => handleToggleSave(item, e)}
                    title={item.isSaved ? 'Saved to library' : 'Save report'}
                    className={`p-2 rounded hover:bg-slate-100 transition-colors ${
                      item.isSaved ? 'text-red-600 fill-red-600' : 'text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${item.isSaved ? 'fill-current' : ''}`} />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingId(item.id);
                    }}
                    title="Delete report"
                    className="p-2 text-slate-400 hover:text-red-600 rounded hover:bg-slate-100 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onOpenReport(item.id)}
                    className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded hover:border-slate-300 hover:text-red-700 transition-colors flex items-center gap-1 shadow-xs"
                  >
                    <span>Open Report</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PAGINATION STRIP */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600 font-mono-num">
            <div>
              Showing page {page} of {totalPages} ({totalCount} total)
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-3 py-1 bg-white border border-slate-200 rounded disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="px-3 py-1 bg-white border border-slate-200 rounded disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 font-editorial">Confirm Deletion</h3>
            <p className="text-xs text-slate-600">
              Are you sure you want to delete this meeting analysis and all associated media files?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingId(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-red-600 rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
