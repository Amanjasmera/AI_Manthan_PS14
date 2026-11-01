import React, { useState, useEffect } from 'react';
import { 
  X, User as UserIcon, Stethoscope, Mail, Shield, Key, 
  Check, AlertCircle, Save, LogOut, Sparkles, Award
} from 'lucide-react';
import { UserProfile, UserRole, UserProfileUpdateRequest } from '../types';
import { updateUserProfile } from '../services/api';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  authToken: string | null;
  onProfileUpdated: (updatedUser: UserProfile, newToken: string) => void;
  onLogout: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  authToken,
  onProfileUpdated,
  onLogout,
}) => {
  const [fullName, setFullName] = useState(currentUser.full_name);
  const [email, setEmail] = useState(currentUser.email);
  const [role, setRole] = useState<UserRole>(currentUser.role);
  const [licenseNumber, setLicenseNumber] = useState(currentUser.license_number || '');
  
  // Password change fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync state whenever modal opens or currentUser changes
  useEffect(() => {
    setFullName(currentUser.full_name);
    setEmail(currentUser.email);
    setRole(currentUser.role);
    setLicenseNumber(currentUser.license_number || '');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    setSuccessMsg(null);
  }, [currentUser, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    // Validation
    if (!fullName.trim()) {
      setError('Full Name is required.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }
    if (newPassword) {
      if (!currentPassword) {
        setError('Please enter your current password to set a new password.');
        return;
      }
      if (newPassword.length < 4) {
        setError('New password must be at least 4 characters.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setError('New password and confirm password do not match.');
        return;
      }
    }

    setIsLoading(true);
    try {
      // If we don't have an auth token yet (e.g. demo mode), use or request one
      const token = authToken || localStorage.getItem('netra_auth_token') || 'demo-token';
      
      const payload: UserProfileUpdateRequest = {
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        role: role,
        license_number: role === 'Doctor' ? licenseNumber.trim() : undefined,
      };

      if (newPassword.trim()) {
        payload.current_password = currentPassword;
        payload.new_password = newPassword.trim();
      }

      const res = await updateUserProfile(payload, token);
      onProfileUpdated(res.user, res.token);
      setSuccessMsg('Profile and database credentials updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setSuccessMsg(null);
      }, 3500);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile in database.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="glass-panel max-w-xl w-full p-6 sm:p-8 shadow-2xl relative rounded-[22px] border border-[rgba(70,170,255,0.35)] pop-in max-h-[90vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-[#9ab0c9] hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Profile Identity */}
        <div className="flex items-center space-x-4 pb-5 border-b border-[rgba(70,170,255,0.2)] mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#35b6ff]/30 to-[#04070d] border border-[#35b6ff]/50 flex items-center justify-center text-[#35b6ff] shadow-[0_0_20px_rgba(53,182,255,0.3)]">
            {currentUser.role === 'Doctor' ? (
              <Stethoscope className="w-7 h-7 text-[#35b6ff]" />
            ) : (
              <UserIcon className="w-7 h-7 text-[#35b6ff]" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2.5">
              <h2 className="font-heading font-black text-lg text-white truncate">
                {currentUser.full_name}
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-heading font-extrabold uppercase tracking-wider ${
                currentUser.role === 'Doctor'
                  ? 'bg-[#35b6ff]/20 text-[#35b6ff] border border-[#35b6ff]/40 shadow-[0_0_10px_rgba(53,182,255,0.25)]'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }`}>
                {currentUser.role}
              </span>
            </div>
            <p className="text-xs text-[#9ab0c9] font-mono mt-0.5">
              @{currentUser.username} • Account ID: {currentUser.id.slice(0, 8)}
            </p>
          </div>
        </div>

        {/* Notifications */}
        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-[rgba(255,90,74,0.15)] border border-[rgba(255,90,74,0.5)] text-rose-200 text-xs flex items-center space-x-2.5 pop-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#ff5a4a]" />
            <span className="font-sans font-medium">{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-200 text-xs flex items-center space-x-2.5 pop-in">
            <Check className="w-4 h-4 shrink-0 text-emerald-400" />
            <span className="font-sans font-medium">{successMsg}</span>
          </div>
        )}

        {/* Profile Update Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Section 1: Role & Category Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-heading font-bold text-white uppercase tracking-wider">
              Category & Account Role
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('User')}
                className={`p-3 rounded-xl border text-left transition-all flex items-center space-x-2.5 ${
                  role === 'User'
                    ? 'border-[#35b6ff] bg-[#35b6ff]/15 shadow-[0_0_16px_rgba(53,182,255,0.2)]'
                    : 'border-[rgba(70,170,255,0.2)] bg-[rgba(4,12,24,0.6)] text-[#9ab0c9] hover:border-white/40'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  role === 'User' ? 'bg-[#35b6ff]/20 text-[#35b6ff]' : 'bg-white/5 text-[#9ab0c9]'
                }`}>
                  <UserIcon className="w-4 h-4" />
                </div>
                <div>
                  <div className={`text-xs font-heading font-bold ${role === 'User' ? 'text-white' : 'text-[#9ab0c9]'}`}>
                    User / Patient
                  </div>
                  <div className="text-[10px] text-[#9ab0c9] leading-tight">
                    Standard AI studio
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setRole('Doctor')}
                className={`p-3 rounded-xl border text-left transition-all flex items-center space-x-2.5 ${
                  role === 'Doctor'
                    ? 'border-[#35b6ff] bg-[#35b6ff]/15 shadow-[0_0_16px_rgba(53,182,255,0.2)]'
                    : 'border-[rgba(70,170,255,0.2)] bg-[rgba(4,12,24,0.6)] text-[#9ab0c9] hover:border-white/40'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  role === 'Doctor' ? 'bg-[#35b6ff]/20 text-[#35b6ff]' : 'bg-white/5 text-[#9ab0c9]'
                }`}>
                  <Stethoscope className="w-4 h-4" />
                </div>
                <div>
                  <div className={`text-xs font-heading font-bold ${role === 'Doctor' ? 'text-white' : 'text-[#9ab0c9]'}`}>
                    Doctor / Clinician
                  </div>
                  <div className="text-[10px] text-[#9ab0c9] leading-tight">
                    Full review queue
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Section 2: Personal Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#9ab0c9] mb-1 font-sans">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="clinical-input w-full px-3.5 py-2 text-xs"
                placeholder="e.g. Dr. Rajesh Verma, MD"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#9ab0c9] mb-1 font-sans">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#9ab0c9] absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="clinical-input w-full pl-9 pr-3.5 py-2 text-xs"
                  placeholder="name@netrax.ai"
                />
              </div>
            </div>
          </div>

          {/* Medical License (Doctor only) */}
          {role === 'Doctor' && (
            <div className="pop-in">
              <label className="block text-xs font-semibold text-[#9ab0c9] mb-1 font-sans flex items-center justify-between">
                <span>Medical Council Registration / License #</span>
                <span className="text-[10px] text-[#35b6ff] font-mono">Verified Credential</span>
              </label>
              <div className="relative">
                <Award className="w-4 h-4 text-[#35b6ff] absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="e.g. MCI-OPH-48921"
                  className="clinical-input w-full pl-9 pr-3.5 py-2 text-xs font-mono"
                />
              </div>
            </div>
          )}

          {/* Section 3: Update Password */}
          <div className="pt-3 border-t border-[rgba(70,170,255,0.15)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-heading font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
                <Key className="w-3.5 h-3.5 text-[#35b6ff]" />
                <span>Security & Password (Optional)</span>
              </span>
              <span className="text-[10px] text-[#9ab0c9]">Leave blank to keep unchanged</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-[#9ab0c9] mb-1 font-sans">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="clinical-input w-full px-3 py-1.5 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#9ab0c9] mb-1 font-sans">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                  className="clinical-input w-full px-3 py-1.5 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#9ab0c9] mb-1 font-sans">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new"
                  className="clinical-input w-full px-3 py-1.5 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-[rgba(70,170,255,0.2)] flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-heading font-bold transition flex items-center justify-center space-x-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>

            <div className="w-full sm:w-auto flex items-center space-x-2.5">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#9ab0c9] hover:text-white text-xs transition"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-cyan-glow flex-1 sm:flex-initial px-5 py-2 text-xs font-bold font-heading flex items-center justify-center space-x-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isLoading ? 'Saving Changes...' : 'Save Profile Changes'}</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
