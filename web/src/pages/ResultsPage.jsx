import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

const TRAIT_COLORS = {
  positivity: '#22c55e',
  emotional_stability: '#3b82f6',
  agency: '#f59e0b',
  leadership: '#ef4444',
  responsibility: '#8b5cf6',
  empathy: '#ec4899',
  clarity: '#06b6d4',
};

const EMOTION_EMOJIS = {
  joy: '😊', confidence: '💪', leadership: '👑', assertive: '💼', 
  collaborative: '🤝', empathetic: '❤️', calm: '🧘', intense: '🔥'
};

export default function ResultsPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedResponse, setExpandedResponse] = useState(null);
  const [highlights, setHighlights] = useState({});
  const [rewriteModal, setRewriteModal] = useState(null);
  const [rewrites, setRewrites] = useState(null);
  const [rewriteLoading, setRewriteLoading] = useState(false);

  useEffect(() => {
    loadResults();
  }, [sessionId]);

  const loadResults = async () => {
    try {
      const data = await api.getSessionResults(sessionId);
      setResults(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const loadHighlights = async (responseId) => {
    if (highlights[responseId]) return;
    try {
      const data = await api.getHighlights(responseId);
      setHighlights(prev => ({ ...prev, [responseId]: data }));
    } catch (err) {
      console.error(err);
    }
  };

  const openRewriteCoach = async (response) => {
    setRewriteModal(response);
    setRewrites(null);
    setRewriteLoading(true);
    try {
      const weakTraits = Object.entries(response.trait_scores || {})
        .sort((a, b) => a[1] - b[1])
        .slice(0, 3)
        .map(([k]) => k);
      const data = await api.suggestRewrites({
        text: response.user_text,
        prompt_word: response.prompt_word,
        focus_traits: weakTraits,
        module: results.module,
      });
      setRewrites(data);
    } catch (err) {
      console.error(err);
    }
    setRewriteLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-950">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 mb-6 animate-glow shadow-2xl shadow-primary-500/20"></div>
          <p className="text-white/40 font-display text-lg tracking-widest uppercase">Initializing AI Analysis</p>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-950">
        <div className="text-center glass-card p-12">
          <p className="text-white/50 mb-6 text-xl">Session analysis is lost in the matrix</p>
          <button onClick={() => navigate('/')} className="btn-primary">Return to Dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-950 text-white selection:bg-primary-500/30">
      {/* 10/10 Header */}
      <div className="border-b border-white/5 bg-surface-950/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button onClick={() => navigate('/sessions')} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">←</button>
            <div>
              <h1 className="font-display text-xl font-bold">Analysis Studio</h1>
              <p className="text-xs text-white/30 truncate max-w-[200px]">{results.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-3 py-1 rounded-full bg-primary-500/10 text-primary-400 text-xs font-bold border border-primary-500/20">
              {results.module?.toUpperCase()}
            </div>
            <div className="h-6 w-px bg-white/10 mx-2" />
            <span className="text-sm text-white/40">{new Date(results.completed_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-10">
        <div className="flex flex-col lg:flex-row gap-10 items-start">
          
          {/* Main Content: The Feed (60%) */}
          <div className="w-full lg:w-3/5 space-y-8 animate-slide-up">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-display text-2xl font-bold text-white/90">Review Transcript</h2>
              <span className="text-white/30 text-sm">{results.responses?.length} Interlinked Samples</span>
            </div>

            <div className="space-y-6">
              {results.responses?.map((resp, idx) => (
                <ResponseStudioCard
                  key={resp.id}
                  response={resp}
                  index={idx}
                  expanded={expandedResponse === resp.id}
                  onToggle={() => {
                    setExpandedResponse(expandedResponse === resp.id ? null : resp.id);
                    if (expandedResponse !== resp.id) loadHighlights(resp.id);
                  }}
                  tokenHighlights={highlights[resp.id]?.token_highlights}
                  onRewrite={() => openRewriteCoach(resp)}
                />
              ))}
            </div>
          </div>

          {/* Sticky Intelligence Sidebar (40%) */}
          <div className="w-full lg:w-2/5 lg:sticky lg:top-32 space-y-8 animate-slide-up" style={{animationDelay: '0.1s'}}>
            <div className="glass-card p-1 relative group overflow-hidden bg-gradient-to-br from-white/5 to-transparent">
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="font-display font-bold text-xl uppercase tracking-tighter text-white/80">Intelligence Center</h3>
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs animate-pulse">●</div>
                </div>
                
                <TraitRadarChart traits={results.overall_scores} />

                <div className="mt-10 pt-10 border-t border-white/5">
                  <h4 className="text-xs font-bold text-white/30 uppercase tracking-[2px] mb-6">Domain Assessment</h4>
                  <div className="space-y-4">
                    {results.overall_domain_traits?.map((dt, i) => (
                      <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all group">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${dt.level === 'strong' ? 'bg-emerald-500' : 'bg-primary-500'}`} />
                          <span className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">{dt.label}</span>
                        </div>
                        <span className={`trait-${dt.level} text-[9px] uppercase font-black px-2 py-0.5 rounded-md`}>
                          {dt.level.replace('_',' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* AI Summary Card */}
            {results.explanations?.length > 0 && (
              <div className="glass-card p-8 bg-gradient-to-br from-primary-500/5 to-accent-500/5 border-primary-500/20">
                <div className="flex items-center gap-3 mb-6 font-display font-bold text-lg">
                  <span className="text-2xl">💡</span> Strategic Insights
                </div>
                <div className="space-y-4">
                  {results.explanations.map((exp, i) => (
                    <p key={i} className="text-sm text-white/60 leading-relaxed italic border-l-2 border-primary-500/30 pl-4">{exp.explanation}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rewrite Coach Modal */}
      {rewriteModal && (
        <RewriteModal
          response={rewriteModal}
          rewrites={rewrites}
          loading={rewriteLoading}
          onClose={() => setRewriteModal(null)}
        />
      )}
    </div>
  );
}

function ResponseStudioCard({ response, index, expanded, onToggle, tokenHighlights, onRewrite }) {
  const avgScore = response.trait_scores
    ? Object.values(response.trait_scores).reduce((a, b) => a + b, 0) / Object.values(response.trait_scores).length
    : 0;

  const topEmotion = response.emotion_scores 
    ? Object.entries(response.emotion_scores).sort((a,b) => b[1]-a[1])[0] 
    : null;

  return (
    <div className={`glass-card overflow-hidden transition-all duration-500 ${expanded ? 'bg-white/[0.08] ring-1 ring-white/20' : 'hover:bg-white/[0.04]'}`}>
      <div className="p-8 cursor-pointer" onClick={onToggle}>
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-4 mb-4">
              <span className="text-[10px] font-black font-mono text-white/20 bg-white/5 w-6 h-6 flex items-center justify-center rounded">0{index + 1}</span>
              <span className="text-xs font-bold uppercase tracking-widest text-primary-400">{response.prompt_word}</span>
              {topEmotion && topEmotion[1] > 0.3 && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/5 text-[10px] uppercase font-bold text-white/50">
                  {EMOTION_EMOJIS[topEmotion[0]] || '✨'} {topEmotion[0]}
                </div>
              )}
            </div>
            
            {/* SmartText Implementation (Squiggles) */}
            <div className={`text-lg leading-relaxed ${expanded ? 'text-white' : 'text-white/60 line-clamp-2'} transition-colors duration-300 font-medium`}>
              {tokenHighlights ? (
                <SmartText highlights={tokenHighlights} fullText={response.user_text} />
              ) : (
                response.user_text || <span className="italic text-white/20">Audio processed, initializing transcript...</span>
              )}
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-3 pt-1">
            <div className="text-[10px] font-black text-white/20 uppercase">Intelligence.Impact</div>
            <ScoreRing score={avgScore} />
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-8 pb-8 pt-2 animate-slide-up space-y-8">
          <div className="h-px bg-white/5 w-full" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div>
                <h4 className="text-[10px] font-bold text-white/30 uppercase tracking-[2px] mb-4">Trait Breakdown</h4>
                <TraitBars traits={response.trait_scores} />
             </div>
             <div>
                <h4 className="text-[10px] font-bold text-white/30 uppercase tracking-[2px] mb-4">Speech Performance</h4>
                <div className="grid grid-cols-2 gap-4">
                  <MetricSquare label="Tempo" value={`${Math.round(response.wpm)} WPM`} icon="🎙️" />
                  <MetricSquare label="Stability" value={`${Math.round(response.composure_score * 100)}%`} icon="👤" color="text-emerald-400" />
                  <MetricSquare label="Filler Ratio" value={response.filler_count} icon="⚠️" color={response.filler_count > 3 ? 'text-red-400' : 'text-emerald-400'} />
                  <MetricSquare label="Impact" value="High" icon="⚡" />
                </div>
             </div>
          </div>

          <div className="flex justify-between items-center py-4 px-6 rounded-2xl bg-primary-500/5 border border-primary-500/10">
            <p className="text-sm text-white/50 italic">AI suggests this response could be strengthened for leadership impact.</p>
            <button onClick={(e) => { e.stopPropagation(); onRewrite(); }} className="btn-primary text-xs py-2 px-4 whitespace-nowrap">
              ✍️ AI Pitch Correct
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SmartText({ highlights, fullText }) {
  if (!highlights) return fullText;
  return (
    <span>
      {highlights.map((t, i) => {
        let className = "";
        if (t.weight > 0.05) className = "squiggle-success";
        else if (t.weight < -0.05) className = "squiggle-error";
        
        return (
          <span key={i} className={`relative group inline-block ${className} mr-1`}>
            {t.token}
            {t.traits.length > 0 && (
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-xl bg-surface-900 border border-white/10 text-[10px] font-bold text-white/70 whitespace-nowrap hidden group-hover:block z-50 shadow-2xl scale-100 animate-slide-up">
                {t.weight > 0 ? '🚀' : '🔻'} {t.traits.join(' • ').toUpperCase()}
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}

function MetricSquare({ label, value, icon, color = 'text-white' }) {
  return (
    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col items-center justify-center text-center group hover:bg-white/[0.06] transition-all">
      <span className="text-xl mb-2 grayscale group-hover:grayscale-0 transition-all">{icon}</span>
      <div className={`text-lg font-bold font-mono ${color}`}>{value}</div>
      <div className="text-[9px] font-black text-white/20 uppercase tracking-widest">{label}</div>
    </div>
  );
}

function ScoreRing({ score }) {
  const color = score >= 0.6 ? '#10b981' : score >= 0.4 ? '#3b82f6' : '#f59e0b';
  return (
    <div className="relative w-16 h-16 flex items-center justify-center">
      <svg className="w-full h-full -rotate-90">
        <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white/5" />
        <circle cx="32" cy="32" r="28" stroke={color} strokeWidth="4" fill="transparent" 
                strokeDasharray={175} strokeDashoffset={175 - (175 * score)} 
                strokeLinecap="round" className="transition-all duration-1000 ease-out" />
      </svg>
      <span className="absolute text-[11px] font-black font-mono">{(score * 100).toFixed(0)}</span>
    </div>
  );
}

function TraitRadarChart({ traits }) {
  if (!traits || Object.keys(traits).length === 0) return <div className="h-64 flex items-center justify-center text-white/20 italic">Calibrating Chart...</div>;

  const data = Object.entries(traits).map(([key, value]) => ({
    subject: key.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' '),
    A: Math.round(value * 100),
    fullMark: 100,
  }));

  return (
    <div className="w-full h-72 sm:h-80 -ml-4 animate-float">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
          <PolarGrid stroke="rgba(255,255,255,0.05)" />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 700, letterSpacing: '1px' }} 
          />
          <PolarRadiusAxis 
            angle={90} 
            domain={[0, 100]} 
            tick={false} 
            axisLine={false} 
          />
          <Tooltip 
            contentStyle={{ backgroundColor: 'rgba(9,9,11,0.9)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
            itemStyle={{ color: '#0ea5e9', fontWeight: '900', fontSize: '10px', textTransform: 'uppercase' }}
            formatter={(val) => [`${val}%`, 'Proficiency']}
          />
          <Radar 
            name="Score" 
            dataKey="A" 
            stroke="#0ea5e9" 
            strokeWidth={3}
            fill="#0ea5e9" 
            fillOpacity={0.2} 
            isAnimationActive={true}
            animationDuration={2000}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

function TraitBars({ traits }) {
  if (!traits) return null;
  return (
    <div className="space-y-4">
      {Object.entries(traits).map(([key, value]) => (
        <div key={key} className="group">
          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2 text-white/40 group-hover:text-white/70 transition-colors">
            <span>{key.replace('_', ' ')}</span>
            <span className="font-mono">{(value * 100).toFixed(0)}%</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(var(--tw-shadow-color),0.5)]"
              style={{
                width: `${value * 100}%`,
                backgroundColor: TRAIT_COLORS[key] || '#6366f1',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function RewriteModal({ response, rewrites, loading, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-950/80 backdrop-blur-md" onClick={onClose}>
      <div className="glass-card max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col animate-slide-up shadow-primary-500/10" onClick={e => e.stopPropagation()}>
        <div className="p-8 border-b border-white/10 flex justify-between items-center bg-white/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary-500/20 flex items-center justify-center text-2xl">✍️</div>
            <div>
              <h3 className="font-display text-xl font-bold">AI Pitch Coach</h3>
              <p className="text-white/30 text-[10px] uppercase font-bold tracking-[2px]">Refining: {response.prompt_word}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-red-500/20 hover:text-red-400 transition-all">✕</button>
        </div>

        <div className="overflow-y-auto p-8 space-y-8 flex-1">
          {/* User's text */}
          <div className="space-y-4">
             <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[2px]">Your Input</h4>
             <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 text-white/70 leading-relaxed font-medium italic">
                "{response.user_text || 'No response recorded'}"
             </div>
          </div>

          <div className="h-px bg-white/5 w-full" />

          {loading ? (
             <div className="py-12 flex flex-col items-center justify-center space-y-4">
                <div className="w-10 h-10 border-2 border-primary-500/20 border-t-primary-500 rounded-full animate-spin" />
                <p className="text-xs font-bold text-white/30 uppercase tracking-widest">Generating Strategic Rewrites</p>
             </div>
          ) : (
            <div className="space-y-6">
               <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[2px]">AI Optimized Iterations</h4>
               {rewrites?.rewrites?.map((rw, i) => (
                  <div key={i} className="group p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 hover:border-emerald-500/30 transition-all space-y-4">
                    <p className="text-white/90 leading-relaxed font-medium text-lg italic">"{rw.rewrite}"</p>
                    <div className="flex gap-4 items-center">
                      <span className="flex-1 h-px bg-emerald-500/10" />
                      <span className="text-[10px] font-bold text-emerald-500/50 uppercase">Strategic Intent</span>
                      <span className="flex-1 h-px bg-emerald-500/10" />
                    </div>
                    <p className="text-xs text-emerald-400/60 leading-relaxed">{rw.explanation}</p>
                    {rw.trait_scores && <MiniTraitBars traits={rw.trait_scores} />}
                  </div>
               ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniTraitBars({ traits }) {
  return (
    <div className="flex flex-wrap gap-4 pt-4">
      {Object.entries(traits).map(([k, v]) => (
        <div key={k} className="flex flex-col gap-1">
          <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">{k.replace('_', ' ')}</span>
          <div className="flex items-center gap-2">
            <div className="w-12 h-1 bg-white/5 rounded-full overflow-hidden">
               <div className="h-full bg-emerald-500" style={{width: `${v*100}%`}} />
            </div>
            <span className="text-[10px] font-mono text-emerald-400/70">{(v*100).toFixed(0)}%</span>
          </div>
        </div>
      ))}
    </div>
  );
}
