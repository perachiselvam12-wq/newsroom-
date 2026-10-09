import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Lock, Mail, User as UserIcon, AlertCircle, ArrowRight, Languages } from 'lucide-react';

interface SignUpPageProps {
  onSuccess: () => void;
  onNavigateToLogin: () => void;
}

export const SignUpPage: React.FC<SignUpPageProps> = ({ onSuccess, onNavigateToLogin }) => {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState<'en' | 'ta'>('en');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim() || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
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

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg border border-slate-200 shadow-sm">
        <div>
          <div className="w-12 h-12 rounded bg-red-600 text-white flex items-center justify-center font-editorial font-bold text-2xl mx-auto shadow-sm">
            N
          </div>
          <h2 className="mt-4 text-center text-2xl font-editorial font-bold text-slate-900">
            Create Newsroom Account
          </h2>
          <p className="mt-1 text-center text-xs text-slate-500">
            Start transforming video meetings into verified news headlines and executive summaries.
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

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Primary Output Language Preference
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
                <span>English (US/UK)</span>
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
              <span>Creating Journalist Profile...</span>
            ) : (
              <>
                <span>Complete Registration</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-200">
          Already have an existing account?{' '}
          <button
            onClick={onNavigateToLogin}
            className="font-semibold text-red-600 hover:text-red-700 transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
};
