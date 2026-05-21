/**
 * Forensic Evidence Dashboard
 * A multi-domain digital forensics evidence management interface
 * with AI-powered analysis via Gemini API.
 */

import React, {useState, useEffect} from 'react';
import {
  Shield,
  BarChart3,
  FileText,
  DollarSign,
  Search,
  ChevronRight,
  Clock,
  AlertCircle,
  Database,
  Filter,
  MoreVertical,
  Activity,
  Layers,
  LayoutGrid,
  Sparkles,
  Loader2,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Gemini API integration
// ---------------------------------------------------------------------------

const generateGeminiContent = async (prompt: string): Promise<string> => {
  const apiKey = '';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

  const payload = {
    contents: [{parts: [{text: prompt}]}],
    systemInstruction: {
      parts: [
        {
          text: 'You are an expert digital forensics and financial audit AI assistant. Respond concisely, technically, and professionally. Avoid using markdown headers, just plain text with simple bullet points if necessary.',
        },
      ],
    },
  };

  const delays = [1000, 2000, 4000, 8000, 16000];

  for (let i = 0; i < delays.length; i++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return (
        (data.candidates?.[0]?.content?.parts?.[0]?.text as string) ||
        'No analysis generated.'
      );
    } catch (e) {
      if (i === delays.length - 1)
        return `Error generating analysis: ${(e as Error).message}`;
      await new Promise(r => setTimeout(r, delays[i]));
    }
  }

  return 'Error: maximum retries reached.';
};

// ---------------------------------------------------------------------------
// Theme definitions (from COLOUR_PALETTE_SPEC_1.2)
// ---------------------------------------------------------------------------

interface Theme {
  name: string;
  domain: string;
  primary: string;
  secondary: string;
  light: string;
  bgLight: string;
  text: string;
  accent: string;
  shadow: string;
  glass: string;
}

type ThemeKey = 'hoyle' | 'kniese' | 'artefact' | 'financial';

const THEMES: Record<ThemeKey, Theme> = {
  hoyle: {
    name: 'James Hoyle',
    domain: 'Conduct & Timeline',
    primary: '#154f5c',
    secondary: '#44818e',
    light: '#88b1b9',
    bgLight: 'rgba(216, 226, 228, 0.4)',
    text: '#181919',
    accent: '#44818e',
    shadow: 'rgba(21, 79, 92, 0.12)',
    glass: 'rgba(255, 255, 255, 0.65)',
  },
  kniese: {
    name: 'Adam Kniese',
    domain: 'Conduct & Timeline',
    primary: '#6aa84f',
    secondary: '#60884e',
    light: '#b5d6a7',
    bgLight: 'rgba(218, 234, 212, 0.4)',
    text: '#1b1d1a',
    accent: '#92c37d',
    shadow: 'rgba(106, 168, 79, 0.12)',
    glass: 'rgba(255, 255, 255, 0.65)',
  },
  artefact: {
    name: 'Artefacts / Annex',
    domain: 'Technical & Specs',
    primary: '#3b3742',
    secondary: '#888691',
    light: '#eae9ee',
    bgLight: 'rgba(245, 244, 247, 0.6)',
    text: '#3b3742',
    accent: '#b4b1bc',
    shadow: 'rgba(59, 55, 66, 0.12)',
    glass: 'rgba(255, 255, 255, 0.7)',
  },
  financial: {
    name: 'Financial Evidence',
    domain: 'Loss & Audit',
    primary: '#ba2d22',
    secondary: '#d36d6b',
    light: '#fcf1ce',
    bgLight: 'rgba(255, 237, 232, 0.5)',
    text: '#181919',
    accent: '#cb7777',
    shadow: 'rgba(186, 45, 34, 0.12)',
    glass: 'rgba(255, 255, 255, 0.6)',
  },
};

type SeverityLevel = 'P1' | 'P2' | 'P3';

const SEVERITY_MAP: Record<ThemeKey, Record<SeverityLevel, string>> = {
  hoyle: {P1: '#154f5c', P2: '#44818e', P3: '#ababac'},
  kniese: {P1: '#6aa84f', P2: '#60884e', P3: '#b8bdb6'},
  artefact: {P1: '#3b3742', P2: '#888691', P3: '#c1c1c1'},
  financial: {P1: '#ba2d22', P2: '#d36d6b', P3: '#a58c8b'},
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

type CSSVarStyle = React.CSSProperties & Record<string, string>;

interface SquovalCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  blur?: string;
}

const SquovalCard: React.FC<SquovalCardProps> = ({
  children,
  className = '',
  style = {},
  blur = 'backdrop-blur-xl',
}) => (
  <div
    className={`relative overflow-hidden rounded-[2.5rem] border border-white/40 shadow-2xl transition-all duration-500 ${blur} ${className}`}
    style={{
      boxShadow: `0 20px 40px -15px var(--current-shadow), inset 0 0 0 1px rgba(255,255,255,0.4)`,
      ...style,
    }}
  >
    {children}
  </div>
);

interface GlassButtonProps {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
  color: string;
}

const GlassButton: React.FC<GlassButtonProps> = ({
  children,
  active,
  onClick,
  color,
}) => (
  <button
    onClick={onClick}
    className={`px-5 py-2.5 rounded-2xl flex items-center gap-2 transition-all duration-300 font-medium text-sm
      ${active ? 'bg-white shadow-lg scale-105' : 'hover:bg-white/40'}`}
    style={{color: active ? color : '#64748b'}}
  >
    {children}
  </button>
);

interface BadgeProps {
  level: SeverityLevel;
  themeKey: ThemeKey;
  label?: string;
}

const Badge: React.FC<BadgeProps> = ({level, themeKey, label}) => {
  const color = SEVERITY_MAP[themeKey]?.[level] ?? '#ccc';
  return (
    <span
      className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white"
      style={{backgroundColor: color}}
    >
      {label ?? level}
    </span>
  );
};

// ---------------------------------------------------------------------------
// Evidence row type
// ---------------------------------------------------------------------------

type EpistemicState = 'VERIFIED' | 'STATED' | 'INFERRED' | 'UNKNOWN';
type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

interface EvidenceRow {
  id: string;
  title: string;
  state: EpistemicState;
  severity: SeverityLevel;
  confidence: ConfidenceLevel;
}

// ---------------------------------------------------------------------------
// Main Dashboard
// ---------------------------------------------------------------------------

const ForensicDashboard: React.FC = () => {
  const [activeTheme, setActiveTheme] = useState<ThemeKey>('hoyle');
  const theme = THEMES[activeTheme];

  // AI state
  const [isAnalyzingDelta, setIsAnalyzingDelta] = useState(false);
  const [alertAnalysis, setAlertAnalysis] = useState('');
  const [isBriefing, setIsBriefing] = useState(false);
  const [briefData, setBriefData] = useState('');

  // Reset AI states when switching domains
  useEffect(() => {
    setAlertAnalysis('');
    setBriefData('');
  }, [activeTheme]);

  const handleAnalyzeDelta = async () => {
    setIsAnalyzingDelta(true);
    const prompt = `Analyze this digital forensic alert in the context of the ${theme.name} investigation (Domain: ${theme.domain}): "Detected 4 divergent timestamps in the sequence logs." Provide a very brief technical hypothesis (max 3 sentences) on what might have caused this manipulation and what metadata to check next.`;
    const result = await generateGeminiContent(prompt);
    setAlertAnalysis(result);
    setIsAnalyzingDelta(false);
  };

  const handleGenerateBrief = async () => {
    setIsBriefing(true);
    const prompt = `Write a short, professional, 3-bullet point intelligence brief for the ${theme.name} investigation (Domain: ${theme.domain}). Highlight key focus areas and potential evidentiary gaps. Limit to roughly 50 words.`;
    const result = await generateGeminiContent(prompt);
    setBriefData(result);
    setIsBriefing(false);
  };

  const evidenceData: EvidenceRow[] = [
    {
      id: 'EV-091',
      title: 'Encrypted Comms Log',
      state: 'VERIFIED',
      severity: 'P1',
      confidence: 'HIGH',
    },
    {
      id: 'EV-104',
      title: 'Geolocation Cluster',
      state: 'STATED',
      severity: 'P2',
      confidence: 'MEDIUM',
    },
    {
      id: 'EV-022',
      title: 'Device Registry Extract',
      state: 'INFERRED',
      severity: 'P3',
      confidence: 'LOW',
    },
    {
      id: 'EV-156',
      title: 'Remote Access Trigger',
      state: 'UNKNOWN',
      severity: 'P2',
      confidence: 'MEDIUM',
    },
  ];

  const rootStyle: CSSVarStyle = {
    backgroundColor: theme.bgLight,
    '--current-shadow': theme.shadow,
    backgroundImage: `radial-gradient(circle at 0% 0%, ${theme.light}22 0%, transparent 50%), radial-gradient(circle at 100% 100%, ${theme.primary}11 0%, transparent 50%)`,
  };

  const ringStyle: CSSVarStyle = {
    '--tw-ring-color': theme.primary,
  };

  return (
    <div
      className="min-h-screen p-4 md:p-8 font-sans transition-colors duration-700"
      style={rootStyle}
    >
      {/* ----------------------------------------------------------------- */}
      {/* Header Navigation                                                  */}
      {/* ----------------------------------------------------------------- */}
      <header className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-3xl flex items-center justify-center text-white shadow-lg transition-transform duration-500 hover:rotate-12"
            style={{backgroundColor: theme.primary}}
          >
            <Shield size={28} />
          </div>
          <div>
            <h1
              className="text-2xl font-black tracking-tight"
              style={{color: theme.primary}}
            >
              FORENSIC EVIDENCE PACKAGE
            </h1>
            <p className="text-sm font-medium opacity-60">
              Aiden Justin O&apos;Connor • v1.2
            </p>
          </div>
        </div>

        <nav className="flex bg-white/30 backdrop-blur-md p-1.5 rounded-[2rem] border border-white/50 shadow-inner">
          <GlassButton
            active={activeTheme === 'hoyle'}
            onClick={() => setActiveTheme('hoyle')}
            color={THEMES.hoyle.primary}
          >
            <Layers size={18} /> Hoyle
          </GlassButton>
          <GlassButton
            active={activeTheme === 'kniese'}
            onClick={() => setActiveTheme('kniese')}
            color={THEMES.kniese.primary}
          >
            <Activity size={18} /> Kniese
          </GlassButton>
          <GlassButton
            active={activeTheme === 'artefact'}
            onClick={() => setActiveTheme('artefact')}
            color={THEMES.artefact.primary}
          >
            <Database size={18} /> Artefacts
          </GlassButton>
          <GlassButton
            active={activeTheme === 'financial'}
            onClick={() => setActiveTheme('financial')}
            color={THEMES.financial.primary}
          >
            <DollarSign size={18} /> Financial
          </GlassButton>
        </nav>
      </header>

      {/* ----------------------------------------------------------------- */}
      {/* Main Bento Grid                                                    */}
      {/* ----------------------------------------------------------------- */}
      <main className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[minmax(180px,auto)]">
        {/* Domain Overview Card (AI Integrated) */}
        <SquovalCard className="md:col-span-8 p-8 flex flex-col justify-between bg-white/40">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/60 text-xs font-bold tracking-widest uppercase"
                  style={{color: theme.primary}}
                >
                  <span
                    className="w-2 h-2 rounded-full animate-pulse"
                    style={{backgroundColor: theme.primary}}
                  />
                  Current Context: {theme.domain}
                </div>

                {/* AI Brief Button */}
                {!briefData && (
                  <button
                    onClick={handleGenerateBrief}
                    disabled={isBriefing}
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/30 hover:bg-white/70 text-xs font-bold tracking-widest uppercase transition-all disabled:opacity-50 border border-white/40"
                    style={{color: theme.primary}}
                  >
                    {isBriefing ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Sparkles size={12} />
                    )}
                    {isBriefing ? 'Synthesizing…' : '✨ Draft Brief'}
                  </button>
                )}
              </div>

              <h2
                className="text-5xl font-black mb-2"
                style={{color: theme.primary}}
              >
                {theme.name}
              </h2>

              {/* AI Generated Content Area */}
              {briefData ? (
                <div
                  className="mt-4 p-5 rounded-3xl bg-white/60 border border-white/50 text-sm leading-relaxed opacity-90 shadow-sm"
                  style={{color: theme.primary}}
                >
                  <div className="font-black text-[10px] uppercase opacity-70 mb-2 flex items-center gap-2">
                    <Sparkles size={12} /> Executive AI Summary
                  </div>
                  <div style={{whiteSpace: 'pre-wrap'}}>{briefData}</div>
                </div>
              ) : (
                <p className="text-lg max-w-xl opacity-80 leading-relaxed">
                  Active investigation phase targeting{' '}
                  {theme.name.split(' ')[0]}&apos;s metadata clusters and
                  sequential behavioral markers.
                </p>
              )}
            </div>

            <div className="hidden lg:block">
              <div className="w-32 h-32 rounded-full border-[10px] border-white/40 flex items-center justify-center relative overflow-hidden">
                <div
                  className="absolute inset-0 opacity-20"
                  style={{backgroundColor: theme.primary}}
                />
                <BarChart3 size={48} style={{color: theme.primary}} />
              </div>
            </div>
          </div>

          <div className="mt-8 flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {['Integrity Check', 'Cross-Reference', 'Latency Mask'].map(
              (label, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 px-6 py-4 rounded-3xl bg-white/60 border border-white/40 flex items-center gap-4"
                >
                  <div
                    className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-sm"
                    style={{color: theme.primary}}
                  >
                    <Clock size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase opacity-50">
                      {label}
                    </p>
                    <p className="text-sm font-bold">14 May 2026</p>
                  </div>
                </div>
              ),
            )}
          </div>
        </SquovalCard>

        {/* Quick Stats Card */}
        <SquovalCard
          className="md:col-span-4 p-8 bg-gradient-to-br from-white/80 to-white/20"
          blur="backdrop-blur-2xl"
        >
          <div className="flex justify-between mb-6">
            <div
              className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-lg"
              style={{color: theme.primary}}
            >
              <LayoutGrid size={24} />
            </div>
            <button className="text-slate-400 hover:text-slate-600 transition-colors">
              <MoreVertical size={20} />
            </button>
          </div>
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">
            Total Artefacts
          </h3>
          <p
            className="text-6xl font-black mb-6"
            style={{color: theme.primary}}
          >
            1,482
          </p>
          <div className="space-y-4">
            <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-1000"
                style={{width: '65%', backgroundColor: theme.primary}}
              />
            </div>
            <div className="flex justify-between text-xs font-bold">
              <span className="opacity-50 uppercase">Data Saturation</span>
              <span style={{color: theme.primary}}>65%</span>
            </div>
          </div>
        </SquovalCard>

        {/* Evidence Register Table */}
        <SquovalCard
          className="md:col-span-12 lg:col-span-9 p-0 overflow-hidden bg-white/30"
          blur="backdrop-blur-xl"
        >
          <div className="p-6 flex justify-between items-center bg-white/20 border-b border-white/20">
            <h3
              className="font-black flex items-center gap-2"
              style={{color: theme.primary}}
            >
              <FileText size={20} />
              MASTER EVIDENCE REGISTER
            </h3>
            <div className="flex gap-2">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30"
                  size={14}
                />
                <input
                  type="text"
                  placeholder="Filter claims…"
                  className="bg-white/50 border border-white/50 rounded-xl py-1.5 pl-9 pr-4 text-xs focus:outline-none focus:ring-2"
                  style={ringStyle}
                />
              </div>
              <button className="p-1.5 rounded-xl bg-white/50 border border-white/50 hover:bg-white transition-colors">
                <Filter size={14} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr
                  className="text-[10px] font-black uppercase tracking-tighter"
                  style={{color: theme.secondary}}
                >
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Evidence Dimension</th>
                  <th className="px-6 py-4 text-center">Epistemic State</th>
                  <th className="px-6 py-4 text-center">Severity</th>
                  <th className="px-6 py-4">Action</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {evidenceData.map((row, idx) => (
                  <tr
                    key={row.id}
                    className={`transition-colors duration-200 group ${
                      idx % 2 === 0 ? 'bg-white/10' : 'bg-transparent'
                    }`}
                  >
                    <td
                      className="px-6 py-4 font-mono font-bold text-xs"
                      style={{color: theme.primary}}
                    >
                      {row.id}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-bold">{row.title}</div>
                        <div className="text-[10px] opacity-40 font-bold uppercase">
                          Confidence:{' '}
                          <span
                            className={`ml-1 ${
                              row.confidence === 'HIGH'
                                ? 'font-black'
                                : row.confidence === 'LOW'
                                  ? 'italic'
                                  : ''
                            }`}
                            style={{color: theme.primary}}
                          >
                            {row.confidence}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className="px-3 py-1 rounded-lg text-[10px] font-black border"
                        style={{
                          borderColor: `${theme.secondary}44`,
                          backgroundColor: `${theme.secondary}11`,
                          color: theme.primary,
                        }}
                      >
                        {row.state}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge level={row.severity} themeKey={activeTheme} />
                    </td>
                    <td className="px-6 py-4">
                      <button className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/80 transition-all opacity-0 group-hover:opacity-100">
                        <ChevronRight size={16} style={{color: theme.primary}} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SquovalCard>

        {/* Integrity Alert Card (AI Integrated) */}
        <SquovalCard className="md:col-span-6 lg:col-span-3 p-6 bg-white/40 border-none flex flex-col justify-between">
          {isAnalyzingDelta ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-60">
              <Loader2
                className="animate-spin mb-4"
                size={32}
                style={{color: theme.primary}}
              />
              <p
                className="text-[10px] font-black uppercase tracking-widest"
                style={{color: theme.primary}}
              >
                AI Diagnostic Running…
              </p>
            </div>
          ) : alertAnalysis ? (
            <div className="flex-1 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={16} style={{color: theme.primary}} />
                <h4
                  className="font-black text-sm uppercase tracking-wider"
                  style={{color: theme.primary}}
                >
                  AI Hypothesis
                </h4>
              </div>
              <div
                className="flex-1 overflow-y-auto pr-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden text-xs leading-relaxed opacity-90"
                style={{color: theme.primary, whiteSpace: 'pre-wrap'}}
              >
                {alertAnalysis}
              </div>
            </div>
          ) : (
            <div className="flex-1">
              <AlertCircle className="mb-4" style={{color: theme.primary}} />
              <h4
                className="font-black text-xl mb-1"
                style={{color: theme.primary}}
              >
                Integrity Alert
              </h4>
              <p className="text-sm opacity-60 leading-tight">
                Detected 4 divergent timestamps in the sequence logs.
              </p>
            </div>
          )}

          {!alertAnalysis && !isAnalyzingDelta && (
            <button
              onClick={handleAnalyzeDelta}
              className="w-full py-3 rounded-2xl font-black text-xs uppercase tracking-widest mt-6 text-white shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
              style={{
                backgroundColor: theme.primary,
                boxShadow: `0 8px 20px -6px ${theme.primary}66`,
              }}
            >
              <Sparkles size={14} /> Analyze Delta
            </button>
          )}
        </SquovalCard>

        {/* Provenance Chain Card */}
        <SquovalCard className="md:col-span-6 lg:col-span-6 p-8 bg-white/60">
          <div className="flex items-center gap-3 mb-6">
            <div
              className="p-2 rounded-xl bg-white shadow-sm"
              style={{color: theme.primary}}
            >
              <Database size={20} />
            </div>
            <h4 className="font-black" style={{color: theme.primary}}>
              Provenance Chain
            </h4>
          </div>
          <div className="space-y-6">
            {[
              {
                label: 'Asset ID',
                value: 'DOC-V-4992-B',
                sub: 'Technical Catalogue',
              },
              {
                label: 'Blockchain Hash',
                value: '0x44a2…99bc',
                sub: 'Verified 09:02',
              },
            ].map((item, i) => (
              <div
                key={i}
                className="flex justify-between items-end border-b border-white/20 pb-2"
              >
                <div>
                  <p className="text-[10px] font-black uppercase opacity-40 mb-1">
                    {item.label}
                  </p>
                  <p className="text-sm font-bold" style={{color: theme.primary}}>
                    {item.value}
                  </p>
                </div>
                <span className="text-[9px] font-bold opacity-30 uppercase">
                  {item.sub}
                </span>
              </div>
            ))}
          </div>
        </SquovalCard>

        {/* Loss Audit Stream Card */}
        <SquovalCard
          className="md:col-span-12 lg:col-span-6 p-8 bg-white/20"
          blur="backdrop-blur-sm"
        >
          <div className="flex justify-between items-center mb-6">
            <h4
              className="font-black flex items-center gap-2"
              style={{color: theme.primary}}
            >
              <Activity size={18} /> LOSS AUDIT STREAM
            </h4>
            <span
              className="text-[10px] px-2 py-0.5 rounded bg-white font-bold"
              style={{color: theme.primary}}
            >
              LIVE FEED
            </span>
          </div>
          <div className="flex gap-4 items-end h-32">
            {[45, 80, 60, 90, 40, 70, 85, 100, 50, 75].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-lg transition-all duration-1000 hover:brightness-110"
                style={{
                  height: `${h}%`,
                  backgroundColor: `${theme.primary}33`,
                  borderTop: `2px solid ${theme.primary}`,
                }}
              />
            ))}
          </div>
          <div className="mt-4 flex justify-between">
            <div className="text-center">
              <p className="text-[10px] font-bold opacity-40 uppercase">
                Projected Loss
              </p>
              <p className="font-black" style={{color: theme.primary}}>
                $142,000.00
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-bold opacity-40 uppercase">
                Recovery Delta
              </p>
              <p className="font-black" style={{color: theme.primary}}>
                -$12,402.11
              </p>
            </div>
          </div>
        </SquovalCard>
      </main>

      {/* ----------------------------------------------------------------- */}
      {/* Footer                                                             */}
      {/* ----------------------------------------------------------------- */}
      <footer className="max-w-7xl mx-auto mt-12 mb-8 flex justify-between items-center opacity-30 text-[10px] font-bold uppercase tracking-widest border-t border-white/20 pt-8">
        <span>© 2026 Forensic Systems</span>
        <span>Aiden Justin O&apos;Connor • COLOUR_PALETTE_SPEC_1.2</span>
        <span>Secured Environment</span>
      </footer>
    </div>
  );
};

export default ForensicDashboard;
