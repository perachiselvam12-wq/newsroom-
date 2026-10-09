import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { SignUpPage } from './pages/SignUpPage';
import { DashboardPage } from './pages/DashboardPage';
import { NewAnalysisPage } from './pages/NewAnalysisPage';
import { ResultsPage } from './pages/ResultsPage';
import { HistoryPage } from './pages/HistoryPage';
import { SavedReportsPage } from './pages/SavedReportsPage';
import { SettingsPage } from './pages/SettingsPage';

function AppContent() {
  const { user, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('landing');
  const [activeAnalysisId, setActiveAnalysisId] = useState<string | null>(null);

  // Synchronize initial state based on auth status
  useEffect(() => {
    if (!isLoading) {
      if (user) {
        if (currentTab === 'landing' || currentTab === 'login' || currentTab === 'signup') {
          setCurrentTab('dashboard');
        }
      } else {
        if (['dashboard', 'new-analysis', 'results', 'history', 'saved', 'settings'].includes(currentTab)) {
          setCurrentTab('landing');
        }
      }
    }
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded bg-red-600 flex items-center justify-center font-editorial font-bold text-xl animate-pulse">
            N
          </div>
          <span className="text-xs font-semibold text-slate-300">Loading Newsroom AI...</span>
        </div>
      </div>
    );
  }

  const handleOpenReport = (id: string) => {
    setActiveAnalysisId(id);
    setCurrentTab('results');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      <Header currentTab={currentTab} onNavigate={(tab) => setCurrentTab(tab)} />

      <main className="flex-1">
        {currentTab === 'landing' && (
          <LandingPage
            onGetStarted={() => setCurrentTab(user ? 'new-analysis' : 'signup')}
            onLogin={() => setCurrentTab('login')}
          />
        )}

        {currentTab === 'login' && (
          <LoginPage
            onSuccess={() => setCurrentTab('dashboard')}
            onNavigateToSignUp={() => setCurrentTab('signup')}
          />
        )}

        {currentTab === 'signup' && (
          <SignUpPage
            onSuccess={() => setCurrentTab('dashboard')}
            onNavigateToLogin={() => setCurrentTab('login')}
          />
        )}

        {currentTab === 'dashboard' && user && (
          <DashboardPage
            onNewAnalysis={() => setCurrentTab('new-analysis')}
            onOpenReport={handleOpenReport}
            onViewAllReports={() => setCurrentTab('history')}
            onViewSaved={() => setCurrentTab('saved')}
          />
        )}

        {currentTab === 'new-analysis' && user && (
          <NewAnalysisPage
            onAnalysisReady={(id) => handleOpenReport(id)}
            onCancel={() => setCurrentTab('dashboard')}
          />
        )}

        {currentTab === 'results' && user && activeAnalysisId && (
          <ResultsPage
            analysisId={activeAnalysisId}
            onBack={() => setCurrentTab('dashboard')}
            onDeleted={() => {
              setActiveAnalysisId(null);
              setCurrentTab('dashboard');
            }}
          />
        )}

        {currentTab === 'history' && user && (
          <HistoryPage
            onOpenReport={handleOpenReport}
            onNewAnalysis={() => setCurrentTab('new-analysis')}
          />
        )}

        {currentTab === 'saved' && user && (
          <SavedReportsPage
            onOpenReport={handleOpenReport}
            onNewAnalysis={() => setCurrentTab('new-analysis')}
          />
        )}

        {currentTab === 'settings' && user && (
          <SettingsPage />
        )}
      </main>

      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
