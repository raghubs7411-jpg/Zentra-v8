import React, { useState } from 'react';
import {
  Lock,
  User,
  KeyRound,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

const IS_DEV_MODE = import.meta.env.DEV;

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { users, login, business } = useApp();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-slate-100 p-4 relative overflow-hidden font-sans">
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

        {/* Light-mode Login Card */}
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xl border border-slate-200 space-y-5">
          <div className="border-b border-slate-200 pb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Lock className="w-4 h-4 text-blue-600" />
              <span>User Sign In</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter your registered email or phone and password/PIN
            </p>
          </div>

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
              className="w-full h-12 flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
            >
              <span>Sign In</span>
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

        {/* Footer */}
        <p className="text-center text-xs text-slate-400">
          Zentra Suite v3.0 &middot; Offline-capable & Browser-based
        </p>
      </div>
    </div>
  );
};
