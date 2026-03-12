import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';

const MODULE_META = {
  ssb: { title: 'Defence & SSB WAT', gradient: 'from-amber-600 to-orange-600', icon: '🎖️' },
  interview: { title: 'Job Interview WAT', gradient: 'from-blue-600 to-cyan-600', icon: '💼' },
  student: { title: 'Student Mindset WAT', gradient: 'from-emerald-600 to-teal-600', icon: '🎓' },
  workplace: { title: 'Workplace Analysis', gradient: 'from-purple-600 to-pink-600', icon: '🏢' },
};

const TIMER_DEFAULTS = { ssb: 15, interview: 15, student: 20, workplace: 20 };
const COUNT_DEFAULTS = { ssb: 15, interview: 15, student: 12, workplace: 12 };

export default function TestPage() {
  const { module } = useParams();
  const navigate = useNavigate();
  const meta = MODULE_META[module] || MODULE_META.ssb;

  const [phase, setPhase] = useState('setup'); // setup | test | submitting | done
  const [sessionId, setSessionId] = useState(null);
  const [prompts, setPrompts] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState([]);
  const [currentText, setCurrentText] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerDuration, setTimerDuration] = useState(TIMER_DEFAULTS[module] || 15);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const inputRef = useRef(null);
  const timerRef = useRef(null);

  const startSession = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.startSession({
        module,
        prompt_count: COUNT_DEFAULTS[module] || 15,
        timer_seconds: timerDuration,
      });
      setSessionId(data.session_id);
      setPrompts(data.prompts);
      setTimerDuration(data.timer_seconds);
      setResponses(new Array(data.prompts.length).fill(''));
      setPhase('test');
      setCurrentIndex(0);
      setTimeLeft(data.timer_seconds);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const advanceToNext = useCallback(() => {
    // Save current response
    setResponses(prev => {
      const updated = [...prev];
      updated[currentIndex] = currentText;
      return updated;
    });

    if (currentIndex >= prompts.length - 1) {
      // Session complete - submit
      submitSession();
    } else {
      setCurrentIndex(prev => prev + 1);
      setCurrentText('');
      setTimeLeft(timerDuration);
    }
  }, [currentIndex, currentText, prompts.length, timerDuration]);

  // Timer countdown
  useEffect(() => {
    if (phase !== 'test') return;
    
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          // Auto-advance
          setTimeout(() => advanceToNext(), 100);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [phase, currentIndex, advanceToNext]);

  // Focus input on new prompt
  useEffect(() => {
    if (phase === 'test' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentIndex, phase]);

  const submitSession = async () => {
    setPhase('submitting');
    clearInterval(timerRef.current);

    const finalResponses = [...responses];
    finalResponses[currentIndex] = currentText;

    const payload = {
      responses: prompts.map((p, i) => ({
        prompt_id: p.id,
        order_index: i,
        user_text: finalResponses[i] || '',
      })),
    };

    try {
      await api.submitSession(sessionId, payload);
      setPhase('done');
    } catch (err) {
      setError(err.message);
      setPhase('test');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      clearInterval(timerRef.current);
      advanceToNext();
    }
  };

  // Setup screen
  if (phase === 'setup') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-lg w-full animate-slide-up">
          <div className="text-center mb-8">
            <div className={`w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center text-4xl`}>
              {meta.icon}
            </div>
            <h1 className="font-display text-3xl font-bold mb-2">{meta.title}</h1>
            <p className="text-white/50">Word Association Test</p>
          </div>

          <div className="glass-card p-8 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-white/60">Time per word</span>
                <div className="flex items-center gap-3">
                  <button onClick={() => setTimerDuration(Math.max(5, timerDuration - 5))} className="btn-ghost text-lg">−</button>
                  <span className="text-xl font-bold w-12 text-center">{timerDuration}s</span>
                  <button onClick={() => setTimerDuration(Math.min(60, timerDuration + 5))} className="btn-ghost text-lg">+</button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/60">Number of words</span>
                <span className="text-xl font-bold">{COUNT_DEFAULTS[module] || 15}</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-primary-500/10 border border-primary-500/20">
              <h4 className="font-semibold text-primary-300 mb-2">📋 Instructions</h4>
              <ul className="text-sm text-white/50 space-y-1">
                <li>• A word will appear on screen with a timer</li>
                <li>• Type your first thought/reaction as a sentence</li>
                <li>• Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-xs">Enter</kbd> or wait for timer to advance</li>
                <li>• Be spontaneous — your immediate response matters</li>
                <li>• You can respond in English or Hindi (हिंदी)</li>
              </ul>
            </div>

            {error && <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

            <button onClick={startSession} disabled={loading} className="btn-primary w-full text-lg disabled:opacity-50">
              {loading ? 'Loading prompts...' : '🚀 Begin Test'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Test in progress
  if (phase === 'test') {
    const prompt = prompts[currentIndex];
    const progress = ((currentIndex + 1) / prompts.length) * 100;
    const timerPercent = (timeLeft / timerDuration) * 100;
    const timerColor = timeLeft <= 3 ? 'text-red-400' : timeLeft <= 7 ? 'text-amber-400' : 'text-primary-400';

    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-2xl w-full">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-white/40 text-sm">Item {currentIndex + 1} of {prompts.length}</span>
              <span className="text-white/40 text-sm">{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* Timer */}
          <div className="text-center mb-8">
            <div className="relative inline-flex items-center justify-center">
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" className="stroke-white/10" strokeWidth="4" />
                <circle cx="50" cy="50" r="45" fill="none" className={`stroke-current ${timerColor}`} strokeWidth="4"
                  strokeDasharray={`${2 * Math.PI * 45}`}
                  strokeDashoffset={`${2 * Math.PI * 45 * (1 - timerPercent / 100)}`}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 1s linear' }} />
              </svg>
              <span className={`absolute text-3xl font-bold ${timerColor}`}>{timeLeft}</span>
            </div>
          </div>

          {/* Word Display */}
          <div className="text-center mb-8 animate-slide-up" key={currentIndex}>
            <div className={`inline-block px-10 py-6 rounded-2xl bg-gradient-to-br ${meta.gradient} shadow-2xl`}>
              <h2 className="font-display text-4xl sm:text-5xl font-extrabold text-white tracking-wide">
                {prompt?.word}
              </h2>
            </div>
            {prompt?.themes && (
              <div className="flex justify-center gap-2 mt-3">
                {prompt.themes.slice(0, 3).map(t => (
                  <span key={t} className="text-xs px-2 py-1 rounded-full bg-white/5 text-white/30">{t}</span>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="glass-card p-6">
            <textarea
              ref={inputRef}
              value={currentText}
              onChange={e => setCurrentText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your immediate response here... (English या हिंदी)"
              className="input-field min-h-[80px] resize-none text-lg"
              autoFocus
            />
            <div className="flex justify-between items-center mt-4">
              <span className="text-white/30 text-sm">
                Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-xs">Enter</kbd> to advance
              </span>
              <button onClick={() => { clearInterval(timerRef.current); advanceToNext(); }} className="btn-primary">
                {currentIndex >= prompts.length - 1 ? 'Finish ✓' : 'Next →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Submitting
  if (phase === 'submitting') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center animate-pulse">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-4xl">🧠</div>
          <h2 className="font-display text-2xl font-bold mb-3">Analyzing Your Responses</h2>
          <p className="text-white/50">Running transformer models on your answers...</p>
          <div className="mt-6 flex justify-center gap-2">
            {['Sentiment', 'Emotions', 'Traits', 'Embeddings'].map((s, i) => (
              <span key={s} className="px-3 py-1 rounded-full bg-white/5 text-xs text-white/40 animate-pulse" style={{animationDelay: `${i * 0.3}s`}}>{s}</span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Done
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center animate-slide-up">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-4xl">✅</div>
        <h2 className="font-display text-3xl font-bold mb-3">Test Complete!</h2>
        <p className="text-white/50 mb-8">Your AI analysis is ready to view.</p>
        <div className="flex gap-4 justify-center">
          <button onClick={() => navigate(`/results/${sessionId}`)} className="btn-primary text-lg">View Results →</button>
          <button onClick={() => navigate('/')} className="btn-secondary">Back Home</button>
        </div>
      </div>
    </div>
  );
}
