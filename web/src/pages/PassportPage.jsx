import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const TRAIT_COLORS = {
  positivity: '#22c55e',
  emotional_stability: '#3b82f6',
  agency: '#f59e0b',
  leadership: '#ef4444',
  responsibility: '#8b5cf6',
  empathy: '#ec4899',
  clarity: '#06b6d4',
};

export default function PassportPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.getPassport().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-pulse text-white/50">Loading passport...</div></div>;

  if (!data?.has_data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center glass-card p-12 animate-slide-up">
          <div className="text-5xl mb-4">🎫</div>
          <h2 className="font-display text-2xl font-bold mb-3">No Passport Data Yet</h2>
          <p className="text-white/50 mb-6">Complete sessions across modules to build your soft-skill passport.</p>
          <button onClick={() => navigate('/')} className="btn-primary">Start a Session</button>
        </div>
      </div>
    );
  }

  const traits = data.overall_traits || {};
  const traitKeys = Object.keys(traits);

  // Radar chart geometry
  const cx = 150, cy = 150, r = 110;
  const angles = traitKeys.map((_, i) => (Math.PI * 2 * i) / traitKeys.length - Math.PI / 2);
  const radarPoints = traitKeys.map((k, i) => {
    const val = traits[k] || 0;
    const x = cx + r * val * Math.cos(angles[i]);
    const y = cy + r * val * Math.sin(angles[i]);
    return { x, y, label: k, val };
  });
  const radarPath = radarPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + 'Z';

  const [downloading, setDownloading] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const element = document.getElementById('passport-content');
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#09090b', // match surface-950
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`WAT_Passport_${data.user?.username || 'user'}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      window.print(); // Fallback
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8" id="passport-content">
      <div className="mb-8 animate-slide-up flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold mb-2">🎫 Personal Soft-Skill Passport</h1>
          <p className="text-white/50">Your unified profile across all WAT modules.</p>
        </div>
        <div className="flex gap-3 print:hidden">
          <button onClick={handlePrint} className="btn-ghost">
            🖨️ Print
          </button>
          <button onClick={handleDownloadPdf} disabled={downloading} className="btn-secondary whitespace-nowrap">
            {downloading ? '⏳ Generating...' : '📄 Download PDF'}
          </button>
        </div>
      </div>

      {/* Profile Card */}
      <div className="glass-card p-8 mb-8 animate-slide-up" style={{animationDelay: '0.1s'}}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Radar Chart */}
          <div className="flex justify-center">
            <svg viewBox="0 0 300 300" className="w-full max-w-[300px]">
              {/* Grid rings */}
              {[0.25, 0.5, 0.75, 1.0].map(level => (
                <polygon key={level} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1"
                  points={traitKeys.map((_, i) => {
                    const x = cx + r * level * Math.cos(angles[i]);
                    const y = cy + r * level * Math.sin(angles[i]);
                    return `${x},${y}`;
                  }).join(' ')} />
              ))}
              {/* Axis lines */}
              {traitKeys.map((_, i) => (
                <line key={i} x1={cx} y1={cy} x2={cx + r * Math.cos(angles[i])} y2={cy + r * Math.sin(angles[i])}
                  stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
              ))}
              {/* Data polygon */}
              <polygon fill="rgba(99,102,241,0.15)" stroke="#6366f1" strokeWidth="2" points={radarPoints.map(p => `${p.x},${p.y}`).join(' ')} />
              {/* Data points */}
              {radarPoints.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="4" fill={TRAIT_COLORS[p.label] || '#6366f1'} />
              ))}
              {/* Labels */}
              {traitKeys.map((k, i) => {
                const lx = cx + (r + 25) * Math.cos(angles[i]);
                const ly = cy + (r + 25) * Math.sin(angles[i]);
                return (
                  <text key={k} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
                    fill={TRAIT_COLORS[k] || '#aaa'} fontSize="9" fontWeight="600">
                    {k.replace('_', ' ')}
                  </text>
                );
              })}
            </svg>
          </div>

          {/* Info */}
          <div>
            <h2 className="font-display text-2xl font-bold mb-1">{data.user?.name}</h2>
            <p className="text-white/30 text-sm mb-6">@{data.user?.username}</p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-3 rounded-xl bg-white/5">
                <p className="text-2xl font-bold text-primary-400">{data.total_sessions}</p>
                <p className="text-xs text-white/30">Total Sessions</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5">
                <p className="text-2xl font-bold text-accent-400">{Object.keys(data.module_counts || {}).length}</p>
                <p className="text-xs text-white/30">Modules Used</p>
              </div>
            </div>

            {/* Module badges */}
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.entries(data.module_counts || {}).map(([mod, cnt]) => (
                <span key={mod} className="px-3 py-1 rounded-full bg-white/5 text-xs text-white/50">
                  {mod.toUpperCase()}: {cnt} sessions
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Strengths & Growth */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="glass-card p-6 animate-slide-up" style={{animationDelay: '0.2s'}}>
          <h3 className="font-display font-semibold text-lg mb-4 text-emerald-400">💪 Top Strengths</h3>
          <div className="space-y-3">
            {data.strengths?.map((s, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="font-medium">{s.label}</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${s.score * 100}%` }} />
                  </div>
                  <span className="font-mono text-sm text-emerald-400">{(s.score * 100).toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-6 animate-slide-up" style={{animationDelay: '0.3s'}}>
          <h3 className="font-display font-semibold text-lg mb-4 text-amber-400">🌱 Growth Areas</h3>
          <div className="space-y-3">
            {data.growth_areas?.map((s, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="font-medium">{s.label}</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${s.score * 100}%` }} />
                  </div>
                  <span className="font-mono text-sm text-amber-400">{(s.score * 100).toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="glass-card p-6 mb-8 animate-slide-up" style={{animationDelay: '0.4s'}}>
        <h3 className="font-display font-semibold text-lg mb-4">🎯 Recommended Next Steps</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-primary-500/10 border border-primary-500/20">
            <p className="text-sm text-white/40 mb-1">Recommended Module</p>
            <p className="font-semibold text-primary-300">{data.recommended_module?.toUpperCase()} Coach</p>
            <p className="text-xs text-white/30 mt-1">Your least practiced module</p>
          </div>
          <div className="p-4 rounded-xl bg-accent-500/10 border border-accent-500/20">
            <p className="text-sm text-white/40 mb-1">Focus Area</p>
            <p className="font-semibold text-accent-300 capitalize">{data.recommended_focus?.replace('_', ' ')}</p>
            <p className="text-xs text-white/30 mt-1">Trait with most room for improvement</p>
          </div>
        </div>
      </div>

      {/* All Trait Scores */}
      <div className="glass-card p-6 animate-slide-up" style={{animationDelay: '0.5s'}}>
        <h3 className="font-display font-semibold text-lg mb-4">📊 Full Trait Breakdown</h3>
        <div className="space-y-3">
          {Object.entries(traits).sort((a, b) => b[1] - a[1]).map(([key, value]) => (
            <div key={key}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-white/70 capitalize">{key.replace('_', ' ')}</span>
                <span className="font-mono text-white/50">{(value * 100).toFixed(0)}%</span>
              </div>
              <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${value * 100}%`, backgroundColor: TRAIT_COLORS[key] || '#6366f1' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
