import React, { useState } from 'react';
import { X, Shield, Stethoscope, User as UserIcon, Lock, Mail, Key, Check, AlertCircle, Sparkles } from 'lucide-react';
import { UserProfile, UserRole } from '../types';
import { loginUser, registerUser, demoSwitchRole } from '../services/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: UserProfile, token: string) => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  
  // Login fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginRole, setLoginRole] = useState<UserRole>('User');
  
  // Register fields
  const [regFullName, setRegFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('User');
  const [regLicense, setRegLicense] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please provide both username and password.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const session = await loginUser(username, password, loginRole);
      onAuthSuccess(session.user, session.token);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Login failed. Invalid credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFullName || !regUsername || !regEmail || !regPassword) {
      setError('Please fill in all required registration fields.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const session = await registerUser({
        full_name: regFullName,
        username: regUsername,
        email: regEmail,
        password: regPassword,
        role: regRole,
        license_number: regRole === 'Doctor' ? regLicense : undefined,
      });
      onAuthSuccess(session.user, session.token);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemo = async (role: UserRole) => {
    setIsLoading(true);
    setError(null);
    try {
      const session = await demoSwitchRole(role);
      onAuthSuccess(session.user, session.token);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Demo login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="glass-panel max-w-md w-full p-6 sm:p-7 shadow-2xl relative rounded-[22px] border border-[rgba(70,170,255,0.35)] pop-in">
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-[#9ab0c9] hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon & Title */}
        <div className="flex items-center space-x-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#35b6ff]/20 border border-[#35b6ff]/40 flex items-center justify-center text-[#35b6ff] shadow-[0_0_12px_rgba(53,182,255,0.25)]">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-heading font-black text-lg text-white">
              NETRA <span className="text-[#35b6ff]">X</span> Authentication
            </h2>
            <p className="text-xs text-[#9ab0c9] font-sans">
              Role-Based Access Control (RBAC) System
            </p>
          </div>
        </div>

        {/* Tab Switcher: Sign In vs Register */}
        <div className="flex rounded-xl bg-[rgba(4,12,24,0.85)] p-1 border border-[rgba(70,170,255,0.25)] mb-5 text-xs font-heading font-bold">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(null); }}
            className={`flex-1 py-2 rounded-lg transition-all ${
              mode === 'login'
                ? 'bg-[#35b6ff] text-[#03121f] shadow-[0_0_12px_rgba(53,182,255,0.4)]'
                : 'text-[#9ab0c9] hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(null); }}
            className={`flex-1 py-2 rounded-lg transition-all ${
              mode === 'register'
                ? 'bg-[#35b6ff] text-[#03121f] shadow-[0_0_12px_rgba(53,182,255,0.4)]'
                : 'text-[#9ab0c9] hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-[rgba(255,90,74,0.15)] border border-[rgba(255,90,74,0.5)] text-rose-200 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#ff5a4a]" />
            <span className="font-sans font-medium">{error}</span>
          </div>
        )}

        {/* Mode 1: Sign In */}
        {mode === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {/* Category / Role Selection for Login */}
            <div>
              <label className="block text-xs font-semibold text-[#9ab0c9] mb-1.5 font-sans flex items-center justify-between">
                <span>Select Login Category:</span>
                <span className="text-[10px] text-[#35b6ff] font-mono">
                  {loginRole === 'Doctor' ? 'Ophthalmologist Portal' : 'Patient / User Portal'}
                </span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setLoginRole('User');
                    setError(null);
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all flex items-center space-x-2.5 ${
                    loginRole === 'User'
                      ? 'border-[#35b6ff] bg-[#35b6ff]/15 shadow-[0_0_12px_rgba(53,182,255,0.25)]'
                      : 'border-[rgba(70,170,255,0.2)] bg-[rgba(4,12,24,0.6)] text-[#9ab0c9] hover:border-white/30'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    loginRole === 'User' ? 'bg-[#35b6ff]/20 text-[#35b6ff]' : 'bg-white/5 text-[#9ab0c9]'
                  }`}>
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className={`text-xs font-heading font-bold ${loginRole === 'User' ? 'text-white' : 'text-[#9ab0c9]'}`}>
                      User
                    </div>
                    <div className="text-[10px] text-[#9ab0c9] truncate">
                      Patient
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLoginRole('Doctor');
                    setError(null);
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all flex items-center space-x-2.5 ${
                    loginRole === 'Doctor'
                      ? 'border-[#35b6ff] bg-[#35b6ff]/15 shadow-[0_0_12px_rgba(53,182,255,0.25)]'
                      : 'border-[rgba(70,170,255,0.2)] bg-[rgba(4,12,24,0.6)] text-[#9ab0c9] hover:border-white/30'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    loginRole === 'Doctor' ? 'bg-[#35b6ff]/20 text-[#35b6ff]' : 'bg-white/5 text-[#9ab0c9]'
                  }`}>
                    <Stethoscope className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className={`text-xs font-heading font-bold ${loginRole === 'Doctor' ? 'text-white' : 'text-[#9ab0c9]'}`}>
                      Doctor
                    </div>
                    <div className="text-[10px] text-[#9ab0c9] truncate">
                      Clinician
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#9ab0c9] mb-1 font-sans">
                Username or Email
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-[#9ab0c9] absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="e.g. doctor or user"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="clinical-input w-full pl-9 pr-3.5 py-2 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#9ab0c9] mb-1 font-sans">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#9ab0c9] absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="clinical-input w-full pl-9 pr-3.5 py-2 text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-cyan-glow w-full py-2.5 text-xs font-bold font-heading active:scale-95 transition-all mt-2"
            >
              {isLoading ? 'Verifying Credentials...' : 'Sign In'}
            </button>

            {/* Quick 1-Click Demo Buttons */}
            <div className="pt-3 border-t border-[rgba(70,170,255,0.15)] space-y-2">
              <div className="text-[11px] font-mono text-[#9ab0c9] flex items-center justify-between">
                <span>Quick Evaluation Logins:</span>
                <span className="text-[#35b6ff] flex items-center space-x-1">
                  <Sparkles className="w-3 h-3 text-[#ffb020]" />
                  <span>1-Click</span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickDemo('Doctor')}
                  disabled={isLoading}
                  className="clinical-chip p-2 text-left flex items-center space-x-2 text-xs hover:border-[#35b6ff]"
                >
                  <Stethoscope className="w-4 h-4 text-[#3dff9a] shrink-0" />
                  <div className="min-w-0">
                    <div className="font-bold text-white text-[11px] leading-tight">Doctor</div>
                    <div className="text-[9px] text-[#3dff9a] font-mono">Full Review Access</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemo('User')}
                  disabled={isLoading}
                  className="clinical-chip p-2 text-left flex items-center space-x-2 text-xs hover:border-[#35b6ff]"
                >
                  <UserIcon className="w-4 h-4 text-[#35b6ff] shrink-0" />
                  <div className="min-w-0">
                    <div className="font-bold text-white text-[11px] leading-tight">User</div>
                    <div className="text-[9px] text-[#ff8a3d] font-mono">Review Locked</div>
                  </div>
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* Mode 2: Register Account with Role Selection */
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#9ab0c9] mb-1 font-sans">
                Full Name
              </label>
              <input
                type="text"
                placeholder="e.g. Dr. Jane Doe"
                value={regFullName}
                onChange={(e) => setRegFullName(e.target.value)}
                required
                className="clinical-input w-full px-3.5 py-2 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-[#9ab0c9] mb-1 font-sans">
                  Username
                </label>
                <input
                  type="text"
                  placeholder="janedoe"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  required
                  className="clinical-input w-full px-3.5 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#9ab0c9] mb-1 font-sans">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="jane@clinic.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                  className="clinical-input w-full px-3.5 py-2 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#9ab0c9] mb-1 font-sans">
                Password
              </label>
              <input
                type="password"
                placeholder="At least 4 characters"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                required
                className="clinical-input w-full px-3.5 py-2 text-xs"
              />
            </div>

            {/* Role Selection: User vs Doctor */}
            <div>
              <label className="block text-xs font-semibold text-[#eaf3ff] mb-1.5 font-sans flex items-center justify-between">
                <span>Select Account Role:</span>
                <span className="text-[10px] text-[#35b6ff] font-mono">RBAC Authorization</span>
              </label>
              
              <div className="grid grid-cols-2 gap-2">
                <div
                  onClick={() => setRegRole('User')}
                  className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                    regRole === 'User'
                      ? 'bg-[#35b6ff]/20 border-[#35b6ff] shadow-[0_0_12px_rgba(53,182,255,0.3)]'
                      : 'bg-[rgba(4,12,24,0.6)] border-[rgba(70,170,255,0.2)] hover:border-[#35b6ff]/50'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <UserIcon className="w-4 h-4 text-[#35b6ff]" />
                    <span className="text-xs font-bold text-white font-heading">User</span>
                    {regRole === 'User' && <Check className="w-3.5 h-3.5 text-[#35b6ff] ml-auto" />}
                  </div>
                  <p className="text-[10px] text-[#9ab0c9] mt-1 font-sans leading-tight">
                    Screening & history (Doctor Review locked)
                  </p>
                </div>

                <div
                  onClick={() => setRegRole('Doctor')}
                  className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                    regRole === 'Doctor'
                      ? 'bg-[#3dff9a]/20 border-[#3dff9a] shadow-[0_0_12px_rgba(61,255,154,0.3)]'
                      : 'bg-[rgba(4,12,24,0.6)] border-[rgba(70,170,255,0.2)] hover:border-[#3dff9a]/50'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Stethoscope className="w-4 h-4 text-[#3dff9a]" />
                    <span className="text-xs font-bold text-white font-heading">Doctor</span>
                    {regRole === 'Doctor' && <Check className="w-3.5 h-3.5 text-[#3dff9a] ml-auto" />}
                  </div>
                  <p className="text-[10px] text-[#9ab0c9] mt-1 font-sans leading-tight">
                    Ophthalmologist sign-off & queue unlocked
                  </p>
                </div>
              </div>
            </div>

            {/* Optional Medical License if Doctor */}
            {regRole === 'Doctor' && (
              <div className="pop-in">
                <label className="block text-xs font-semibold text-[#3dff9a] mb-1 font-sans">
                  Medical License / MCI Registration (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. MCI-94821"
                  value={regLicense}
                  onChange={(e) => setRegLicense(e.target.value)}
                  className="clinical-input w-full px-3.5 py-2 text-xs"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="btn-cyan-glow w-full py-2.5 text-xs font-bold font-heading active:scale-95 transition-all mt-3"
            >
              {isLoading ? 'Creating Account...' : `Register as ${regRole}`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
