import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Lock, Mail, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { resetPassword } from '../lib/api';

interface LoginPageProps {
  onSuccess: () => void;
  onNavigateToSignUp: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess, onNavigateToSignUp }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password reset modal state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetNewPass, setResetNewPass] = useState('');
  const [resetStatus, setResetStatus] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Please provide both email and password.');
      return;
    }

    try {
      setIsLoading(true);
      await login(email.trim(), password);
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillSampleAccount = () => {
    setEmail('editor@newsroom.ai');
    setPassword('newsroom123');
    setError(null);
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail || !resetNewPass) return;
    try {
      setResetLoading(true);
      setResetStatus(null);
      await resetPassword(resetEmail.trim(), resetNewPass);
      setResetStatus('Password successfully updated. You can now log in.');
      setEmail(resetEmail);
      setPassword(resetNewPass);
      setTimeout(() => setShowResetModal(false), 2000);
    } catch (err: any) {
      setResetStatus(`Reset failed: ${err.message}`);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg border border-slate-200 shadow-sm">
        <div>
          <div className="w-12 h-12 rounded bg-red-600 text-white flex items-center justify-center font-editorial font-bold text-2xl mx-auto shadow-sm">
            N
          </div>
          <h2 className="mt-4 text-center text-2xl font-editorial font-bold text-slate-900">
            Sign In to Newsroom AI
          </h2>
          <p className="mt-1 text-center text-xs text-slate-500">
            Access your meeting transcripts, editorial reports, and headline drafts.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="editor@newsroom.ai"
                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 transition-colors"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Password
              </label>
              <button
                type="button"
                onClick={() => {
                  setResetEmail(email);
                  setShowResetModal(true);
                }}
                className="text-xs text-red-600 hover:text-red-700 transition-colors"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-10 py-2 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Pre-fill */}
        <div className="pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={fillSampleAccount}
            className="w-full py-2 px-3 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 transition-colors text-center"
          >
            Fill Sample Journalist Account (<span className="font-mono">editor@newsroom.ai</span>)
          </button>
        </div>

        <div className="text-center text-xs text-slate-500">
          Don't have an account yet?{' '}
          <button
            onClick={onNavigateToSignUp}
            className="font-semibold text-red-600 hover:text-red-700 transition-colors"
          >
            Register New Account
          </button>
        </div>
      </div>

      {/* Password Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 font-editorial">Reset Password</h3>
            <p className="text-xs text-slate-500">Enter your account email and choose a new password.</p>
            
            {resetStatus && (
              <div className="p-2 bg-slate-100 text-xs text-slate-700 rounded">
                {resetStatus}
              </div>
            )}

            <form onSubmit={handleResetSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={resetNewPass}
                  onChange={(e) => setResetNewPass(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 rounded hover:bg-red-700"
                >
                  {resetLoading ? 'Updating...' : 'Set Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
