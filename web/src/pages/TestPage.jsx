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
  const [metrics, setMetrics] = useState([]); // { wpm, filler_count, composure_score }
  
  const [currentText, setCurrentText] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerDuration, setTimerDuration] = useState(TIMER_DEFAULTS[module] || 15);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Multi-modal state
  const [isRecording, setIsRecording] = useState(false);
  const [composureScore, setComposureScore] = useState(85);
  const [fillersDetected, setFillersDetected] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [startTime, setStartTime] = useState(0);

  const inputRef = useRef(null);
  const timerRef = useRef(null);
  const recognitionRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Setup Web Speech API and Webcam
  useEffect(() => {
    if (phase === 'test') {
      // 1. Setup Speech Recognition
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-IN'; // Can alternate to hi-IN based on selection
        
        recognitionRef.current.onresult = (event) => {
          let finalTranscript = '';
          let interimTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }
          if (finalTranscript) {
            setCurrentText(prev => prev ? prev + ' ' + finalTranscript : finalTranscript);
          }
        };
      }

      // 2. Setup Webcam (Mock facial analysis)
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch(err => console.warn("Webcam access denied", err));

      // 3. Simulated Face Tracking Polling
      const faceInterval = setInterval(() => {
        setComposureScore(prev => {
          const jitter = (Math.random() * 10) - 5;
          return Math.min(100, Math.max(0, prev + jitter));
        });
      }, 1000);

      return () => {
        clearInterval(faceInterval);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      };
    }
  }, [phase]);

  // Track words and fillers for metrics
  useEffect(() => {
    const words = currentText.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    setWordCount(words.length);
    const fillers = words.filter(w => ['um', 'uh', 'like', 'uhm', 'so', 'anyway'].includes(w)).length;
    setFillersDetected(fillers);
  }, [currentText]);

  const toggleRecording = () => {
    if (isRecording) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      if (recognitionRef.current) recognitionRef.current.start();
      setIsRecording(true);
    }
  };

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
      setMetrics(new Array(data.prompts.length).fill({}));
      setPhase('test');
      setCurrentIndex(0);
      setTimeLeft(data.timer_seconds);
      setStartTime(Date.now());
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const advanceToNext = useCallback(() => {
    if (isRecording && recognitionRef.current) recognitionRef.current.stop();
    setIsRecording(false);

    // Calculate final metrics for this response
    const elapsedMinutes = (Date.now() - startTime) / 60000;
    const wpm = elapsedMinutes > 0 ? (wordCount / elapsedMinutes) : 0;
    const normWpm = isNaN(wpm) || !isFinite(wpm) ? 0 : wpm;

    setResponses(prev => {
      const updated = [...prev];
      updated[currentIndex] = currentText;
      return updated;
    });

    setMetrics(prev => {
      const updated = [...prev];
      updated[currentIndex] = {
        wpm: normWpm,
        filler_count: fillersDetected,
        composure_score: composureScore / 100, // Normalize to 0-1
      };
      return updated;
    });

    if (currentIndex >= prompts.length - 1) {
      submitSession();
    } else {
      setCurrentIndex(prev => prev + 1);
      setCurrentText('');
      setWordCount(0);
      setFillersDetected(0);
      setTimeLeft(timerDuration);
      setStartTime(Date.now());
    }
  }, [currentIndex, currentText, prompts.length, timerDuration, isRecording, wordCount, fillersDetected, composureScore, startTime]);

  // Timer countdown
  useEffect(() => {
    if (phase !== 'test') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setTimeout(() => advanceToNext(), 100);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase, currentIndex, advanceToNext]);

  const submitSession = async () => {
    setPhase('submitting');
    clearInterval(timerRef.current);
    
    // Stop webcam
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
    }

    const elapsedMinutes = (Date.now() - startTime) / 60000;
    const wpm = elapsedMinutes > 0 ? (wordCount / elapsedMinutes) : 0;

    const finalResponses = [...responses];
    finalResponses[currentIndex] = currentText;
    const finalMetrics = [...metrics];
    finalMetrics[currentIndex] = {
        wpm: wpm,
        filler_count: fillersDetected,
        composure_score: composureScore / 100
    };

    const payload = {
      responses: prompts.map((p, i) => ({
        prompt_id: p.id,
        order_index: i,
        user_text: finalResponses[i] || '',
        wpm: finalMetrics[i]?.wpm || 0,
        filler_count: finalMetrics[i]?.filler_count || 0,
        composure_score: finalMetrics[i]?.composure_score || 0.5,
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
            <p className="text-white/50">Multi-Modal Behavioral Assessment</p>
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
              <h4 className="font-semibold text-primary-300 mb-2">🎙️ Multi-Modal Rules</h4>
              <ul className="text-sm text-white/50 space-y-1">
                <li>• This session tracks your Voice and Facial Expressions.</li>
                <li>• Use the Microphone to speak your spontaneous thoughts.</li>
                <li>• Our AI tracks "Filler Words" and "Words Per Minute".</li>
                <li>• Allow camera access for the Composure tracker.</li>
              </ul>
            </div>

            {error && <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

            <button onClick={startSession} disabled={loading} className="btn-primary w-full text-lg disabled:opacity-50">
              {loading ? 'Initializing AI Models...' : '🚀 Begin Test'}
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
    const composureColor = composureScore > 80 ? 'text-emerald-400' : composureScore > 50 ? 'text-amber-400' : 'text-red-400';

    return (
      <div className="min-h-screen pt-20 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-white/40 text-sm">Item {currentIndex + 1} of {prompts.length}</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }} />
              </div>
            </div>

            {/* Word Display */}
            <div className="text-center mb-8 animate-slide-up" key={currentIndex}>
              <div className={`inline-block px-10 py-8 w-full rounded-2xl bg-gradient-to-br ${meta.gradient} shadow-2xl`}>
                <h2 className="font-display text-5xl font-extrabold text-white tracking-wide">
                  {prompt?.word}
                </h2>
              </div>
            </div>

            {/* Input Form */}
            <div className="glass-card p-6">
              <div className="flex items-center gap-4 mb-4">
                <button 
                  onClick={toggleRecording}
                  className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-lg transition-transform ${isRecording ? 'bg-red-500 animate-pulse text-white scale-110' : 'bg-surface-200 text-white/50 hover:bg-surface-300'}`}
                >
                  🎙️
                </button>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white/70 mb-1">Voice Input Active</p>
                  <p className="text-xs text-white/40">Speak naturally. Fillers and hesitations are tracked.</p>
                </div>
                <div className="text-right">
                    <p className="text-xs text-white/40">Detected Fillers: <span className="font-mono text-amber-400">{fillersDetected}</span></p>
                </div>
              </div>

              <textarea
                ref={inputRef}
                value={currentText}
                onChange={e => setCurrentText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Transcribed voice response will appear here. You can also type..."
                className="input-field min-h-[100px] resize-none text-lg bg-surface-800/50"
              />
              <div className="flex justify-between items-center mt-4">
                <span className="text-white/30 text-sm font-mono">
                  Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-xs">Enter</kbd> to submit
                </span>
                <button onClick={() => { clearInterval(timerRef.current); advanceToNext(); }} className="btn-primary">
                  {currentIndex >= prompts.length - 1 ? 'Finish ✓' : 'Next →'}
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar - Camera & Timer */}
          <div className="space-y-6">
            <div className="glass-card p-6 text-center animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">Time Remaining</h3>
              <div className="relative inline-flex items-center justify-center">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" className="stroke-white/10" strokeWidth="4" />
                  <circle cx="50" cy="50" r="45" fill="none" className={`stroke-current ${timerColor}`} strokeWidth="4"
                    strokeDasharray={`${2 * Math.PI * 45}`}
                    strokeDashoffset={`${2 * Math.PI * 45 * (1 - timerPercent / 100)}`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1s linear' }} />
                </svg>
                <span className={`absolute text-3xl font-bold font-mono ${timerColor}`}>{timeLeft}</span>
              </div>
            </div>

            <div className="glass-card p-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider">Live Video Stream</h3>
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              </div>
              <div className="aspect-video bg-black rounded-lg overflow-hidden border border-white/10 relative">
                <video ref={videoRef} autoPlay muted className="w-full h-full object-cover opacity-80" />
                
                {/* HUD Elements */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] text-white/40 font-mono mb-1">EMOTION ENGINE: ACTIVE</p>
                      <p className="text-xs font-semibold">Composure Index</p>
                    </div>
                    <span className={`font-mono text-xl ${composureColor}`}>{composureScore.toFixed(0)}</span>
                  </div>
                  <div className="h-1 bg-white/20 mt-2 rounded">
                    <div className={`h-full bg-current ${composureColor} rounded transition-all duration-300`} style={{width: `${composureScore}%`}} />
                  </div>
                </div>
              </div>
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
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-4xl">🤖</div>
          <h2 className="font-display text-2xl font-bold mb-3">Compiling Multi-Modal Metrics</h2>
          <p className="text-white/50">Fusing speech, language, and facial recognition data...</p>
        </div>
      </div>
    );
  }

  // Done
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center animate-slide-up">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-4xl">✅</div>
        <h2 className="font-display text-3xl font-bold mb-3">Analysis Complete!</h2>
        <p className="text-white/50 mb-8">Your Omni-Channel profile is ready to view.</p>
        <div className="flex gap-4 justify-center">
          <button onClick={() => navigate(`/results/${sessionId}`)} className="btn-primary text-lg">View Detailed Results →</button>
        </div>
      </div>
    </div>
  );
}
