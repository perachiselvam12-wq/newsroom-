import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Sparkles, Bookmark, Settings, LogOut, Plus, Newspaper, History, BarChart3 } from 'lucide-react';

interface HeaderProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, onNavigate }) => {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <button 
          onClick={() => onNavigate(user ? 'dashboard' : 'landing')}
          className="flex items-center gap-2.5 text-left text-lg font-bold tracking-tight text-white hover:text-red-400 transition-colors whitespace-nowrap shrink-0 group"
        >
          <span className="w-8 h-8 rounded bg-red-600 text-white flex items-center justify-center font-editorial font-bold text-lg shadow-sm">
            N
          </span>
          <span className="font-editorial tracking-normal text-xl font-bold">Newsroom AI</span>
        </button>

        {/* Zone 2: 4-5 clean single-line text navigation links */}
        {user ? (
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300">
            <button
              onClick={() => onNavigate('dashboard')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
                currentTab === 'dashboard' ? 'text-white border-b-2 border-red-500 font-semibold' : ''
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => onNavigate('new-analysis')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
                currentTab === 'new-analysis' ? 'text-white border-b-2 border-red-500 font-semibold' : ''
              }`}
            >
              New Analysis
            </button>
            <button
              onClick={() => onNavigate('history')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
                currentTab === 'history' ? 'text-white border-b-2 border-red-500 font-semibold' : ''
              }`}
            >
              All Reports
            </button>
            <button
              onClick={() => onNavigate('saved')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
                currentTab === 'saved' ? 'text-white border-b-2 border-red-500 font-semibold' : ''
              }`}
            >
              Saved
            </button>
            <button
              onClick={() => onNavigate('settings')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
                currentTab === 'settings' ? 'text-white border-b-2 border-red-500 font-semibold' : ''
              }`}
            >
              Settings
            </button>
          </nav>
        ) : (
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-white transition-colors whitespace-nowrap shrink-0">Capabilities</a>
            <a href="#workflow" className="hover:text-white transition-colors whitespace-nowrap shrink-0">How It Works</a>
            <a href="#languages" className="hover:text-white transition-colors whitespace-nowrap shrink-0">Languages (EN & தமிழ்)</a>
            <a href="#security" className="hover:text-white transition-colors whitespace-nowrap shrink-0">Security & Privacy</a>
          </nav>
        )}

        {/* Zone 3: 1 primary action or user session */}
        <div className="flex items-center gap-3 shrink-0">
          {user ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => onNavigate('new-analysis')}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-red-600 rounded hover:bg-red-700 transition-colors whitespace-nowrap shrink-0 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Analysis</span>
              </button>
              
              <div className="flex items-center gap-2 pl-2 border-l border-slate-700">
                <button
                  onClick={() => onNavigate('settings')}
                  title="Account Settings"
                  className="flex items-center gap-2 text-xs text-slate-300 hover:text-white px-2 py-1 rounded transition-colors"
                >
                  <span className="w-7 h-7 rounded-full bg-slate-700 text-slate-200 flex items-center justify-center font-medium text-xs border border-slate-600">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="hidden lg:inline text-xs font-medium max-w-[120px] truncate">{user.name}</span>
                </button>
                <button
                  onClick={logout}
                  title="Sign Out"
                  className="p-1.5 text-slate-400 hover:text-red-400 transition-colors rounded"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={() => onNavigate('login')}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-200 hover:text-white transition-colors whitespace-nowrap shrink-0"
              >
                Log In
              </button>
              <button
                onClick={() => onNavigate('signup')}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 rounded hover:bg-red-700 transition-colors whitespace-nowrap shrink-0 shadow-sm"
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
