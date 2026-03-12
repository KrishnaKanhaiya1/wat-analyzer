import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

const MODULE_META = {
  ssb: { icon: '🎖️', color: 'amber', gradient: 'from-amber-600 to-orange-600' },
  interview: { icon: '💼', color: 'blue', gradient: 'from-blue-600 to-cyan-600' },
  student: { icon: '🎓', color: 'emerald', gradient: 'from-emerald-600 to-teal-600' },
  workplace: { icon: '🏢', color: 'purple', gradient: 'from-purple-600 to-pink-600' },
};

export default function SessionsPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.listSessions(filter || undefined).then(setSessions).catch(console.error).finally(() => setLoading(false));
  }, [filter]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-pulse text-white/50">Loading sessions...</div></div>;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8 animate-slide-up">
        <h1 className="font-display text-3xl font-bold mb-2">📋 Session History</h1>
        <p className="text-white/50">Review past WAT sessions and their analysis results.</p>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2 mb-6 animate-slide-up" style={{animationDelay: '0.1s'}}>
        <button onClick={() => setFilter('')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${!filter ? 'bg-primary-600 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>
          All
        </button>
        {Object.entries(MODULE_META).map(([key, meta]) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === key ? 'bg-primary-600 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>
            {meta.icon} {key.toUpperCase()}
          </button>
        ))}
      </div>

      {sessions.length === 0 ? (
        <div className="text-center glass-card p-12 animate-slide-up">
          <div className="text-5xl mb-4">📋</div>
          <h2 className="font-display text-xl font-bold mb-3">No Sessions Found</h2>
          <p className="text-white/50 mb-6">Start a WAT session to see your history here.</p>
          <button onClick={() => navigate('/')} className="btn-primary">Go to Modules</button>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session, idx) => {
            const meta = MODULE_META[session.module] || MODULE_META.ssb;
            const avgScore = session.overall_scores
              ? Object.values(session.overall_scores).reduce((a, b) => a + b, 0) / Object.values(session.overall_scores).length
              : 0;

            return (
              <div key={session.id}
                className="glass-card-hover p-5 cursor-pointer animate-slide-up"
                style={{ animationDelay: `${idx * 0.05}s` }}
                onClick={() => navigate(`/results/${session.id}`)}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center text-2xl shrink-0`}>
                      {meta.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{session.module?.toUpperCase()} Session</span>
                        <span className="text-xs text-white/30">{session.response_count} responses</span>
                      </div>
                      <p className="text-sm text-white/40">
                        {session.completed_at ? new Date(session.completed_at).toLocaleString() : 'In progress'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {session.overall_scores && (
                      <div className="hidden sm:flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-mono font-semibold">{(avgScore * 100).toFixed(0)}%</p>
                          <p className="text-xs text-white/30">avg score</p>
                        </div>
                        <div className="w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-bold"
                          style={{
                            borderColor: avgScore >= 0.6 ? '#22c55e' : avgScore >= 0.4 ? '#3b82f6' : '#f59e0b',
                            color: avgScore >= 0.6 ? '#22c55e' : avgScore >= 0.4 ? '#3b82f6' : '#f59e0b',
                          }}>
                          {avgScore >= 0.6 ? 'A' : avgScore >= 0.4 ? 'B' : 'C'}
                        </div>
                      </div>
                    )}
                    <span className="text-white/20">→</span>
                  </div>
                </div>

                {/* Mini trait bars */}
                {session.overall_scores && (
                  <div className="mt-3 flex flex-wrap gap-3">
                    {Object.entries(session.overall_scores).map(([k, v]) => (
                      <div key={k} className="text-xs flex items-center gap-1">
                        <span className="text-white/20 capitalize">{k.replace('_',' ')}:</span>
                        <span className="font-mono text-white/40">{(v * 100).toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
