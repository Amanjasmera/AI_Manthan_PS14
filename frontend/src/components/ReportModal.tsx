import React from 'react';
import { X, Download, FileText } from 'lucide-react';
import { ScreeningDetail } from '../types';
import { Language, translations } from '../utils/language';

interface ReportModalProps {
  screening: ScreeningDetail;
  lang: Language;
  onClose: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({ screening, lang, onClose }) => {
  const t = translations[lang];
  const pdfUrl = `/api/v1/screenings/${screening.id}/report.pdf`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#04070d]/85 backdrop-blur-xl pop-in">
      <div className="bg-[#081222] border border-[rgba(70,170,255,0.4)] rounded-2xl w-full max-w-4xl h-[86vh] shadow-[0_0_50px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[rgba(70,170,255,0.15)] bg-[#04070d]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#35b6ff]/20 text-[#35b6ff] flex items-center justify-center border border-[#35b6ff]/30 shadow-[0_0_12px_rgba(53,182,255,0.2)]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-white">
                NETRA X • Bilingual Clinical Screening Report
              </h3>
              <p className="text-xs text-[#9ab0c9] font-mono">
                {screening.patient.full_name} • {screening.eye_side === 'RIGHT' ? 'Right Eye (OD)' : 'Left Eye (OS)'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <a
              href={pdfUrl}
              download={`NETRA_X_Report_${screening.patient.full_name.replace(/\s+/g, '_')}.pdf`}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl btn-cyan-glow text-[#04070d] text-xs font-heading font-black transition shadow-lg"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </a>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PDF Iframe Viewer */}
        <div className="flex-1 bg-[#020408] p-3 overflow-hidden">
          <iframe
            src={pdfUrl}
            title="Screening Report"
            className="w-full h-full rounded-xl border border-[rgba(70,170,255,0.2)]"
          />
        </div>
      </div>
    </div>
  );
};
