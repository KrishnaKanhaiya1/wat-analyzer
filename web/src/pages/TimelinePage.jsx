import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

const TRAIT_COLORS = {
  positivity: '#22c55e',
  emotional_stability: '#3b82f6',
  agency: '#f59e0b',
  leadership: '#ef4444',
  responsibility: '#8b5cf6',
  empathy: '#ec4899',
  clarity: '#06b6d4',
};

const MODULE_COLORS = { ssb: '#f59e0b', interview: '#3b82f6', student: '#22c55e', workplace: '#a855f7' };

export default function TimelinePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTraits, setSelectedTraits] = useState(['positivity', 'agency', 'leadership', 'empathy']);
  const navigate = useNavigate();

  useEffect(() => {
    api.getTimeline().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-pulse text-white/50">Loading timeline...</div></div>;
  }

  if (!data || data.timeline?.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center glass-card p-12 animate-slide-up">
          <div className="text-5xl mb-4">📈</div>
          <h2 className="font-display text-2xl font-bold mb-3">No Timeline Data Yet</h2>
          <p className="text-white/50 mb-6">Complete at least 2 sessions to see your evolution over time.</p>
          <button onClick={() => navigate('/')} className="btn-primary">Start a Session</button>
        </div>
      </div>
    );
  }

  const toggleTrait = (t) => {
    setSelectedTraits(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  // Chart dimensions
  const chartW = 800;
  const chartH = 300;
  const padL = 50, padR = 20, padT = 20, padB = 40;
  const innerW = chartW - padL - padR;
  const innerH = chartH - padT - padB;

  const points = data.timeline;
  const xStep = points.length > 1 ? innerW / (points.length - 1) : innerW;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8 animate-slide-up">
        <h1 className="font-display text-3xl font-bold mb-2">📈 Thought Pattern Timeline</h1>
        <p className="text-white/50">Track how your traits evolve across all sessions and modules.</p>
      </div>

      {/* Trait Selector */}
      <div className="flex flex-wrap gap-2 mb-6 animate-slide-up" style={{animationDelay: '0.1s'}}>
        {Object.keys(TRAIT_COLORS).map(trait => (
          <button key={trait} onClick={() => toggleTrait(trait)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
              selectedTraits.includes(trait)
                ? 'border-white/30 bg-white/10 text-white'
                : 'border-white/5 bg-white/[0.02] text-white/30'
            }`}
            style={selectedTraits.includes(trait) ? { borderColor: TRAIT_COLORS[trait] + '60' } : {}}
          >
            <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: TRAIT_COLORS[trait] }} />
            {trait.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* SVG Chart */}
      <div className="glass-card p-6 mb-8 animate-slide-up overflow-x-auto" style={{animationDelay: '0.2s'}}>
        <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full min-w-[600px]" preserveAspectRatio="xMidYMid meet">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map(v => {
            const y = padT + innerH * (1 - v);
            return (
              <g key={v}>
                <line x1={padL} x2={chartW - padR} y1={y} y2={y} stroke="rgba(255,255,255,0.06)" />
                <text x={padL - 8} y={y + 4} textAnchor="end" fill="rgba(255,255,255,0.3)" fontSize="10">{(v * 100).toFixed(0)}%</text>
              </g>
            );
          })}

          {/* Lines for each selected trait */}
          {selectedTraits.map(trait => {
            const color = TRAIT_COLORS[trait];
            const pathData = points.map((p, i) => {
              const x = padL + (points.length > 1 ? i * xStep : xStep / 2);
              const y = padT + innerH * (1 - (p.scores?.[trait] || 0));
              return `${i === 0 ? 'M' : 'L'}${x},${y}`;
            }).join(' ');

            return (
              <g key={trait}>
                <path d={pathData} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
                {points.map((p, i) => {
                  const x = padL + (points.length > 1 ? i * xStep : xStep / 2);
                  const y = padT + innerH * (1 - (p.scores?.[trait] || 0));
                  return <circle key={i} cx={x} cy={y} r="4" fill={color} opacity="0.9" />;
                })}
              </g>
            );
          })}

          {/* X-axis labels */}
          {points.map((p, i) => {
            const x = padL + (points.length > 1 ? i * xStep : xStep / 2);
            return (
              <g key={i}>
                <circle cx={x} cy={chartH - padB + 15} r="5" fill={MODULE_COLORS[p.module] || '#666'} />
                <text x={x} y={chartH - padB + 30} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="8">
                  {new Date(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Module legend */}
        <div className="flex flex-wrap gap-4 mt-4 justify-center text-xs">
          {Object.entries(MODULE_COLORS).map(([m, c]) => (
            <span key={m} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full" style={{backgroundColor: c}} /> {m.toUpperCase()}
            </span>
          ))}
        </div>
      </div>

      {/* Weak Themes */}
      {data.weak_themes?.length > 0 && (
        <div className="glass-card p-6 animate-slide-up" style={{animationDelay: '0.3s'}}>
          <h3 className="font-display font-semibold text-lg mb-4">🏷️ Recurring Weak Themes</h3>
          <p className="text-white/40 text-sm mb-4">Themes where your responses consistently scored below 40%. Focus on these for improvement.</p>
          <div className="flex flex-wrap gap-3">
            {data.weak_themes.map((t, i) => (
              <div key={i} className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <span className="text-amber-300 font-medium">{t.theme}</span>
                <span className="text-white/30 text-xs ml-2">({t.count} responses, avg {(t.avg_score * 100).toFixed(0)}%)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 text-center text-white/20 text-sm">
        Total sessions tracked: {data.total_sessions}
      </div>
    </div>
  );
}
