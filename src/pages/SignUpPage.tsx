import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Lock, Mail, User as UserIcon, AlertCircle, ArrowRight, ShieldAlert } from 'lucide-react';
import { firebaseConfig } from '../lib/firebase';

interface SignUpPageProps {
  onSuccess: () => void;
  onNavigateToLogin: () => void;
}

export const SignUpPage: React.FC<SignUpPageProps> = ({ onSuccess, onNavigateToLogin }) => {
  const { register, loginWithGoogle } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState<'en' | 'ta'>('en');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please provide your full name.');
      return;
    }
    if (!email.trim()) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Please enter a password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    try {
      setIsLoading(true);
      await register(name.trim(), email.trim(), password, preferredLanguage);
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError(null);
    try {
      setIsLoading(true);
      await loginWithGoogle();
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Google sign-up failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-lg border border-slate-200 shadow-sm">
        <div>
          <div className="w-12 h-12 rounded bg-red-600 text-white flex items-center justify-center font-editorial font-bold text-2xl mx-auto shadow-sm">
            N
          </div>
          <h2 className="mt-4 text-center text-2xl font-editorial font-bold text-slate-900">
            Create Newsroom Account
          </h2>
          <p className="mt-1 text-center text-xs text-slate-500">
            Sign up with Firebase to save meetings, generated headlines, and verified summaries.
          </p>
        </div>

        {error && (
          <div className="space-y-2">
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-medium leading-relaxed block">{error}</span>
              </div>
            </div>

            {error.includes('auth/unauthorized-domain') && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-slate-800 text-xs rounded space-y-2">
                <div className="flex items-center gap-1.5 font-semibold text-amber-900">
                  <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Domain Authorization Guide</span>
                </div>
                <div className="bg-white p-2.5 rounded border border-amber-200 font-mono text-[11px] space-y-1 text-slate-700">
                  <div><strong className="text-slate-900">Current Domain:</strong> {typeof window !== 'undefined' ? window.location.hostname : 'newsroom-jade.vercel.app'}</div>
                  <div><strong className="text-slate-900">Firebase Project:</strong> {firebaseConfig.projectId}</div>
                  <div><strong className="text-slate-900">Configured authDomain:</strong> {firebaseConfig.authDomain}</div>
                </div>
                <div className="text-[11px] text-slate-600 space-y-1">
                  <p className="font-semibold text-slate-800">Resolution Checklist:</p>
                  <ol className="list-decimal list-inside space-y-0.5">
                    <li>Open <strong>Firebase Console</strong> and choose project <code className="text-red-700 bg-red-50 px-1 py-0.5 rounded font-mono">{firebaseConfig.projectId}</code>.</li>
                    <li>Go to <strong>Build &gt; Authentication &gt; Settings &gt; Authorized domains</strong>.</li>
                    <li>Confirm that <code className="text-red-700 bg-red-50 px-1 py-0.5 rounded font-mono">{typeof window !== 'undefined' ? window.location.hostname : 'newsroom-jade.vercel.app'}</code> is listed.</li>
                    <li>In your <strong>Vercel Project Settings &gt; Environment Variables</strong>, set <code className="text-red-700 bg-red-50 px-1 py-0.5 rounded font-mono">VITE_FIREBASE_PROJECT_ID={firebaseConfig.projectId}</code> and redeploy.</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        )}

        <form className="space-y-3.5" onSubmit={handleSubmit}>
          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Full Name
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sarah Chen"
                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 transition-colors"
              />
            </div>
          </div>

          {/* Email Address */}
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
                placeholder="sarah.chen@newsroom.org"
                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 transition-colors"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Password (min. 6 characters)
            </label>
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

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-10 py-2 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Language Preference */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Output Language Preference
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPreferredLanguage('en')}
                className={`py-2 px-3 text-xs font-medium rounded border transition-colors flex items-center justify-center gap-1.5 ${
                  preferredLanguage === 'en'
                    ? 'border-red-600 bg-red-50 text-red-700 font-semibold'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>English (Newsroom)</span>
              </button>
              <button
                type="button"
                onClick={() => setPreferredLanguage('ta')}
                className={`py-2 px-3 text-xs font-medium rounded border transition-colors flex items-center justify-center gap-1.5 ${
                  preferredLanguage === 'ta'
                    ? 'border-red-600 bg-red-50 text-red-700 font-semibold'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>தமிழ் (Tamil)</span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
          >
            {isLoading ? (
              <span>Registering with Firebase...</span>
            ) : (
              <>
                <span>Complete Registration</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-slate-400 font-medium">Or continue with</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignUp}
          disabled={isLoading}
          className="w-full py-2 px-3 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 rounded border border-slate-300 transition-colors flex items-center justify-center gap-2 shadow-sm"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Sign up with Google</span>
        </button>

        <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-200">
          Already have an account?{' '}
          <button
            onClick={onNavigateToLogin}
            className="font-semibold text-red-600 hover:text-red-700 transition-colors"
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
};
