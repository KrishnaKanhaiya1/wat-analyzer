import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-white/50">Loading analysis results...</div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/50 mb-4">Results not found</p>
          <button onClick={() => navigate('/')} className="btn-primary">Go Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8 animate-slide-up">
        <button onClick={() => navigate('/sessions')} className="btn-ghost mb-4">← Back to Sessions</button>
        <h1 className="font-display text-3xl font-bold mb-2">Session Analysis</h1>
        <div className="flex flex-wrap gap-3 text-sm text-white/40">
          <span className="px-3 py-1 rounded-full bg-white/5">{results.module?.toUpperCase()}</span>
          <span>{results.responses?.length} responses</span>
          <span>{results.completed_at ? new Date(results.completed_at).toLocaleDateString() : ''}</span>
        </div>
      </div>

      {/* Overall Radar / Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="glass-card p-6 animate-slide-up">
          <h3 className="font-display font-semibold text-lg mb-4">Overall Trait Scores</h3>
          <TraitBars traits={results.overall_scores} />
        </div>

        <div className="glass-card p-6 animate-slide-up" style={{animationDelay: '0.1s'}}>
          <h3 className="font-display font-semibold text-lg mb-4">Domain-Specific Assessment</h3>
          <div className="space-y-3">
            {results.overall_domain_traits?.map((dt, i) => (
              <div key={i} className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">{dt.label}</span>
                  {dt.olq && <span className="text-xs text-white/30 ml-2">({dt.olq})</span>}
                </div>
                <span className={`trait-${dt.level}`}>{dt.level.replace('_',' ')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Explanations */}
      {results.explanations?.length > 0 && (
        <div className="glass-card p-6 mb-8 animate-slide-up" style={{animationDelay: '0.2s'}}>
          <h3 className="font-display font-semibold text-lg mb-4">💡 AI Insights</h3>
          <div className="space-y-3">
            {results.explanations.map((exp, i) => (
              <p key={i} className="text-sm text-white/60 leading-relaxed">{exp.explanation}</p>
            ))}
          </div>
        </div>
      )}

      {/* Individual Responses */}
      <div className="mb-8">
        <h3 className="font-display font-semibold text-xl mb-4">Response-by-Response Analysis</h3>
        <div className="space-y-4">
          {results.responses?.map((resp, idx) => (
            <ResponseCard
              key={resp.id}
              response={resp}
              index={idx}
              expanded={expandedResponse === resp.id}
              onToggle={() => {
                setExpandedResponse(expandedResponse === resp.id ? null : resp.id);
                if (expandedResponse !== resp.id) loadHighlights(resp.id);
              }}
              highlights={highlights[resp.id]}
              onRewrite={() => openRewriteCoach(resp)}
            />
          ))}
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

function TraitBars({ traits }) {
  if (!traits) return <p className="text-white/30">No data</p>;
  return (
    <div className="space-y-3">
      {Object.entries(traits).map(([key, value]) => (
        <div key={key}>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-white/70 capitalize">{key.replace('_', ' ')}</span>
            <span className="font-mono text-white/50">{(value * 100).toFixed(0)}%</span>
          </div>
          <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out"
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

function ResponseCard({ response, index, expanded, onToggle, highlights, onRewrite }) {
  const avgScore = response.trait_scores
    ? Object.values(response.trait_scores).reduce((a, b) => a + b, 0) / Object.values(response.trait_scores).length
    : 0;
  const isWeak = avgScore < 0.4;

  return (
    <div className={`glass-card overflow-hidden animate-slide-up`} style={{animationDelay: `${index * 0.05}s`}}>
      <div className="p-5 cursor-pointer hover:bg-white/5 transition-colors" onClick={onToggle}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs text-white/30 font-mono">#{index + 1}</span>
              <span className="px-3 py-1 rounded-lg bg-primary-500/20 text-primary-300 text-sm font-semibold">{response.prompt_word}</span>
              {isWeak && <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs">needs focus</span>}
            </div>
            <p className="text-white/70 text-sm">{response.user_text || <span className="italic text-white/30">No response</span>}</p>
          </div>
          <div className="flex items-center gap-2">
            <MiniTraitBar score={avgScore} />
            <span className="text-white/30 text-sm">{expanded ? '▲' : '▼'}</span>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/10 p-5 space-y-4 bg-white/[0.02] animate-slide-up">
          {/* Trait scores for this response */}
          <TraitBars traits={response.trait_scores} />
          
          {/* Multi-modal metrics */}
          {(response.wpm > 0 || response.filler_count > 0 || response.composure_score > 0) && (
            <div className="flex flex-wrap gap-4 p-4 rounded-xl bg-surface-800/50 border border-white/5">
              {response.wpm > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎙️</span>
                  <div>
                    <div className="text-xs text-white/50">Speech Pace</div>
                    <div className="font-mono text-sm">{Math.round(response.wpm)} WPM</div>
                  </div>
                </div>
              )}
              {response.filler_count !== null && (
                <div className="flex items-center gap-2">
                  <span className="text-xl">⚠️</span>
                  <div>
                    <div className="text-xs text-white/50">Filler Words</div>
                    <div className="font-mono text-sm text-amber-400">{response.filler_count}</div>
                  </div>
                </div>
              )}
              {response.composure_score !== null && (
                <div className="flex items-center gap-2">
                  <span className="text-xl">👤</span>
                  <div>
                    <div className="text-xs text-white/50">Facial Composure</div>
                    <div className="font-mono text-sm text-emerald-400">{Math.round(response.composure_score * 100)}%</div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Token highlights */}
          {highlights?.token_highlights && (
            <div>
              <h4 className="text-sm font-semibold mb-3 text-primary-300">🔍 Token-Level Analysis</h4>
              <div className="flex flex-wrap gap-1">
                {highlights.token_highlights.map((t, i) => (
                  <span key={i} className="relative group cursor-default">
                    <span className={`px-1.5 py-0.5 rounded text-sm font-medium ${
                      t.weight > 0.05 ? 'bg-emerald-500/20 text-emerald-300' :
                      t.weight < -0.05 ? 'bg-red-500/20 text-red-300' :
                      'text-white/50'
                    }`}>
                      {t.token}
                    </span>
                    {t.traits.length > 0 && (
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-lg bg-surface-800 border border-white/10 text-xs text-white/70 whitespace-nowrap hidden group-hover:block z-10 shadow-xl">
                        {t.weight > 0 ? '↑' : '↓'} {t.traits.join(', ')}
                      </span>
                    )}
                  </span>
                ))}
              </div>
              <div className="flex gap-4 mt-2 text-xs text-white/30">
                <span><span className="inline-block w-3 h-3 rounded bg-emerald-500/30 mr-1" /> Positive</span>
                <span><span className="inline-block w-3 h-3 rounded bg-red-500/30 mr-1" /> Negative</span>
              </div>
            </div>
          )}

          {/* Emotion scores */}
          {response.emotion_scores && Object.keys(response.emotion_scores).length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2 text-accent-300">🎭 Detected Emotions</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(response.emotion_scores)
                  .filter(([, v]) => v > 0.05)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([emotion, score]) => (
                    <span key={emotion} className="px-2 py-1 rounded-full bg-accent-500/10 text-accent-300 text-xs">
                      {emotion} ({(score * 100).toFixed(0)}%)
                    </span>
                  ))
                }
              </div>
            </div>
          )}

          {/* Improve button */}
          {isWeak && (
            <button onClick={(e) => { e.stopPropagation(); onRewrite(); }} className="btn-primary text-sm">
              ✍️ Improve with AI
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function MiniTraitBar({ score }) {
  const color = score >= 0.6 ? 'bg-emerald-500' : score >= 0.4 ? 'bg-blue-500' : score >= 0.25 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="w-12 h-2 bg-white/10 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full`} style={{ width: `${score * 100}%` }} />
    </div>
  );
}

function RewriteModal({ response, rewrites, loading, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-card max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="font-display text-xl font-bold">✍️ AI Rewrite Coach</h3>
            <p className="text-white/40 text-sm mt-1">Prompt: <strong className="text-primary-300">{response.prompt_word}</strong></p>
          </div>
          <button onClick={onClose} className="btn-ghost">✕</button>
        </div>

        {/* Original */}
        <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
          <h4 className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-2">Original Response</h4>
          <p className="text-white/70">{response.user_text || 'No response'}</p>
          {response.trait_scores && <MiniTraitBars traits={response.trait_scores} />}
        </div>

        {loading && (
          <div className="text-center py-8 animate-pulse">
            <p className="text-white/50">Generating AI rewrites...</p>
          </div>
        )}

        {rewrites?.rewrites && (
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-white/30 uppercase tracking-wider">AI-Improved Versions</h4>
            {rewrites.rewrites.map((rw, i) => (
              <div key={i} className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                <p className="text-white/80 mb-2">{rw.rewrite}</p>
                <p className="text-xs text-emerald-400/70 mb-3">{rw.explanation}</p>
                {rw.trait_scores && <MiniTraitBars traits={rw.trait_scores} />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MiniTraitBars({ traits }) {
  return (
    <div className="flex flex-wrap gap-3 mt-3">
      {Object.entries(traits).map(([k, v]) => (
        <div key={k} className="text-xs">
          <span className="text-white/30 capitalize">{k.replace('_', ' ')}: </span>
          <span className="font-mono" style={{ color: TRAIT_COLORS[k] || '#6366f1' }}>{(v * 100).toFixed(0)}%</span>
        </div>
      ))}
    </div>
  );
}
