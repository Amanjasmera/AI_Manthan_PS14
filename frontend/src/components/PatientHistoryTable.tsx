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
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
      {/* Search and Filters Header */}
      <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-950/60">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <FileText className="w-5 h-5 text-brand-400" />
            <span>{t.navHistory}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Longitudinal records, community screening logs & ophthalmology referrals
          </p>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-60">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search patient name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Filter Dropdown */}
          <select
            value={filterUrgency}
            onChange={(e) => setFilterUrgency(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-brand-500"
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
          <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
            <tr>
              <th className="px-5 py-3.5">Patient Details</th>
              <th className="px-4 py-3.5">Eye Evaluated</th>
              <th className="px-4 py-3.5">AI ICDR Severity</th>
              <th className="px-4 py-3.5">Triage Protocol</th>
              <th className="px-4 py-3.5">Clinician Status</th>
              <th className="px-4 py-3.5">Screening Date</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-slate-500">
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
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    onClick={() => onSelectScreening(s.id)}
                  >
                    <td className="px-5 py-3.5 font-medium text-white">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-slate-100 group-hover:text-brand-300 transition-colors">
                          {s.patient_name}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          ({s.age}y / {s.gender})
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        ID: {s.id.slice(0, 14)}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-slate-300 font-medium">
                      <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[11px]">
                        {s.eye_side === 'RIGHT' ? 'Right Eye (OD)' : 'Left Eye (OS)'}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <SeverityBadge grade={effectiveGrade} gradeName={s.grade_name} size="sm" />
                      <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 mt-1 font-mono">
                        <span>{Math.round(s.confidence * 100)}% Conf</span>
                        {s.uncertainty_score !== undefined && (
                          <span className={s.uncertainty_score > 0.50 ? "text-amber-400 font-bold" : "text-slate-400"}>
                            • H: {s.uncertainty_score.toFixed(3)}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <UrgencyBadge urgency={s.referral_urgency} />
                    </td>

                    <td className="px-4 py-3.5">
                      {s.status === 'REVIEWED' ? (
                        <span className="inline-flex items-center space-x-1 text-emerald-400 text-[11px] font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Doctor Verified</span>
                        </span>
                      ) : s.requires_manual_doctor_review ? (
                        <span className="inline-flex items-center space-x-1 text-amber-300 text-[11px] font-semibold bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                          <span>Review Required</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-slate-300 text-[11px] font-semibold bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Pending Review</span>
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-slate-400 font-mono text-[11px]">
                      {new Date(s.created_at).toLocaleDateString()}
                    </td>

                    <td className="px-5 py-3.5 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onSelectScreening(s.id)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
                        title="View Diagnostic Studio"
                      >
                        <Eye className="w-3.5 h-3.5 inline mr-1" />
                        <span>Inspect</span>
                      </button>

                      <a
                        href={`/api/v1/screenings/${s.id}/report.pdf`}
                        download
                        className="px-2.5 py-1 rounded-lg bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 border border-brand-500/30 text-xs font-medium transition inline-block"
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
