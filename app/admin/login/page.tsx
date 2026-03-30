'use client';

import { FormEvent, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Lock, Mail, User, UserPlus } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<'login' | 'create'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'sub-admin' | 'editor'>('editor');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  useEffect(() => {
    setIsLoggedIn(localStorage.getItem('adminAuth') === 'true');
  }, []);

  useEffect(() => {
    const modeFromQuery = searchParams.get('mode');
    const tokenFromQuery = searchParams.get('token');

    if (modeFromQuery === 'reset' && tokenFromQuery) {
      setMode('login');
      setShowForgotPassword(false);
      setResetToken(tokenFromQuery);
    }
  }, [searchParams]);
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { strength: 0, label: '', color: '' };
    if (pwd.length < 8) return { strength: 1, label: 'Weak', color: 'text-red-500' };
    if (pwd.length < 12) return { strength: 2, label: 'Fair', color: 'text-yellow-500' };
    if (/[A-Z]/.test(pwd) && /[0-9]/.test(pwd) && /[^A-Za-z0-9]/.test(pwd)) {
      return { strength: 4, label: 'Strong', color: 'text-green-500' };
    }
    return { strength: 3, label: 'Good', color: 'text-green-400' };
  };

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const passwordStrength = getPasswordStrength(password);
  const isEmailValid = email.length > 0 ? isValidEmail(email) : true;

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      setIsLoading(false);
      return;
    }

    if (password.length < 1) {
      setError('Please enter your password');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/admin/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase(), password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem('adminAuth', 'true');
        localStorage.setItem('adminEmail', data.user?.email || email);
        localStorage.setItem('adminRole', data.user?.role || 'editor');
        localStorage.setItem('adminName', data.user?.name || 'Admin');
        router.push('/admin/articles');
      } else {
        setError(data.message || 'Invalid email or password. Please try again.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      setIsLoading(false);
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      setIsLoading(false);
      return;
    }

    if (name.trim().length < 2) {
      setError('Please enter a valid name');
      setIsLoading(false);
      return;
    }

    try {
      const currentAdminEmail = localStorage.getItem('adminEmail') || '';

      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(currentAdminEmail && { 'x-admin-email': currentAdminEmail }),
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.toLowerCase(),
          password,
          role,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(`User "${data.user?.name}" created successfully as ${role}. You can now log in.`);
        setMode('login');
        setPassword('');
        setName('');
        setEmail('');
        setRole('editor');
      } else if (response.status === 401) {
        setError('Admin authentication required. Please log in first, then create users from Admin → Users management page.');
      } else {
        setError(data.message || 'Failed to create user. Please try again.');
      }
    } catch (error) {
      console.error('User creation error:', error);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestPasswordReset = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/admin/password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request', email: email.toLowerCase() }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        setError(data.message || 'Failed to send reset link.');
      } else {
        setSuccess(data.message || 'Reset link sent. Check your email.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmPasswordReset = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      setIsLoading(false);
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/admin/password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm', token: resetToken, password: newPassword }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        setError(data.message || 'Failed to reset password.');
      } else {
        setSuccess('Password changed successfully. You can now log in.');
        setResetToken('');
        setNewPassword('');
        setConfirmNewPassword('');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-black flex items-center justify-center px-3 sm:px-4">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-2xl p-5 sm:p-8 max-w-md w-full">
        <div className="flex justify-center mb-6">
          <div className="bg-red-600 p-3 rounded-full">
            <Lock className="w-6 h-6 text-white" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-center mb-2 text-slate-900 dark:text-white">
          Admin Access
        </h1>
        <p className="text-center text-slate-600 dark:text-slate-400 mb-8">
          {resetToken
            ? 'Set a new password for your admin account'
            : mode === 'login'
            ? 'Enter your credentials to access the admin panel'
            : 'Create a new admin or editor account'}
        </p>

        {!resetToken && (
        <div className="grid grid-cols-2 gap-2 mb-6 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setShowForgotPassword(false);
              setError('');
              setSuccess('');
              setPassword('');
            }}
            className={`px-3 py-2 text-sm font-semibold rounded-md transition-colors ${
              mode === 'login'
                ? 'bg-red-600 text-white'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('create');
              setShowForgotPassword(false);
              setError('');
              setSuccess('');
              setPassword('');
            }}
            className={`px-3 py-2 text-sm font-semibold rounded-md transition-colors ${
              mode === 'create'
                ? 'bg-red-600 text-white'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Create User
          </button>
        </div>
        )}

        <form
          onSubmit={
            resetToken
              ? handleConfirmPasswordReset
              : showForgotPassword
              ? handleRequestPasswordReset
              : mode === 'login'
              ? handleLogin
              : handleCreateUser
          }
          className="space-y-4"
        >
          {!resetToken && mode === 'create' && (
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter full name"
                  className="w-full px-4 py-2 pl-10 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                  disabled={isLoading}
                  required
                />
              </div>
            </div>
          )}

          {!resetToken && (
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className={`w-full px-4 py-2 pl-10 border rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 transition-all ${
                  email && !isEmailValid
                    ? 'border-red-400 dark:border-red-500 focus:ring-red-600'
                    : 'border-slate-300 dark:border-slate-600 focus:ring-red-600'
                }`}
                disabled={isLoading}
                required
              />
              {email && !isEmailValid && (
                <p className="mt-1 text-xs text-red-500">Invalid email format</p>
              )}
            </div>
          </div>
          )}

          {!resetToken && !showForgotPassword && (
          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'login' ? 'Enter your password' : 'Create password (min 8 chars)'}
                className="w-full px-4 py-2 pr-11 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                disabled={isLoading}
                required
                minLength={mode === 'create' ? 8 : undefined}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {mode === 'create' && password && (
              <div className="mt-2 space-y-1">
                <div className="flex gap-1">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        i < passwordStrength.strength
                          ? passwordStrength.strength <= 1
                            ? 'bg-red-500'
                            : passwordStrength.strength <= 2
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                          : 'bg-slate-300 dark:bg-slate-600'
                      }`}
                    />
                  ))}
                </div>
                <p className={`text-xs ${passwordStrength.color}`}>
                  Strength: {passwordStrength.label}
                </p>
                {passwordStrength.strength < 4 && (
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {passwordStrength.strength === 1 && 'Add uppercase, numbers, and symbols for stronger password'}
                    {passwordStrength.strength === 2 && 'Add uppercase and numbers to strengthen password'}
                    {passwordStrength.strength === 3 && 'Add a special character for maximum strength'}
                  </p>
                )}
              </div>
            )}
          </div>
          )}

          {resetToken && (
            <>
              <div>
                <label htmlFor="new-password" className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                  New Password
                </label>
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Create new password (min 8 chars)"
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                  disabled={isLoading}
                  required
                  minLength={8}
                />
              </div>
              <div>
                <label htmlFor="confirm-new-password" className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                  Confirm New Password
                </label>
                <input
                  id="confirm-new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                  disabled={isLoading}
                  required
                  minLength={8}
                />
              </div>
            </>
          )}

          {!resetToken && mode === 'create' && (
            <div>
              <label htmlFor="role" className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                Role
              </label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as 'admin' | 'sub-admin' | 'editor')}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                disabled={isLoading}
              >
                <option value="editor">Editor</option>
                <option value="sub-admin">Sub Admin</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          )}

          {error && (
            <div className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-200 px-4 py-3 rounded-lg text-sm">
              {success}
            </div>
          )}

          {!resetToken && mode === 'login' && (
            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword((prev) => !prev);
                  setError('');
                  setSuccess('');
                }}
                className="text-sm text-red-700 hover:underline dark:text-red-400"
              >
                {showForgotPassword ? 'Back to Login' : 'Forgot password?'}
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={
              isLoading ||
              (resetToken
                ? !newPassword || !confirmNewPassword
                : showForgotPassword
                ? !email || !isEmailValid
                : !email || !password || !isEmailValid || (mode === 'create' && (!name || password.length < 8)))
            }
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200"
          >
            {isLoading
              ? resetToken
                ? 'Resetting Password...'
                : showForgotPassword
                ? 'Sending Reset Link...'
                : mode === 'login'
                ? 'Verifying...'
                : 'Creating User...'
              : resetToken
              ? 'Set New Password'
              : showForgotPassword
              ? 'Send Reset Link'
              : mode === 'login'
              ? 'Access Admin Panel'
              : 'Create Account'}
          </button>


        </form>

        <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
          Admin Portal © 2026
        </div>
      </div>
    </div>
  );
}

