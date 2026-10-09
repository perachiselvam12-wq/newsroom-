import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  getUserMeetingsFromFirestore, 
  updateMeetingInFirestore, 
  deleteMeetingFromFirestore 
} from '../lib/firestoreService';
import { updateAnalysis, getExportUrl } from '../lib/api';
import type { Meeting } from '../types';
import { Bookmark, Search, ArrowRight, FileText, Download, Trash2, CheckCircle2, Video } from 'lucide-react';

interface SavedReportsPageProps {
  onOpenReport: (id: string) => void;
  onNewAnalysis: () => void;
}

export const SavedReportsPage: React.FC<SavedReportsPageProps> = ({ onOpenReport, onNewAnalysis }) => {
  const { user } = useAuth();
  const [reports, setReports] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchSaved = async () => {
    if (!user?.uid) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const data = await getUserMeetingsFromFirestore(user.uid, {
        savedOnly: true,
        search: search || undefined
      });
      setReports(data);
    } catch (err) {
      console.error('[Saved] Error fetching saved reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSaved();
  }, [user?.uid, search]);

  const handleUnsave = async (item: Meeting, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateMeetingInFirestore(item.id, { isSaved: false });
      updateAnalysis(item.id, { isSaved: false }).catch(() => {});
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
            Bookmarked meeting briefings, ratified decisions, and verified headline drafts stored in Cloud Firestore.
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
          <div className="p-16 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
            <span>Fetching saved reports from Firestore...</span>
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
            {reports.map((item) => {
              const headline = item.headlines?.primary || item.headline || item.title;
              const isVideo = (item.mediaType || item.sourceType) === 'video';

              return (
                <div
                  key={item.id}
                  onClick={() => onOpenReport(item.id)}
                  className="p-5 hover:bg-slate-50 transition-colors cursor-pointer group flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium capitalize">
                        {isVideo ? <Video className="w-3 h-3 text-red-600" /> : <FileText className="w-3 h-3 text-blue-600" />}
                        {item.mediaType || item.sourceType}
                      </span>
                      <span>·</span>
                      <span className="font-mono-num">{new Date(item.createdAt).toLocaleDateString()}</span>
                      <span>·</span>
                      <span className="uppercase font-semibold">{item.outputLanguage === 'ta' ? 'தமிழ்' : 'English'}</span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 group-hover:text-red-700 transition-colors font-editorial line-clamp-1">
                      {headline}
                    </h3>

                    <p className="text-xs text-slate-600 line-clamp-2">
                      {item.shortSummary || item.title}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end md:self-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => handleUnsave(item, e)}
                      title="Remove bookmark"
                      className="p-2 text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded transition-colors"
                    >
                      <Bookmark className="w-4 h-4 fill-current" />
                    </button>

                    <button
                      onClick={() => onOpenReport(item.id)}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors flex items-center gap-1"
                    >
                      <span>Read Briefing</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
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
