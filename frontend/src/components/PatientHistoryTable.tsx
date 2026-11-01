import React, { useState } from 'react';
import { Search, Filter, Eye, Download, FileText, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { ScreeningListItem } from '../types';
import { Language, translations } from '../utils/language';
import { SeverityBadge, UrgencyBadge } from './SeverityBadge';

interface PatientHistoryTableProps {
  screenings: ScreeningListItem[];
  lang: Language;
  onSelectScreening: (id: string) => void;
}

export const PatientHistoryTable: React.FC<PatientHistoryTableProps> = ({
  screenings,
  lang,
  onSelectScreening,
}) => {
  const t = translations[lang];
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUrgency, setFilterUrgency] = useState<string>('ALL');

  const filtered = screenings.filter((item) => {
    const matchName = item.patient_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchUrgency = filterUrgency === 'ALL' || item.referral_urgency === filterUrgency;
    return matchName && matchUrgency;
  });

  return (
    <div className="glass-panel shadow-2xl overflow-hidden pop-in">
      {/* Search and Filters Header */}
      <div className="p-5 border-b border-[rgba(70,170,255,0.15)] flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#04070d]/60">
        <div>
          <h2 className="font-heading font-bold text-lg text-white flex items-center space-x-2">
            <FileText className="w-5 h-5 text-[#35b6ff]" />
            <span>{t.navHistory}</span>
          </h2>
          <p className="text-xs text-[#9ab0c9] mt-0.5">
            Longitudinal records, community screening logs & ophthalmology referrals
          </p>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-[#9ab0c9] absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search patient name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-[#081222] border border-[rgba(70,170,255,0.25)] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#35b6ff] transition-all"
            />
          </div>

          {/* Filter Dropdown */}
          <select
            value={filterUrgency}
            onChange={(e) => setFilterUrgency(e.target.value)}
            className="px-3 py-2.5 bg-[#081222] border border-[rgba(70,170,255,0.25)] rounded-xl text-xs text-slate-300 focus:outline-none focus:border-[#35b6ff] transition-all"
          >
            <option value="ALL">All Triage Levels</option>
            <option value="ROUTINE">Routine Screening</option>
            <option value="NON_URGENT">Non-Urgent Referral</option>
            <option value="URGENT">Urgent Referral</option>
            <option value="CRITICAL">Critical Emergency</option>
            <option value="RETAKE">IQA Retake Required</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#04070d]/90 text-[#9ab0c9] font-bold border-b border-[rgba(70,170,255,0.15)] uppercase tracking-wider text-[11px]">
            <tr>
              <th className="px-5 py-4">Patient Details</th>
              <th className="px-4 py-4">Eye Evaluated</th>
              <th className="px-4 py-4">AI ICDR Severity</th>
              <th className="px-4 py-4">Triage Protocol</th>
              <th className="px-4 py-4">Clinician Status</th>
              <th className="px-4 py-4">Screening Date</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(70,170,255,0.1)]">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-[#9ab0c9]">
                  No screening records match current search criteria.
                </td>
              </tr>
            ) : (
              filtered.map((s) => {
                const effectiveGrade = s.confirmed_grade !== null && s.confirmed_grade !== undefined
                  ? s.confirmed_grade
                  : s.predicted_grade;

                return (
                  <tr
                    key={s.id}
                    className="hover:bg-[#35b6ff]/5 transition-colors cursor-pointer group"
                    onClick={() => onSelectScreening(s.id)}
                  >
                    <td className="px-5 py-4 font-medium text-white">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-slate-100 group-hover:text-[#35b6ff] transition-colors">
                          {s.patient_name}
                        </span>
                        <span className="text-[11px] text-[#9ab0c9]">
                          ({s.age}y / {s.gender})
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        ID: {s.id.slice(0, 14)}
                      </div>
                    </td>

                    <td className="px-4 py-4 text-slate-300 font-medium">
                      <span className="px-2.5 py-1 rounded-full bg-[#04070d] border border-[rgba(70,170,255,0.2)] text-[11px] text-[#35b6ff] font-bold">
                        {s.eye_side === 'RIGHT' ? 'Right Eye (OD)' : 'Left Eye (OS)'}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <SeverityBadge grade={effectiveGrade} gradeName={s.grade_name} size="sm" />
                      <div className="flex items-center space-x-1.5 text-[10px] text-[#9ab0c9] mt-1.5 font-mono">
                        <span>{Math.round(s.confidence * 100)}% Conf</span>
                        {s.uncertainty_score !== undefined && (
                          <span className={s.uncertainty_score > 0.50 ? "text-[#ff8a3d] font-bold" : "text-[#9ab0c9]"}>
                            • H: {s.uncertainty_score.toFixed(3)}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <UrgencyBadge urgency={s.referral_urgency} />
                    </td>

                    <td className="px-4 py-4">
                      {s.status === 'REVIEWED' ? (
                        <span className="inline-flex items-center space-x-1 text-[#3dff9a] text-[11px] font-bold bg-[#3dff9a]/10 px-2.5 py-1 rounded-lg border border-[#3dff9a]/30">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Doctor Verified</span>
                        </span>
                      ) : s.requires_manual_doctor_review ? (
                        <span className="inline-flex items-center space-x-1 text-[#ff8a3d] text-[11px] font-bold bg-[#ff8a3d]/15 px-2.5 py-1 rounded-lg border border-[#ff8a3d]/40 animate-pulse">
                          <AlertTriangle className="w-3.5 h-3.5 text-[#ff8a3d]" />
                          <span>Review Required</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-slate-300 text-[11px] font-semibold bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Pending Review</span>
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-4 text-[#9ab0c9] font-mono text-[11px]">
                      {new Date(s.created_at).toLocaleDateString()}
                    </td>

                    <td className="px-5 py-4 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onSelectScreening(s.id)}
                        className="px-3 py-1.5 rounded-xl bg-[#081222] hover:bg-[#35b6ff]/20 text-slate-200 hover:text-white border border-[rgba(70,170,255,0.3)] text-xs font-bold transition shadow"
                        title="View Diagnostic Studio"
                      >
                        <Eye className="w-3.5 h-3.5 inline mr-1 text-[#35b6ff]" />
                        <span>Inspect</span>
                      </button>

                      <a
                        href={`/api/v1/screenings/${s.id}/report.pdf`}
                        download
                        className="px-3 py-1.5 rounded-xl bg-[#35b6ff]/15 hover:bg-[#35b6ff]/30 text-[#35b6ff] border border-[#35b6ff]/40 text-xs font-bold transition inline-block"
                        title="Download PDF Report"
                      >
                        <Download className="w-3.5 h-3.5 inline mr-1" />
                        <span>PDF</span>
                      </a>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
