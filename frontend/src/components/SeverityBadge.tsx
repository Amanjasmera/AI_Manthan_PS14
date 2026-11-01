import React from 'react';
import { Shield, AlertTriangle, AlertOctagon, CheckCircle2 } from 'lucide-react';
import { ReferralUrgency } from '../types';

interface SeverityBadgeProps {
  grade: number;
  gradeName?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ grade, gradeName, size = 'md' }) => {
  const configs: Record<number, { bg: string; text: string; border: string; glow: string; label: string; icon: any }> = {
    0: {
      bg: 'bg-[#3dff9a]/15',
      text: 'text-[#3dff9a]',
      border: 'border-[#3dff9a]/40',
      glow: 'shadow-[0_0_12px_rgba(61,255,154,0.3)]',
      label: 'Grade 0: No DR',
      icon: CheckCircle2,
    },
    1: {
      bg: 'bg-[#a3e635]/15',
      text: 'text-[#a3e635]',
      border: 'border-[#a3e635]/40',
      glow: 'shadow-[0_0_12px_rgba(163,230,53,0.3)]',
      label: 'Grade 1: Mild NPDR',
      icon: Shield,
    },
    2: {
      bg: 'bg-[#ffb020]/15',
      text: 'text-[#ffb020]',
      border: 'border-[#ffb020]/40',
      glow: 'shadow-[0_0_12px_rgba(255,176,32,0.3)]',
      label: 'Grade 2: Moderate NPDR',
      icon: AlertTriangle,
    },
    3: {
      bg: 'bg-[#ff8a3d]/15',
      text: 'text-[#ff8a3d]',
      border: 'border-[#ff8a3d]/40',
      glow: 'shadow-[0_0_12px_rgba(255,138,61,0.3)]',
      label: 'Grade 3: Severe NPDR',
      icon: AlertOctagon,
    },
    4: {
      bg: 'bg-[#ff4d6d]/15',
      text: 'text-[#ff4d6d]',
      border: 'border-[#ff4d6d]/40',
      glow: 'shadow-[0_0_12px_rgba(255,77,109,0.3)]',
      label: 'Grade 4: Proliferative DR',
      icon: AlertOctagon,
    },
  };

  const current = configs[grade] || configs[0];
  const Icon = current.icon;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs space-x-1',
    md: 'px-3 py-1 text-xs sm:text-sm space-x-1.5',
    lg: 'px-4 py-2 text-base space-x-2 font-heading font-bold',
  }[size];

  return (
    <span
      className={`inline-flex items-center font-bold rounded-xl border ${current.bg} ${current.text} ${current.border} ${current.glow} ${sizeClasses}`}
    >
      <Icon className={size === 'sm' ? 'w-3.5 h-3.5' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5'} />
      <span>{gradeName || current.label}</span>
    </span>
  );
};

export const UrgencyBadge: React.FC<{ urgency: ReferralUrgency }> = ({ urgency }) => {
  const configs: Record<ReferralUrgency, { bg: string; text: string; border: string; glow: string; label: string }> = {
    ROUTINE: {
      bg: 'bg-[#3dff9a]/10',
      text: 'text-[#3dff9a]',
      border: 'border-[#3dff9a]/30',
      glow: '',
      label: 'Routine Screening',
    },
    NON_URGENT: {
      bg: 'bg-[#ffb020]/10',
      text: 'text-[#ffb020]',
      border: 'border-[#ffb020]/30',
      glow: '',
      label: 'Referral (4-6 Wks)',
    },
    URGENT: {
      bg: 'bg-[#ff8a3d]/15',
      text: 'text-[#ff8a3d]',
      border: 'border-[#ff8a3d]/40',
      glow: 'shadow-[0_0_10px_rgba(255,138,61,0.25)]',
      label: 'Urgent Referral (1-2 Wks)',
    },
    CRITICAL: {
      bg: 'bg-[#ff4d6d]/15',
      text: 'text-[#ff4d6d]',
      border: 'border-[#ff4d6d]/40',
      glow: 'shadow-[0_0_12px_rgba(255,77,109,0.3)]',
      label: 'Emergency Referral (<72h)',
    },
    RETAKE: {
      bg: 'bg-slate-800',
      text: 'text-slate-300',
      border: 'border-slate-700',
      glow: '',
      label: 'Retake Photo Required',
    },
  };

  const current = configs[urgency] || configs.ROUTINE;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 text-[11px] font-bold rounded-lg border ${current.bg} ${current.text} ${current.border} ${current.glow}`}
    >
      {current.label}
    </span>
  );
};
