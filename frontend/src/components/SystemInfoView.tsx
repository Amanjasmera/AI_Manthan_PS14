import React from 'react';
import { Database, ShieldCheck, Cpu, Layers, BookOpen, CheckCircle2 } from 'lucide-react';
import { SystemHealth } from '../types';
import { Language, translations } from '../utils/language';

interface SystemInfoViewProps {
  health: SystemHealth | null;
  lang: Language;
}

export const SystemInfoView: React.FC<SystemInfoViewProps> = ({ health, lang }) => {
  const t = translations[lang];

  return (
    <div className="space-y-6 pop-in">
      {/* Title Header */}
      <div className="glass-panel p-6 shadow-2xl">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#35b6ff]/20 text-[#35b6ff] flex items-center justify-center border border-[#35b6ff]/40 shadow-[0_0_16px_rgba(53,182,255,0.25)]">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-heading font-black text-xl text-white">
              NETRA X — Architecture & Integrity Verification
            </h1>
            <p className="text-xs text-[#9ab0c9] mt-0.5">
              Benchmark Specifications for Problem Statement 14: AI-Assisted Retinal Microvasculature Diagnostics
            </p>
          </div>
        </div>
      </div>

      {/* Grid: 3 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Runtime Engine */}
        <div className="glass-panel p-5 shadow-2xl space-y-3">
          <div className="flex items-center space-x-2 text-[#35b6ff] font-heading font-bold text-sm">
            <Cpu className="w-4 h-4" />
            <span>Deep Learning Runtime</span>
          </div>
          <div className="space-y-2 text-xs text-slate-300">
            <div className="flex justify-between py-1.5 border-b border-[rgba(70,170,255,0.15)]">
              <span className="text-[#9ab0c9]">Framework:</span>
              <span className="font-mono text-[#3dff9a] font-bold">PyTorch {health?.pytorch.version || '2.15.0+cpu'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[rgba(70,170,255,0.15)]">
              <span className="text-[#9ab0c9]">Architecture:</span>
              <span className="font-mono text-white font-semibold">EfficientNet-B0 (5.3M Params)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[rgba(70,170,255,0.15)]">
              <span className="text-[#9ab0c9]">Device Target:</span>
              <span className="font-mono text-white">CPU / Portable Edge Workstation</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[rgba(70,170,255,0.15)]">
              <span className="text-[#9ab0c9]">ICDR Severity Scale:</span>
              <span className="font-semibold text-white">5-Class (Grade 0 to 4)</span>
            </div>
          </div>
        </div>

        {/* Card 2: CV & Explainability */}
        <div className="glass-panel p-5 shadow-2xl space-y-3">
          <div className="flex items-center space-x-2 text-[#35b6ff] font-heading font-bold text-sm">
            <Layers className="w-4 h-4" />
            <span>CV & Explainability</span>
          </div>
          <div className="space-y-2 text-xs text-slate-300">
            <div className="flex justify-between py-1.5 border-b border-[rgba(70,170,255,0.15)]">
              <span className="text-[#9ab0c9]">Image Quality (IQA):</span>
              <span className="font-semibold text-white">OpenCV Laplacian Blur & Luminance</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[rgba(70,170,255,0.15)]">
              <span className="text-[#9ab0c9]">Preprocessing:</span>
              <span className="font-semibold text-white">Ben Graham & CLAHE Normalization</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[rgba(70,170,255,0.15)]">
              <span className="text-[#9ab0c9]">Explainability:</span>
              <span className="font-semibold text-[#ff8a3d]">Grad-CAM Feature Activation</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[rgba(70,170,255,0.15)]">
              <span className="text-[#9ab0c9]">Lesion Segmentation:</span>
              <span className="font-semibold text-white">MA, Hemorrhage & Exudate Masks</span>
            </div>
          </div>
        </div>

        {/* Card 3: Training & Validation Benchmarks */}
        <div className="glass-panel p-5 shadow-2xl space-y-3">
          <div className="flex items-center space-x-2 text-[#ffb020] font-heading font-bold text-sm">
            <Database className="w-4 h-4" />
            <span>Benchmark Datasets</span>
          </div>
          <div className="space-y-2 text-xs text-slate-300">
            <div className="flex justify-between py-1.5 border-b border-[rgba(70,170,255,0.15)]">
              <span className="text-[#9ab0c9]">APTOS 2019:</span>
              <span className="font-mono text-white">3,662 Clinician Graded Fundus</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[rgba(70,170,255,0.15)]">
              <span className="text-[#9ab0c9]">IDRiD Dataset:</span>
              <span className="font-mono text-white">Indian Population Lesion Masks</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[rgba(70,170,255,0.15)]">
              <span className="text-[#9ab0c9]">Messidor-2:</span>
              <span className="font-mono text-white">1,748 Multi-Center Validation</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[rgba(70,170,255,0.15)]">
              <span className="text-[#9ab0c9]">Language Engine:</span>
              <span className="font-semibold text-[#3dff9a]">English + Hindi Bilingual Reports</span>
            </div>
          </div>
        </div>
      </div>

      {/* Strict Model Honesty Protocol Box */}
      <div className="glass-panel p-6 shadow-2xl space-y-4">
        <div className="flex items-center space-x-2.5 text-[#3dff9a] font-heading font-bold text-base">
          <ShieldCheck className="w-5 h-5 text-[#3dff9a]" />
          <span>Strict AI Integrity & Clinical Safety Protocol</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          In strict accordance with clinical standards, <b>NETRA X does not fabricate diagnostic confidence scores or simulate random findings</b>.
          When trained deep learning weights are connected, inference executes through the full PyTorch convolution graph. If baseline weights are active, predictions are explicitly derived from OpenCV morphological lesion counts under the International Clinical Diabetic Retinopathy (ICDR) scale and clearly marked in every screen and PDF report.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-[#04070d] border border-[rgba(70,170,255,0.2)] text-xs space-y-1.5">
            <div className="flex items-center space-x-2 text-[#3dff9a] font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Verified Checkpoint Protocol</span>
            </div>
            <p className="text-[#9ab0c9] text-[11px] leading-relaxed">
              Weights loaded from APTOS/IDRiD benchmarks report calibrated probabilities with Grad-CAM target layer backpropagation.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#04070d] border border-[rgba(70,170,255,0.2)] text-xs space-y-1.5">
            <div className="flex items-center space-x-2 text-[#35b6ff] font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Decision Support Classification</span>
            </div>
            <p className="text-[#9ab0c9] text-[11px] leading-relaxed">
              Triage classifications (Routine, Non-Urgent, Urgent) comply with ICDR screening guidelines and CDSCO medical software guidance.
            </p>
          </div>
        </div>
      </div>

      {/* Citations & Research Paper References */}
      <div className="glass-panel p-6 shadow-2xl space-y-3">
        <div className="flex items-center space-x-2 text-white font-heading font-bold text-sm">
          <BookOpen className="w-4 h-4 text-[#35b6ff]" />
          <span>Primary Literature & Regulatory Sources</span>
        </div>
        <ul className="list-disc list-inside space-y-2 text-xs text-[#9ab0c9]">
          <li><b>DR Screen Research Document</b>: AI Manthan 2.0 Problem Statement 14 — AI-Assisted Diabetic Retinopathy Screening.</li>
          <li><b>IDF Diabetes Atlas</b>: Epidemiology of Diabetes in India (~74M adult diabetic population).</li>
          <li><b>ICMR-INDIAB Study & Chennai CURES Eye Study</b>: 12–17% Diabetic Retinopathy prevalence in Indian diabetic cohorts.</li>
          <li><b>Gulshan et al., JAMA 2016</b>: Development and Validation of a Deep Learning Algorithm for Detection of Diabetic Retinopathy in Retinal Fundus Photographs.</li>
          <li><b>CDSCO Medical Device Rules</b>: Clinical Decision Support Software Guidance (India).</li>
        </ul>
      </div>
    </div>
  );
};
