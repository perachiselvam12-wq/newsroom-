import React, { useState, useEffect } from 'react';
import { getAnalyses, updateAnalysis, getExportUrl } from '../lib/api';
import type { Analysis } from '../types';
import { Bookmark, Search, ArrowRight, FileText, Download, Trash2, CheckCircle2 } from 'lucide-react';

interface SavedReportsPageProps {
  onOpenReport: (id: string) => void;
  onNewAnalysis: () => void;
}

export const SavedReportsPage: React.FC<SavedReportsPageProps> = ({ onOpenReport, onNewAnalysis }) => {
  const [reports, setReports] = useState<Analysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchSaved = async () => {
    try {
      setIsLoading(true);
      const res = await getAnalyses({
        savedOnly: true,
        search: search || undefined
      });
      setReports(res.analyses);
    } catch (err) {
      console.error('[Saved] Error fetching saved reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSaved();
  }, [search]);

  const handleUnsave = async (item: Analysis, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateAnalysis(item.id, { isSaved: false });
      fetchSaved();
    } catch (err) {
      console.error('Failed to unsave:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="border-b border-slate-200 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-red-600 mb-1">
            Curated Library
          </div>
          <h1 className="text-2xl sm:text-3xl font-editorial font-bold text-slate-900">
            Saved Editorial Reports
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Bookmarked meeting briefings, ratified decisions, and verified headline drafts.
          </p>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search saved reports..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-red-500 w-64 shadow-xs"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-16 text-center text-xs text-slate-500">
            Loading saved reports...
          </div>
        ) : reports.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Bookmark className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">No saved reports in your library</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Click the bookmark icon on any meeting analysis to pin it to your editorial library.
            </p>
            <button
              onClick={onNewAnalysis}
              className="px-4 py-2 text-xs font-semibold text-white bg-red-600 rounded hover:bg-red-700"
            >
              Analyze New Meeting
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {reports.map((item) => (
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
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Ready</span>
                    </span>
                  </div>

                  <h3 className="text-base font-editorial font-bold text-slate-900 group-hover:text-red-700 transition-colors truncate">
                    {item.headline || item.title}
                  </h3>

                  <div className="text-xs text-slate-500 truncate">
                    Subject: <span className="text-slate-700 font-medium">{item.title}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <a
                    href={getExportUrl(item.id, 'md')}
                    download
                    title="Export Markdown"
                    className="p-2 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>

                  <button
                    onClick={(e) => handleUnsave(item, e)}
                    title="Remove from saved"
                    className="p-2 text-red-600 hover:text-red-700 rounded hover:bg-slate-100 transition-colors"
                  >
                    <Bookmark className="w-3.5 h-3.5 fill-current" />
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
      </div>
    </div>
  );
};
