import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, User, Mail, Lock, GraduationCap, Sun, Moon, Info, Check } from 'lucide-react';
import { api } from '../../api/client';
import About from '../About';
 

export default function Signup() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(() => typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : false);
  const [showAbout, setShowAbout] = useState(false);
  const [emailVerifyLoading, setEmailVerifyLoading] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  useEffect(() => {
    if (otpCooldown <= 0) return;
    const t = setInterval(() => {
      setOtpCooldown((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [otpCooldown]);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', next);
    }
    try { localStorage.setItem('theme', next ? 'dark' : 'light'); } catch {}
  };

  function handleChange(e) {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    if (e.target.name === 'email') {
      setOtpVerified(false);
      setShowOtpInput(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!otpVerified) {
      return setError('Please verify your email before creating an account.');
    }
    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match');
    }

    if (formData.password.length < 6) {
      return setError('Password must be at least 6 characters');
    }

    try {
      setError('');
      setLoading(true);
      const userCredential = await signup(formData.email, formData.password, formData.fullName);
      // Insert user into Supabase users table
      const { user } = userCredential;
      if (user) {
        await supabase.from('users').upsert({
          id: user.uid,
          email: formData.email,
          full_name: formData.fullName,
        });
      }
      navigate('/dashboard');
    } catch (error) {
      setError('Failed to create an account. Email might already be in use.');
      console.error('Signup error:', error);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 py-12 px-4 sm:px-6 lg:px-8 relative overflow-x-hidden dark:from-neutral-900 dark:to-neutral-950">
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
            Join EduHub
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Create your account to get started
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="fullName"
                name="fullName"
                type="text"
                autoComplete="name"
                required
                className="appearance-none relative block w-full px-10 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-neutral-800 dark:border-neutral-700 dark:text-gray-100 dark:placeholder-gray-500"
                placeholder="Full name"
                value={formData.fullName}
                onChange={handleChange}
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none relative block w-full px-10 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-neutral-800 dark:border-neutral-700 dark:text-gray-100 dark:placeholder-gray-500"
                placeholder="Email address"
                value={formData.email}
                onChange={handleChange}
                readOnly={otpVerified}
              />
              <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-2">
                {otpVerified && <Check className="h-5 w-5 text-green-600" aria-label="Email verified" />}
                <button
                  type="button"
                  onClick={async () => {
                    if (!formData.email) return setError('Email is required');
                    setError('');
                    setOtpSending(true);
                    try {
                      await api.post('/api/auth/request-email-otp', { email: formData.email });
                      setShowOtpInput(true);
                      setOtpCooldown(60);
                    } catch (e) {
                      setError(e?.message || 'Failed to send OTP');
                    } finally {
                      setOtpSending(false);
                    }
                  }}
                  disabled={otpSending || !formData.email || otpVerified}
                  className="px-2 py-1 text-xs rounded border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 disabled:opacity-50 dark:bg-neutral-800 dark:border-neutral-700 dark:hover:bg-neutral-700 dark:text-gray-100"
                  title="Send verification code"
                >
                  {otpSending ? '...' : 'Verify'}
                </button>
              </div>
            </div>

            {showOtpInput && !otpVerified && (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="Enter 6-digit code"
                  className="mt-2 min-w-0 w-full sm:flex-1 px-3 py-2 border border-gray-300 rounded-md dark:bg-neutral-800 dark:border-neutral-700 dark:text-gray-100"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!otp || otp.length !== 6) return setError('Enter the 6-digit code');
                    setError('');
                    setEmailVerifyLoading(true);
                    try {
                      await api.post('/api/auth/verify-email-otp', { email: formData.email, code: otp });
                      setOtpVerified(true);
                      setShowOtpInput(false);
                    } catch (e) {
                      setError(e?.message || 'Invalid or expired code');
                    } finally {
                      setEmailVerifyLoading(false);
                    }
                  }}
                  disabled={emailVerifyLoading}
                  className="mt-2 w-full sm:w-auto px-3 py-2 text-xs rounded-md bg-primary-600 text-white disabled:opacity-50"
                >
                  {emailVerifyLoading ? 'Verifying...' : 'Verify code'}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (otpCooldown > 0) return;
                    setError('');
                    setOtpSending(true);
                    try {
                      await api.post('/api/auth/request-email-otp', { email: formData.email });
                      setOtpCooldown(60);
                    } catch (e) {
                      setError(e?.message || 'Failed to resend');
                    } finally {
                      setOtpSending(false);
                    }
                  }}
                  disabled={otpSending || otpCooldown > 0}
                  className="mt-2 w-full sm:w-auto px-3 py-2 text-xs rounded-md border border-gray-300 text-gray-800 dark:border-neutral-700 disabled:opacity-50 dark:text-gray-100"
                >
                  {otpCooldown > 0 ? `Resend in ${otpCooldown}s` : 'Resend OTP'}
                </button>
              </div>
            )}

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                className="appearance-none relative block w-full px-10 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-neutral-800 dark:border-neutral-700 dark:text-gray-100 dark:placeholder-gray-500"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                className="appearance-none relative block w-full px-10 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-neutral-800 dark:border-neutral-700 dark:text-gray-100 dark:placeholder-gray-500"
                placeholder="Confirm password"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>

            
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading || !otpVerified}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : (otpVerified ? 'Create account' : 'Verify email to continue')}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="font-medium text-primary-600 hover:text-primary-500"
              >
                Sign in
              </button>
            </p>
          </div>
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
