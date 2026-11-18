import React, { useState } from 'react';
import {
  User,
  Calendar,
  Users,
  Eye,
  Activity,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  FileCheck2,
  HeartPulse,
  AlertCircle,
  Sparkles,
  Stethoscope,
  Info
} from 'lucide-react';
import { Language, translations } from '../utils/language';

export interface ActivePatientState {
  name: string;
  age: number;
  gender: string;
  eyeSide: 'RIGHT' | 'LEFT';
  historyItems: string[];
  historyNote: string;
  symptomsItems: string[];
  symptomsNote: string;
  combinedHistory: string;
}

interface PatientIntakeProps {
  lang: Language;
  initialPatient: ActivePatientState;
  onSaveAndProceed: (patient: ActivePatientState) => void;
  onSwitchToDemo: () => void;
}

const HISTORY_OPTIONS = [
  { id: 'diabetes', labelEn: 'Diabetes (Type 1 or 2)', labelHi: 'डायबिटीज (शुगर)' },
  { id: 'hypertension', labelEn: 'High Blood Pressure', labelHi: 'उच्च रक्तचाप (बीपी)' },
  { id: 'prior_surgery', labelEn: 'Previous Eye Surgery / Laser', labelHi: 'पिछली आँख सर्जरी / लेजर' },
  { id: 'cataract', labelEn: 'Cataract Diagnosed', labelHi: 'मोतियाबिंद' },
  { id: 'none', labelEn: 'No Known Medical History', labelHi: 'कोई बीमारी नहीं' },
];

const SYMPTOM_OPTIONS = [
  { id: 'blurred_vision', labelEn: 'Blurred Vision', labelHi: 'धुंधला दिखना' },
  { id: 'floaters', labelEn: 'Floaters / Black Spots', labelHi: 'काले धब्बे / तैरते कीड़े' },
  { id: 'eye_pain', labelEn: 'Eye Pain or Strain', labelHi: 'आँख में दर्द / खिंचाव' },
  { id: 'night_vision', labelEn: 'Difficulty in Low Light', labelHi: 'कम रोशनी में कम दिखना' },
  { id: 'routine_checkup', labelEn: 'Routine Camp Checkup (No Issue)', labelHi: 'नियमित शिविर जांच (कोई दिक्कत नहीं)' },
];

export const PatientIntake: React.FC<PatientIntakeProps> = ({
  lang,
  initialPatient,
  onSaveAndProceed,
  onSwitchToDemo,
}) => {
  const t = translations[lang];

  const [name, setName] = useState(initialPatient.name || 'Rajesh Sharma');
  const [age, setAge] = useState(initialPatient.age || 58);
  const [gender, setGender] = useState(initialPatient.gender || 'Male');
  const [eyeSide, setEyeSide] = useState<'RIGHT' | 'LEFT'>(initialPatient.eyeSide || 'RIGHT');

  const [historyItems, setHistoryItems] = useState<string[]>(
    initialPatient.historyItems && initialPatient.historyItems.length > 0
      ? initialPatient.historyItems
      : ['Diabetes (Type 1 or 2)']
  );
  const [historyNote, setHistoryNote] = useState(initialPatient.historyNote || '7 yrs, on medication');

  const [symptomsItems, setSymptomsItems] = useState<string[]>(
    initialPatient.symptomsItems && initialPatient.symptomsItems.length > 0
      ? initialPatient.symptomsItems
      : ['Blurred Vision']
  );
  const [symptomsNote, setSymptomsNote] = useState(initialPatient.symptomsNote || '');

  const toggleHistoryItem = (itemLabel: string) => {
    if (itemLabel.includes('No Known') || itemLabel.includes('कोई बीमारी नहीं')) {
      setHistoryItems([itemLabel]);
      return;
    }
    const filtered = historyItems.filter((i) => !i.includes('No Known') && !i.includes('कोई बीमारी नहीं'));
    if (filtered.includes(itemLabel)) {
      setHistoryItems(filtered.filter((i) => i !== itemLabel));
    } else {
      setHistoryItems([...filtered, itemLabel]);
    }
  };

  const toggleSymptomItem = (itemLabel: string) => {
    if (itemLabel.includes('Routine') || itemLabel.includes('नियमित')) {
      setSymptomsItems([itemLabel]);
      return;
    }
    const filtered = symptomsItems.filter((i) => !i.includes('Routine') && !i.includes('नियमित'));
    if (filtered.includes(itemLabel)) {
      setSymptomsItems(filtered.filter((i) => i !== itemLabel));
    } else {
      setSymptomsItems([...filtered, itemLabel]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Construct clinical combinedHistory for backend compatibility
    const historyPart = historyItems.join(', ') + (historyNote.trim() ? ` (${historyNote.trim()})` : '');
    const symptomPart = symptomsItems.join(', ') + (symptomsNote.trim() ? ` [${symptomsNote.trim()}]` : '');
    const combinedHistory = `${historyPart || 'No Prior Medical History'} • Symptoms: ${symptomPart || 'None reported'}`;

    const updated: ActivePatientState = {
      name: name.trim() || 'Anonymous Patient',
      age: Number(age) || 50,
      gender,
      eyeSide,
      historyItems,
      historyNote,
      symptomsItems,
      symptomsNote,
      combinedHistory,
    };

    onSaveAndProceed(updated);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pop-in">
      {/* Onboarding Header Banner */}
      <div className="glass-panel p-6 sm:p-7 rounded-2xl border border-sky-500/30 bg-slate-950/80 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                STEP 1 OF 2 • {lang === 'hi' ? 'मरीज पंजीकरण' : 'PATIENT INTAKE'}
              </span>
              <span className="text-[10px] font-mono text-emerald-400 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-ping" />
                <span>{lang === 'hi' ? 'शिविर ऑपरेटर मोड' : 'Rural PHC Operator Mode'}</span>
              </span>
            </div>
            <h1 className="font-heading font-black text-xl sm:text-2xl text-white">
              {lang === 'hi' ? 'मरीज विवरण एवं स्वास्थ्य इतिहास' : 'Patient Registration & Health Intake'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300/90 mt-1 leading-relaxed">
              {lang === 'hi'
                ? 'रेटिना फोटो लेने से पहले मरीज की मूल जानकारी एवं लक्षण दर्ज करें।'
                : 'Enter patient demographic details and clinical history before fundus photograph capture.'}
            </p>
          </div>

          <button
            type="button"
            onClick={onSwitchToDemo}
            className="shrink-0 flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-sky-500/30 text-sky-300 hover:text-white hover:border-sky-400 text-xs font-bold transition shadow-sm self-start sm:self-auto"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{lang === 'hi' ? 'डेमो मोड खोलें' : 'Try Demo Mode'}</span>
          </button>
        </div>
      </div>

      {/* Main Intake Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Demographics */}
        <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-sky-500/20 bg-slate-950/70 shadow-xl space-y-4">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-sky-500/15">
            <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/40 flex items-center justify-center font-heading font-bold text-xs">
              1
            </div>
            <h2 className="font-heading font-bold text-sm sm:text-base text-white">
              {lang === 'hi' ? 'मूल विवरण (Demographics)' : 'Basic Demographics'}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center space-x-1.5">
                <User className="w-3.5 h-3.5 text-sky-400" />
                <span>{lang === 'hi' ? 'मरीज का पूरा नाम' : 'Patient Full Name'}</span>
                <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ramesh Kumar Patel"
                className="w-full px-4 py-2.5 min-h-[44px] bg-slate-900/90 border border-sky-500/25 focus:border-sky-400 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400/30 transition-all font-medium"
              />
            </div>

            {/* Age */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-sky-400" />
                <span>{lang === 'hi' ? 'उम्र (वर्ष)' : 'Age (Years)'}</span>
                <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                required
                min={1}
                max={120}
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                className="w-full px-4 py-2.5 min-h-[44px] bg-slate-900/90 border border-sky-500/25 focus:border-sky-400 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-400/30 transition-all font-medium"
              />
            </div>

            {/* Gender */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center space-x-1.5">
                <Users className="w-3.5 h-3.5 text-sky-400" />
                <span>{lang === 'hi' ? 'लिंग' : 'Gender'}</span>
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-4 py-2.5 min-h-[44px] bg-slate-900/90 border border-sky-500/25 focus:border-sky-400 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-400/30 transition-all font-medium cursor-pointer"
              >
                <option value="Male">{t.male}</option>
                <option value="Female">{t.female}</option>
                <option value="Other">{t.other}</option>
              </select>
            </div>

            {/* Eye Side Selection */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
                <span className="flex items-center space-x-1.5">
                  <Eye className="w-3.5 h-3.5 text-sky-400" />
                  <span>{lang === 'hi' ? 'जांची जाने वाली आँख (Eye to Evaluate)' : 'Eye to Evaluate for this Scan'}</span>
                  <span className="text-rose-400">*</span>
                </span>
                <span className="text-[11px] text-slate-400">OD = Right Eye, OS = Left Eye</span>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setEyeSide('RIGHT')}
                  className={`py-3 px-4 min-h-[48px] rounded-xl border text-xs sm:text-sm font-bold transition-all flex items-center justify-center space-x-2.5 ${
                    eyeSide === 'RIGHT'
                      ? 'bg-sky-500/25 border-sky-400 text-sky-200 shadow-[0_0_18px_rgba(56,189,248,0.35)] ring-2 ring-sky-400'
                      : 'bg-slate-900/70 border-slate-700/60 text-slate-400 hover:text-white hover:border-slate-600'
                  }`}
                >
                  <span className="w-3 h-3 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8]" />
                  <span>{lang === 'hi' ? 'दाहिनी आँख (Right Eye - OD)' : 'Right Eye (OD)'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEyeSide('LEFT')}
                  className={`py-3 px-4 min-h-[48px] rounded-xl border text-xs sm:text-sm font-bold transition-all flex items-center justify-center space-x-2.5 ${
                    eyeSide === 'LEFT'
                      ? 'bg-sky-500/25 border-sky-400 text-sky-200 shadow-[0_0_18px_rgba(56,189,248,0.35)] ring-2 ring-sky-400'
                      : 'bg-slate-900/70 border-slate-700/60 text-slate-400 hover:text-white hover:border-slate-600'
                  }`}
                >
                  <span className="w-3 h-3 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8]" />
                  <span>{lang === 'hi' ? 'बाईं आँख (Left Eye - OS)' : 'Left Eye (OS)'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Previous Medical & Eye History */}
        <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-sky-500/20 bg-slate-950/70 shadow-xl space-y-4">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-sky-500/15">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center font-heading font-bold text-xs">
              2
            </div>
            <div>
              <h2 className="font-heading font-bold text-sm sm:text-base text-white">
                {lang === 'hi' ? 'पूर्व बीमारी एवं आँख का इतिहास' : 'Previous Medical & Eye History'}
              </h2>
              <p className="text-[11px] text-slate-400 font-medium">
                {lang === 'hi' ? 'पहले कोई बीमारी या आँख का इलाज हुआ है?' : 'Select all conditions diagnosed previously'}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {HISTORY_OPTIONS.map((opt) => {
                const isChecked = historyItems.some((i) => i.includes(opt.labelEn) || i.includes(opt.labelHi));
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleHistoryItem(lang === 'hi' ? opt.labelHi : opt.labelEn)}
                    className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all flex items-center justify-between ${
                      isChecked
                        ? 'bg-amber-950/35 border-amber-400 text-amber-200 ring-1 ring-amber-400/60 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                        : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    <span>{lang === 'hi' ? opt.labelHi : opt.labelEn}</span>
                    <span
                      className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] ${
                        isChecked ? 'bg-amber-500 border-amber-400 text-slate-950 font-black' : 'border-slate-700'
                      }`}
                    >
                      {isChecked ? '✓' : ''}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Optional History Note */}
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                {lang === 'hi' ? 'अतिरिक्त टिप्पणी / दवाएं (वैकल्पिक):' : 'Additional History Details (Optional):'}
              </label>
              <input
                type="text"
                value={historyNote}
                onChange={(e) => setHistoryNote(e.target.value)}
                placeholder="e.g. 7 years diabetic, HbA1c 8.1%, taking metformin"
                className="w-full px-3.5 py-2 bg-slate-900/90 border border-slate-800 focus:border-amber-400 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-400 transition"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Current Symptoms */}
        <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-sky-500/20 bg-slate-950/70 shadow-xl space-y-4">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-sky-500/15">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-heading font-bold text-xs">
              3
            </div>
            <div>
              <h2 className="font-heading font-bold text-sm sm:text-base text-white">
                {lang === 'hi' ? 'वर्तमान लक्षण (Current Symptoms)' : 'Current Visual Symptoms'}
              </h2>
              <p className="text-[11px] text-slate-400 font-medium">
                {lang === 'hi' ? 'अभी मरीज को क्या दिक्कत हो रही है?' : 'Select any symptoms experienced recently'}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {SYMPTOM_OPTIONS.map((opt) => {
                const isChecked = symptomsItems.some((i) => i.includes(opt.labelEn) || i.includes(opt.labelHi));
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleSymptomItem(lang === 'hi' ? opt.labelHi : opt.labelEn)}
                    className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all flex items-center justify-between ${
                      isChecked
                        ? 'bg-emerald-950/35 border-emerald-400 text-emerald-200 ring-1 ring-emerald-400/60 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                        : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    <span>{lang === 'hi' ? opt.labelHi : opt.labelEn}</span>
                    <span
                      className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] ${
                        isChecked ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-black' : 'border-slate-700'
                      }`}
                    >
                      {isChecked ? '✓' : ''}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Optional Symptoms Note */}
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                {lang === 'hi' ? 'लक्षणों का विवरण / कब से है (वैकल्पिक):' : 'Symptoms Duration or Notes (Optional):'}
              </label>
              <input
                type="text"
                value={symptomsNote}
                onChange={(e) => setSymptomsNote(e.target.value)}
                placeholder="e.g. Mild blurring for last 3 months, worse in morning"
                className="w-full px-3.5 py-2 bg-slate-900/90 border border-slate-800 focus:border-emerald-400 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-400 transition"
              />
            </div>
          </div>
        </div>

        {/* Primary Action Button: Save & Go to Diagnostic Scan */}
        <div className="pt-2">
          <button
            type="submit"
            className="w-full min-h-[52px] py-4 px-6 rounded-xl font-heading font-black text-sm tracking-wide flex items-center justify-center space-x-2.5 transition-all shadow-2xl btn-shimmer text-slate-950 active:scale-[0.99]"
          >
            <ShieldCheck className="w-5 h-5 text-slate-950" />
            <span>{lang === 'hi' ? 'विवरण सहेजें एवं स्कैन पर जाएं →' : 'Save Patient Details & Go to Diagnostic Scan →'}</span>
          </button>
          <p className="text-center text-[11px] text-slate-400 mt-2.5">
            {lang === 'hi'
              ? 'अगले चरण में फंडस फोटो अपलोड कर एआई द्वारा 15 सेकंड में जांच की जाएगी।'
              : 'Next step: Upload fundus eye photograph for instant 15-second AI diabetic retinopathy screening.'}
          </p>
        </div>
      </form>
    </div>
  );
};

