import React, { useState, useEffect } from 'react';
import {
  Lock,
  User,
  KeyRound,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Cloud,
  CloudUpload,
  Loader2,
  ChevronDown,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { isSupabaseConfigured, supabase } from '../../services/supabaseClient';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

const IS_DEV_MODE = import.meta.env.DEV;

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { users, login, business, cloudLogin, cloudSignup, cloudSendPasswordReset, cloudCompletePasswordReset } = useApp();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Cloud account form
  const [cloudEmail, setCloudEmail] = useState('');
  const [cloudPassword, setCloudPassword] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [isSignupMode, setIsSignupMode] = useState(false);
  const [cloudBusy, setCloudBusy] = useState(false);
  const [cloudModeError, setCloudModeError] = useState<string | null>(null);
  const [cloudNotice, setCloudNotice] = useState<string | null>(null);

  // Forgot password / password recovery
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resetBusy, setResetBusy] = useState(false);

  // The reset email lands back on the app; the Supabase client picks up the
  // recovery token and fires PASSWORD_RECOVERY — show the new-password form.
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const result = login(identifier.trim(), password.trim());
    if (result.success) {
      onLoginSuccess();
    } else {
      setError(result.error || 'Invalid credentials or account disabled.');
    }
  };

  const handleQuickLogin = (email: string) => {
    setError(null);
    setIdentifier(email);
    setPassword('');
    setTimeout(() => {
      const pwdInput = document.querySelector('input[type="password"]') as HTMLInputElement;
      pwdInput?.focus();
    }, 100);
  };

  const handleCloudSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCloudModeError(null);
    if (!cloudEmail.trim() || !cloudPassword) {
      setCloudModeError('Please enter your email and password.');
      return;
    }
    if (isSignupMode && !ownerName.trim()) {
      setCloudModeError('Please enter your name (it becomes the owner account).');
      return;
    }
    setCloudBusy(true);
    const result = isSignupMode
      ? await cloudSignup(cloudEmail.trim(), cloudPassword, ownerName)
      : await cloudLogin(cloudEmail.trim(), cloudPassword);
    setCloudBusy(false);
    if (result.success) {
      onLoginSuccess();
    } else {
      setCloudModeError(result.error || 'Cloud sign-in failed.');
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCloudModeError(null);
    setCloudNotice(null);
    if (!resetEmail.trim()) {
      setCloudModeError('Please enter the email you signed up with.');
      return;
    }
    setResetBusy(true);
    const result = await cloudSendPasswordReset(resetEmail.trim());
    setResetBusy(false);
    if (result.success) {
      setCloudNotice('Password reset link sent \u2014 check your inbox (and spam folder).');
    } else {
      setCloudModeError(result.error || 'Could not send the reset email.');
    }
  };

  const handleNewPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCloudModeError(null);
    if (newPassword.length < 6) {
      setCloudModeError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setCloudModeError('Passwords do not match.');
      return;
    }
    setResetBusy(true);
    const result = await cloudCompletePasswordReset(newPassword);
    setResetBusy(false);
    if (result.success) {
      onLoginSuccess();
    } else {
      setCloudModeError(result.error || 'Could not set the new password.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-slate-100 p-4 relative overflow-hidden font-sans py-10">
      {/* Background Glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          {business.logoUrl ? (
            <img src={business.logoUrl} alt="Logo" className="w-16 h-16 object-contain mx-auto rounded-xl" />
          ) : (
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-black text-2xl shadow-xl shadow-blue-500/30">
              Z
            </div>
          )}
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            Zentra Suite
          </h1>
          <p className="text-xs text-slate-400 font-semibold tracking-wide">
            v3.0
          </p>
          <p className="text-xs md:text-sm text-slate-500">
            Connected CRM, Billing, Stock & Payments
          </p>
          {business.name && (
            <p className="text-xs text-slate-400 font-medium mt-1">
              {business.name}
            </p>
          )}
        </div>

        {isSupabaseConfigured && (
          /* Cloud Account Card */
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xl border border-blue-200 space-y-5">
            <div className="border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Cloud className="w-4 h-4 text-blue-600" />
                <span>Cloud Account</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isSignupMode
                  ? 'Create your owner account and upload this device\u2019s data to the cloud.'
                  : 'Sign in to sync your business data across all devices.'}
              </p>
            </div>

            {/* Error Banner */}
            {cloudModeError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2 text-rose-700 text-xs">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{cloudModeError}</span>
              </div>
            )}

            {/* Notice Banner */}
            {cloudNotice && !recoveryMode && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start space-x-2 text-emerald-700 text-xs">
                <Mail className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>{cloudNotice}</span>
              </div>
            )}

            {recoveryMode && (
              <form onSubmit={handleNewPasswordSubmit} className="space-y-5">
                <p className="text-xs text-slate-500 leading-relaxed">
                  You opened the password reset link. Choose a new password for your cloud account below.
                </p>
                <div>
                  <label className="block font-semibold text-slate-600 mb-2 text-xs uppercase tracking-wider">
                    New Password
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none" />
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full h-12 pl-12 pr-4 text-sm text-slate-900 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-2 text-xs uppercase tracking-wider">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none" />
                    <input
                      type="password"
                      required
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Re-enter the new password"
                      className="w-full h-12 pl-12 pr-4 text-sm text-slate-900 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 font-mono"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={resetBusy}
                  className="w-full h-12 flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
                >
                  {resetBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  <span>Set New Password</span>
                </button>
              </form>
            )}

            {!recoveryMode && showForgot && (
              <form onSubmit={handleForgotSubmit} className="space-y-5">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Enter the email you used to create your cloud account and we will send a password reset link to it.
                </p>
                <div>
                  <label className="block font-semibold text-slate-600 mb-2 text-xs uppercase tracking-wider">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="owner@business.com"
                      className="w-full h-12 pl-12 pr-4 text-sm text-slate-900 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={resetBusy}
                  className="w-full h-12 flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
                >
                  {resetBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  <span>Send Reset Link</span>
                </button>
              </form>
            )}

            {!recoveryMode && !showForgot && (
            <form onSubmit={handleCloudSubmit} className="space-y-5">
              {isSignupMode && (
                <div>
                  <label className="block font-semibold text-slate-600 mb-2 text-xs uppercase tracking-wider">
                    Your Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="e.g. Rajesh Kumar"
                      className="w-full h-12 pl-12 pr-4 text-sm text-slate-900 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-600 mb-2 text-xs uppercase tracking-wider">
                  Email
                </label>
                <div className="relative">
                  <Cloud className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={cloudEmail}
                    onChange={(e) => setCloudEmail(e.target.value)}
                    placeholder="owner@business.com"
                    className="w-full h-12 pl-12 pr-4 text-sm text-slate-900 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-2 text-xs uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none" />
                  <input
                    type="password"
                    required
                    value={cloudPassword}
                    onChange={(e) => setCloudPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full h-12 pl-12 pr-4 text-sm text-slate-900 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={cloudBusy}
                className="w-full h-12 flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
              >
                {cloudBusy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isSignupMode ? (
                  <CloudUpload className="w-4 h-4" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
                <span>{isSignupMode ? 'Create Account & Upload Data' : 'Sign In & Sync'}</span>
              </button>
            </form>
            )}

            {showForgot && !recoveryMode && (
              <button
                type="button"
                onClick={() => {
                  setShowForgot(false);
                  setCloudModeError(null);
                  setCloudNotice(null);
                }}
                className="w-full text-xs font-semibold text-slate-500 hover:text-slate-700 hover:underline"
              >
                <span className="inline-flex items-center space-x-1">
                  <ArrowLeft className="w-3 h-3" />
                  <span>Back to sign in</span>
                </span>
              </button>
            )}

            {!recoveryMode && !showForgot && (
              <button
                type="button"
                onClick={() => {
                  setIsSignupMode(!isSignupMode);
                  setCloudModeError(null);
                }}
                className="w-full text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
              >
                {isSignupMode ? 'Already have an account? Sign in' : 'New here? Set up your cloud account'}
              </button>
            )}

            {!recoveryMode && !showForgot && !isSignupMode && (
              <button
                type="button"
                onClick={() => {
                  setResetEmail(cloudEmail);
                  setShowForgot(true);
                  setCloudModeError(null);
                  setCloudNotice(null);
                }}
                className="w-full text-xs font-semibold text-slate-400 hover:text-blue-600 hover:underline"
              >
                Forgot password?
              </button>
            )}
          </div>
        )}

        {/* Offline / Staff Sign-In (collapsible) */}
        <details className="bg-white rounded-2xl shadow-md border border-slate-200 group">
          <summary className="flex items-center justify-between cursor-pointer select-none p-4 md:p-5 list-none">
            <div className="flex items-center space-x-2">
              <Lock className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-bold text-slate-700">Offline / Staff Sign-In</span>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-180" />
          </summary>

          <div className="px-6 md:px-8 pb-6 md:pb-8 space-y-5">
            {/* Error Banner */}
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2 text-rose-700 text-xs">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block font-semibold text-slate-600 mb-2 text-xs uppercase tracking-wider">
                  Email / Mobile Phone
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. rajesh@zentra.com or 9845011111"
                    className="w-full h-12 pl-12 pr-4 text-sm text-slate-900 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-2 text-xs uppercase tracking-wider">
                  Password / Security PIN
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password or PIN"
                    className="w-full h-12 pl-12 pr-4 text-sm text-slate-900 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full h-12 flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
              >
                <span>Sign In (This Device)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Quick Demo Login Buttons -- only in development */}
            {IS_DEV_MODE && (
              <div className="pt-4 border-t border-slate-200 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block text-center">
                  1-Click Role Sign-In (Dev Mode Only)
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {users.map((u) => {
                    const isDis = u.status === 'Disabled';
                    const btnClass = isDis
                      ? 'bg-slate-100 border-slate-200 text-slate-400'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 hover:border-blue-400';
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleQuickLogin(u.email)}
                        className={'p-2.5 rounded-xl text-left transition-all border ' + btnClass}
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-xs truncate">{u.name.split(' ')[0]}</p>
                          {isDis ? (
                            <span className="text-[9px] bg-rose-100 text-rose-600 px-1 rounded">Locked</span>
                          ) : (
                            <span className="text-[9px] bg-blue-100 text-blue-600 px-1 rounded">Active</span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">{u.role}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </details>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400">
          Zentra Suite v3.0 &middot; Offline-capable & Browser-based
        </p>
      </div>
    </div>
  );
};
