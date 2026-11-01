import React from 'react';
import { Layers, Eye, EyeOff, Sliders, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Language, translations } from '../utils/language';

interface LayerControlsProps {
  lang: Language;
  activeBaseLayer: 'raw' | 'clahe';
  setActiveBaseLayer: (val: 'raw' | 'clahe') => void;
  showGradcam: boolean;
  setShowGradcam: (val: boolean) => void;
  showLesions: boolean;
  setShowLesions: (val: boolean) => void;
  gradcamOpacity: number;
  setGradcamOpacity: (val: number) => void;
  zoom: number;
  setZoom: (val: number) => void;
  resetView: () => void;
  hasLesions: boolean;
}

export const LayerControls: React.FC<LayerControlsProps> = ({
  lang,
  activeBaseLayer,
  setActiveBaseLayer,
  showGradcam,
  setShowGradcam,
  showLesions,
  setShowLesions,
  gradcamOpacity,
  setGradcamOpacity,
  zoom,
  setZoom,
  resetView,
  hasLesions,
}) => {
  const t = translations[lang];

  return (
    <div className="glass-panel p-4 shadow-xl space-y-4 rounded-2xl border border-[rgba(70,170,255,0.2)]">
      {/* Header & Zoom Controls */}
      <div className="flex items-center justify-between border-b border-[rgba(70,170,255,0.15)] pb-2.5">
        <div className="flex items-center space-x-2 text-xs font-heading font-bold text-white">
          <Layers className="w-4 h-4 text-[#35b6ff]" />
          <span>Diagnostic Layer Engine</span>
        </div>

        {/* Viewport Zoom Controls */}
        <div className="flex items-center space-x-1.5 bg-[#04070d]/80 px-2 py-1 rounded-xl border border-[rgba(70,170,255,0.2)] text-[#9ab0c9]">
          <button
            type="button"
            onClick={() => setZoom(Math.max(1, zoom - 0.25))}
            className="p-1 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono px-1 font-bold text-[#35b6ff]">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom(Math.min(3, zoom + 0.25))}
            className="p-1 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={resetView}
            className="p-1 hover:text-white hover:bg-slate-800 rounded-lg transition border-l border-slate-800 pl-1.5 ml-0.5"
            title="Reset Zoom"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Exactly 4 Diagnostic Layer Options */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {/* Layer 1: Raw Fundus */}
        <button
          type="button"
          onClick={() => setActiveBaseLayer('raw')}
          className={`p-2.5 rounded-xl border flex items-center justify-between transition-all font-semibold ${
            activeBaseLayer === 'raw'
              ? 'bg-[#35b6ff]/20 border-[#35b6ff] text-[#35b6ff] shadow-[0_0_12px_rgba(53,182,255,0.25)]'
              : 'bg-[#04070d]/70 border-[rgba(70,170,255,0.15)] text-[#9ab0c9] hover:text-white'
          }`}
        >
          <span>Raw Fundus</span>
          {activeBaseLayer === 'raw' ? (
            <Eye className="w-4 h-4 text-[#35b6ff]" />
          ) : (
            <EyeOff className="w-4 h-4 text-slate-600" />
          )}
        </button>

        {/* Layer 2: Ben Graham CLAHE */}
        <button
          type="button"
          onClick={() => setActiveBaseLayer('clahe')}
          className={`p-2.5 rounded-xl border flex items-center justify-between transition-all font-semibold ${
            activeBaseLayer === 'clahe'
              ? 'bg-[#35b6ff]/20 border-[#35b6ff] text-[#35b6ff] shadow-[0_0_12px_rgba(53,182,255,0.25)]'
              : 'bg-[#04070d]/70 border-[rgba(70,170,255,0.15)] text-[#9ab0c9] hover:text-white'
          }`}
        >
          <span>Ben Graham CLAHE</span>
          {activeBaseLayer === 'clahe' ? (
            <Eye className="w-4 h-4 text-[#35b6ff]" />
          ) : (
            <EyeOff className="w-4 h-4 text-slate-600" />
          )}
        </button>

        {/* Layer 3: Grad-CAM Saliency */}
        <button
          type="button"
          onClick={() => setShowGradcam(!showGradcam)}
          className={`p-2.5 rounded-xl border flex items-center justify-between transition-all font-semibold ${
            showGradcam
              ? 'bg-[#ff8a3d]/20 border-[#ff8a3d] text-[#ff8a3d] shadow-[0_0_12px_rgba(255,138,61,0.25)]'
              : 'bg-[#04070d]/70 border-[rgba(70,170,255,0.15)] text-[#9ab0c9] hover:text-white'
          }`}
        >
          <span>Grad-CAM Saliency</span>
          {showGradcam ? (
            <Eye className="w-4 h-4 text-[#ff8a3d]" />
          ) : (
            <EyeOff className="w-4 h-4 text-slate-600" />
          )}
        </button>

        {/* Layer 4: Lesion Overlays */}
        <button
          type="button"
          onClick={() => setShowLesions(!showLesions)}
          className={`p-2.5 rounded-xl border flex items-center justify-between transition-all font-semibold ${
            showLesions
              ? 'bg-[#3dff9a]/20 border-[#3dff9a] text-[#3dff9a] shadow-[0_0_12px_rgba(61,255,154,0.25)]'
              : 'bg-[#04070d]/70 border-[rgba(70,170,255,0.15)] text-[#9ab0c9] hover:text-white'
          }`}
        >
          <span>Lesion Overlays</span>
          {showLesions ? (
            <Eye className="w-4 h-4 text-[#3dff9a]" />
          ) : (
            <EyeOff className="w-4 h-4 text-slate-600" />
          )}
        </button>
      </div>

      {/* Heatmap Opacity Slider (Smoothly controls overlay opacity directly on top of image) */}
      {showGradcam && (
        <div className="bg-[#04070d]/80 p-3 rounded-xl border border-[rgba(70,170,255,0.15)] space-y-1.5">
          <div className="flex justify-between text-[11px] font-semibold text-[#9ab0c9]">
            <span className="flex items-center space-x-1.5">
              <Sliders className="w-3.5 h-3.5 text-[#ff8a3d]" />
              <span>Heatmap Opacity</span>
            </span>
            <span className="font-mono text-[#ff8a3d] font-bold">
              {Math.round(gradcamOpacity * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0.05"
            max="1.0"
            step="0.05"
            value={gradcamOpacity}
            onChange={(e) => setGradcamOpacity(parseFloat(e.target.value))}
            className="w-full accent-[#ff8a3d] h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>
      )}

      {/* Microvasculature Biomarkers Legend */}
      {hasLesions && showLesions && (
        <div className="bg-[#04070d]/80 p-3 rounded-xl border border-[rgba(70,170,255,0.15)] text-[11px] space-y-1.5">
          <div className="font-bold text-[#eaf3ff] mb-1">Detected Biomarker Signatures:</div>
          <div className="flex items-center space-x-2 text-[#9ab0c9]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#35b6ff] shadow-[0_0_6px_#35b6ff] inline-block" />
            <span>Microaneurysms (MAs)</span>
          </div>
          <div className="flex items-center space-x-2 text-[#9ab0c9]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff4d6d] shadow-[0_0_6px_#ff4d6d] inline-block" />
            <span>Intraretinal Hemorrhages (HE)</span>
          </div>
          <div className="flex items-center space-x-2 text-[#9ab0c9]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ffb020] shadow-[0_0_6px_#ffb020] inline-block" />
            <span>Hard / Soft Exudates (EX)</span>
          </div>
        </div>
      )}
    </div>
  );
};
