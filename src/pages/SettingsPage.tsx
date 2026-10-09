import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Languages, Shield, LogOut, Check, HardDrive, Key } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, updateUserPreferences, logout } = useAuth();
  const [name, setName] = useState(user?.fullName || user?.name || '');
  const [preferredLanguage, setPreferredLanguage] = useState<'en' | 'ta'>(user?.preferredLanguage || 'en');
  const [isSaved, setIsSaved] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsUpdating(true);
      await updateUserPreferences({
        name: name.trim(),
        preferredLanguage,
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="border-b border-slate-200 pb-5">
        <div className="text-xs font-semibold uppercase tracking-wider text-red-600 mb-1">
          Preferences & Account
        </div>
        <h1 className="text-2xl sm:text-3xl font-editorial font-bold text-slate-900">
          Newsroom Settings
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Configure default headline languages, editorial profile, and security preferences.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 font-editorial border-b border-slate-100 pb-3 flex items-center gap-2">
          <User className="w-4 h-4 text-slate-700" />
          <span>Journalist Profile</span>
        </h2>

        {isSaved && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Profile and language preferences updated successfully.</span>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-4 max-w-lg">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address (Login Identity)
            </label>
            <input
              type="email"
              disabled
              value={user?.email || ''}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded text-slate-500 cursor-not-allowed font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Default Output Report Language
            </label>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setPreferredLanguage('en')}
                className={`p-3 rounded border text-left transition-colors ${
                  preferredLanguage === 'en'
                    ? 'border-red-600 bg-red-50/60 text-red-900'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="font-semibold text-xs">English Broadsheet</div>
                <div className="text-[11px] text-slate-500 mt-0.5">International English journalism</div>
              </button>

              <button
                type="button"
                onClick={() => setPreferredLanguage('ta')}
                className={`p-3 rounded border text-left transition-colors ${
                  preferredLanguage === 'ta'
                    ? 'border-red-600 bg-red-50/60 text-red-900'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="font-semibold text-xs">தமிழ் அறிக்கை (Tamil)</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Tamil language newsroom output</div>
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isUpdating}
              className="px-4 py-2 text-xs font-semibold text-white bg-red-600 rounded hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50"
            >
              {isUpdating ? 'Saving Changes...' : 'Save Profile Preferences'}
            </button>
          </div>
        </form>
      </div>

      {/* STORAGE & INGESTION STATS */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 sm:p-8 space-y-4 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 font-editorial border-b border-slate-100 pb-3 flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-slate-700" />
          <span>Storage & Ingestion Invariants</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3 rounded bg-slate-50 border border-slate-200">
            <div className="text-slate-500 font-semibold mb-1">Max Upload Limit</div>
            <div className="text-lg font-bold text-slate-900 font-mono-num">1 GiB</div>
            <div className="text-[11px] text-slate-500 mt-0.5">1,073,741,824 bytes per media file</div>
          </div>

          <div className="p-3 rounded bg-slate-50 border border-slate-200">
            <div className="text-slate-500 font-semibold mb-1">Chunk Streaming</div>
            <div className="text-lg font-bold text-slate-900 font-mono-num">5 MiB</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Chunked parallel upload with resume</div>
          </div>

          <div className="p-3 rounded bg-slate-50 border border-slate-200">
            <div className="text-slate-500 font-semibold mb-1">Data Privacy</div>
            <div className="text-lg font-bold text-emerald-700">Private Isolated</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Zero public exposure of recordings</div>
          </div>
        </div>
      </div>

      {/* SESSION & SIGN OUT */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 sm:p-8 space-y-4 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 font-editorial border-b border-slate-100 pb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-slate-700" />
          <span>Session & Authentication</span>
        </h2>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-800">Sign Out of Current Session</div>
            <div className="text-xs text-slate-500">End active session on this device.</div>
          </div>

          <button
            onClick={logout}
            className="px-4 py-2 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100 transition-colors flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
