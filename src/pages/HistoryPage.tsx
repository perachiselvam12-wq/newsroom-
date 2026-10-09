import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  getUserMeetingsFromFirestore, 
  updateMeetingInFirestore, 
  deleteMeetingFromFirestore 
} from '../lib/firestoreService';
import { getAnalyses, deleteAnalysis, updateAnalysis } from '../lib/api';
import type { Meeting } from '../types';
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
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters & Search
  const [search, setSearch] = useState('');
  const [sourceType, setSourceType] = useState('');
  const [language, setLanguage] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');

  // Deletion modal
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchList = async () => {
    if (!user?.uid) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      // Fetch directly from Firestore with user-scoped filter
      const data = await getUserMeetingsFromFirestore(user.uid, {
        search: search || undefined,
        sourceType: sourceType || undefined,
        language: language || undefined,
      });

      // Sort
      const sorted = [...data].sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return sort === 'newest' ? timeB - timeA : timeA - timeB;
      });

      setMeetings(sorted);
    } catch (err) {
      console.error('[History] Fetch failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [user?.uid, search, sourceType, language, sort]);

  const handleToggleSave = async (item: Meeting, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const nextSaved = !item.isSaved;
      await updateMeetingInFirestore(item.id, { isSaved: nextSaved });
      updateAnalysis(item.id, { isSaved: nextSaved }).catch(() => {});
      fetchList();
    } catch (err) {
      console.error('Toggle save failed:', err);
    }
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteMeetingFromFirestore(deletingId);
      deleteAnalysis(deletingId).catch(() => {});
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
            Private Firestore collection for {user?.name || 'Journalist'}. Search, filter, and inspect previous meeting reports.
          </p>
        </div>

        <button
          onClick={onNewAnalysis}
          className="px-4 py-2 text-xs font-semibold text-white bg-red-600 rounded hover:bg-red-700 transition-colors shadow-sm self-start sm:self-auto"
        >
          New Meeting Analysis
        </button>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search headline or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>

        <div>
          <select
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-red-500"
          >
            <option value="">All Source Types</option>
            <option value="video">Video Uploads</option>
            <option value="audio">Audio Uploads</option>
            <option value="text">Transcript / Text</option>
          </select>
        </div>

        <div>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-red-500"
          >
            <option value="">All Output Languages</option>
            <option value="en">English (EN)</option>
            <option value="ta">Tamil (தமிழ்)</option>
          </select>
        </div>

        <div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as any)}
            className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-red-500"
          >
            <option value="newest">Sort: Most Recent</option>
            <option value="oldest">Sort: Oldest First</option>
          </select>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-16 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
            <span>Querying Cloud Firestore meetings...</span>
          </div>
        ) : meetings.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Filter className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-slate-800">No meeting reports found</p>
            <p className="text-xs text-slate-500">Try modifying your filter parameters or start a new analysis.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Meeting Title & Headline</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Language</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {meetings.map((item) => {
                  const headlineText = item.headlines?.primary || item.headline || item.analysisResult?.primaryHeadline || item.title;
                  const isVideo = (item.mediaType || item.sourceType) === 'video';

                  return (
                    <tr
                      key={item.id}
                      onClick={() => onOpenReport(item.id)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 max-w-md">
                        <div className="font-semibold text-slate-900 group-hover:text-red-700 transition-colors line-clamp-1 font-editorial text-sm">
                          {headlineText}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {item.title}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          {isVideo ? <Video className="w-3 h-3 text-red-600" /> : <FileText className="w-3 h-3 text-blue-600" />}
                          <span className="capitalize">{item.mediaType || item.sourceType}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-[11px] font-semibold text-slate-700">
                          {item.outputLanguage === 'ta' ? 'தமிழ்' : 'English'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Complete</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 font-mono-num text-[11px]">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => handleToggleSave(item, e)}
                            title={item.isSaved ? 'Unsave' : 'Save'}
                            className={`p-1.5 rounded transition-colors ${
                              item.isSaved ? 'text-red-600 bg-red-50' : 'text-slate-400 hover:text-slate-700'
                            }`}
                          >
                            <Bookmark className="w-3.5 h-3.5 fill-current" />
                          </button>

                          <button
                            onClick={() => setDeletingId(item.id)}
                            title="Delete"
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onOpenReport(item.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded transition-colors"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 font-editorial">Confirm Deletion</h3>
            <p className="text-xs text-slate-600">
              Are you sure you want to delete this meeting dispatch from Firestore? This action is permanent.
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
                className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 rounded hover:bg-red-700"
              >
                Delete Dispatch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
