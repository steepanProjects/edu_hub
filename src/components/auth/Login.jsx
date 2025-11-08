import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, GraduationCap, Sun, Moon, Info } from 'lucide-react';
import About from '../About';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, loginWithGoogle, resetPassword, resendVerificationEmail } = useAuth();
  const [unverified, setUnverified] = useState(false);
  const navigate = useNavigate();
  
  const [isDark, setIsDark] = useState(() => typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : false);
  const [showAbout, setShowAbout] = useState(false);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', next);
    }
    try { localStorage.setItem('theme', next ? 'dark' : 'light'); } catch {}
  };

  const handleResendVerification = async () => {
    setError('');
    setLoading(true);
    try {
      await resendVerificationEmail();
      alert('Verification email resent. Please check your inbox.');
    } catch (e) {
      setError(e?.message || 'Failed to resend verification email');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const cred = await login(email, password);
      setLoading(false);
      if (cred?.user?.emailVerified) {
        navigate('/dashboard');
      } else {
        setUnverified(true);
        setError('Please verify your email. We have sent you a verification link.');
      }
    } catch (_) {
      setLoading(false);
      setError('Invalid email or password.');
    }
  };

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      const cred = await loginWithGoogle();
      setLoading(false);
      if (cred?.user?.emailVerified !== false) {
        navigate('/dashboard');
      } else {
        setUnverified(true);
        setError('Please verify your email.');
      }
    } catch (e) {
      setLoading(false);
      setError(e?.message || 'Google sign-in failed');
    }
  };

  const handleReset = async () => {
    if (!email) return setError('Enter your email to reset password.');
    setError('');
    setLoading(true);
    try {
      await resetPassword(email);
      alert('Password reset email sent. Check your inbox.');
    } catch (e) {
      setError(e?.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 py-12 px-4 relative overflow-x-hidden dark:from-neutral-900 dark:to-neutral-950">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-full bg-white text-gray-800 shadow hover:bg-gray-100 dark:bg-neutral-800 dark:text-gray-100 dark:hover:bg-neutral-700"
          aria-label="Toggle dark mode"
          title="Toggle theme"
        >
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        <button
          type="button"
          onClick={() => setShowAbout(true)}
          className="p-2 rounded-full bg-white text-gray-800 shadow hover:bg-gray-100 dark:bg-neutral-800 dark:text-gray-100 dark:hover:bg-neutral-700"
          aria-label="About this app"
          title="About"
        >
          <Info className="h-5 w-5" />
        </button>
      </div>
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-primary-600 rounded-full flex items-center justify-center">
            <GraduationCap className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-gray-100">
            Welcome to EduHub
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Sign in to your account</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="appearance-none rounded-none relative block w-full px-10 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-neutral-800 dark:border-neutral-700 dark:text-gray-100 dark:placeholder-gray-500"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                className="appearance-none rounded-none relative block w-full px-10 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-neutral-800 dark:border-neutral-700 dark:text-gray-100 dark:placeholder-gray-500"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <Eye className="h-5 w-5 text-gray-400" />
                ) : (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
              {error}
            </div>
          )}

          {unverified && (
            <div className="text-center">
              <button
                type="button"
                onClick={handleResendVerification}
                className="text-sm text-primary-600 hover:text-primary-500"
                disabled={loading}
              >
                Resend verification email
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>

          <div className="mt-3">
            <button
              type="button"
              onClick={handleGoogle}
              disabled={loading}
              className="w-full py-3 px-4 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:bg-neutral-800 dark:text-gray-100 dark:border-neutral-700 dark:hover:bg-neutral-700 flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-5 w-5">
                <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.915 31.91 29.345 35 24 35c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.869 5.053 29.702 3 24 3 12.955 3 4 11.955 4 23s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.651-.389-3.917z"/>
                <path fill="#FF3D00" d="M6.306 14.691l6.571 4.818C14.483 16.108 18.9 13 24 13c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.869 5.053 29.702 3 24 3 16.318 3 9.656 7.337 6.306 14.691z"/>
                <path fill="#4CAF50" d="M24 43c5.271 0 10.073-2.021 13.682-5.318l-6.318-5.318C29.305 33.99 26.791 35 24 35c-5.317 0-9.877-3.402-11.49-8.129l-6.59 5.081C8.164 38.556 15.48 43 24 43z"/>
                <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-1.357 3.91-5.927 7-11.303 7-5.317 0-9.877-3.402-11.49-8.129l-6.59 5.081C8.164 38.556 15.48 43 24 43c8.837 0 20-6.5 20-20 0-1.341-.138-2.651-.389-3.917z"/>
              </svg>
              Continue with Google
            </button>
          </div>

          <div className="text-center mt-3">
            <button
              type="button"
              onClick={handleReset}
              className="text-sm text-primary-600 hover:text-primary-500"
              disabled={loading}
            >
              Forgot password?
            </button>
          </div>

          <p className="text-center text-sm text-gray-600 dark:text-gray-300">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => navigate('/signup')}
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              Sign up
            </button>
          </p>
        </form>
      </div>

      {showAbout && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-neutral-900 rounded-lg max-w-md w-full p-6 shadow-xl ring-1 ring-gray-200 dark:ring-neutral-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">About Lets Connect</h3>
              <button onClick={() => setShowAbout(false)} className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100">✕</button>
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300"><About /></div>
            <div className="mt-4 text-right">
              <button onClick={() => setShowAbout(false)} className="px-3 py-2 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-neutral-700 dark:text-gray-100 dark:hover:bg-neutral-800">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
