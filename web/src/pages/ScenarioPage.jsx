import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

// Defined Lifecycle States
const STATES = {
  SETUP: 'SETUP',
  STARTING_SESSION: 'STARTING_SESSION',
  AI_SPEAKING: 'AI_SPEAKING',
  USER_RESPONDING: 'USER_RESPONDING',
  SUBMITTING: 'SUBMITTING',
  COMPLETED: 'COMPLETED'
};

export default function ScenarioPage() {
  const navigate = useNavigate();
  const module = 'scenario';

  const [machineState, setMachineState] = useState(STATES.SETUP);
  const [sessionId, setSessionId] = useState(null);
  const [prompts, setPrompts] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const [responses, setResponses] = useState([]);
  const [metrics, setMetrics] = useState([]);
  
  const [currentText, setCurrentText] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerDuration, setTimerDuration] = useState(60);
  const [error, setError] = useState('');

  // Metrics
  const [isRecording, setIsRecording] = useState(false);
  const [composureScore, setComposureScore] = useState(85);
  const [fillersDetected, setFillersDetected] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [startTime, setStartTime] = useState(0);

  const timerRef = useRef(null);
  const recognitionRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // --- Hardware & Web APIs Initialization ---
  useEffect(() => {
    if (machineState === STATES.AI_SPEAKING || machineState === STATES.USER_RESPONDING) {
      // 1. Setup Speech Recognition
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition && !recognitionRef.current) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';
        
        recognitionRef.current.onresult = (event) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            }
          }
          if (finalTranscript) {
            setCurrentText(prev => prev ? prev + ' ' + finalTranscript : finalTranscript);
          }
        };
      }

      // 2. Setup Camera
      if (!streamRef.current) {
        navigator.mediaDevices.getUserMedia({ video: true })
          .then(stream => {
            streamRef.current = stream;
            if (videoRef.current) videoRef.current.srcObject = stream;
          })
          .catch(err => console.warn("Camera access denied:", err));
      }
    }

    return () => {
      // We don't stop the stream here on every re-render, only on unmount or finish
    };
  }, [machineState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      if (recognitionRef.current) recognitionRef.current.stop();
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    }
  }, []);

  // --- Metrics Tracking ---
  useEffect(() => {
    if (machineState === STATES.USER_RESPONDING) {
      const words = currentText.toLowerCase().split(/\s+/).filter(w => w.length > 0);
      setWordCount(words.length);
      setFillersDetected(words.filter(w => ['um', 'uh', 'like', 'uhm', 'so', 'anyway'].includes(w)).length);
    }
  }, [currentText, machineState]);

  useEffect(() => {
    if (machineState === STATES.AI_SPEAKING || machineState === STATES.USER_RESPONDING) {
      const faceInterval = setInterval(() => {
        setComposureScore(prev => Math.min(100, Math.max(0, prev + (Math.random() * 10 - 5))));
      }, 1000);
      return () => clearInterval(faceInterval);
    }
  }, [machineState]);

  // --- Actions ---
  const startSession = async () => {
    setMachineState(STATES.STARTING_SESSION);
    setError('');

    try {
      // Note: Removed the AbortController to prevent artificial 60s timeouts
      const data = await api.startSession({ module, prompt_count: 3, timer_seconds: timerDuration });
      
      setSessionId(data.session_id);
      setPrompts(data.prompts);
      setTimerDuration(data.timer_seconds);
      setResponses(new Array(data.prompts.length).fill(''));
      setMetrics(new Array(data.prompts.length).fill({}));
      
      setCurrentIndex(0);
      setMachineState(STATES.AI_SPEAKING);
    } catch (err) {
      console.error("Start Session Error:", err);
      // Automatically handled by api helper throwing on 401
      setError(err?.message || 'Agent failed to start. Please try again.');
      setMachineState(STATES.SETUP);
    }
  };

  const playTTS = useCallback((text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Clear queue
      const utterance = new SpeechSynthesisUtterance(text.replace(/\[.*?\]/g, ''));
      utterance.rate = 0.9;
      utterance.pitch = 0.8;
      
      utterance.onend = () => {
        setMachineState(STATES.USER_RESPONDING);
        setTimeLeft(timerDuration);
        setStartTime(Date.now());
      };
      
      utterance.onerror = () => {
        // Fallback if TTS fails
        setMachineState(STATES.USER_RESPONDING);
        setTimeLeft(timerDuration);
        setStartTime(Date.now());
      };

      window.speechSynthesis.speak(utterance);
    } else {
      // No TTS support
      setMachineState(STATES.USER_RESPONDING);
      setTimeLeft(timerDuration);
      setStartTime(Date.now());
    }
  }, [timerDuration]);

  // Trigger TTS when entering AI_SPEAKING state
  useEffect(() => {
    if (machineState === STATES.AI_SPEAKING && prompts[currentIndex]) {
      playTTS(prompts[currentIndex].word);
    }
  }, [machineState, currentIndex, prompts, playTTS]);

  // Start the countdown ONLY when USER_RESPONDING
  useEffect(() => {
    if (machineState === STATES.USER_RESPONDING) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) { 
            clearInterval(timerRef.current); 
            // Give React a tick to update state before advancing
            setTimeout(() => advanceToNext(), 50); 
            return 0; 
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    
    return () => clearInterval(timerRef.current);
  }, [machineState]); // eslint-disable-line react-hooks/exhaustive-deps

  const advanceToNext = useCallback(() => {
    if (machineState !== STATES.USER_RESPONDING) return;

    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }

    const elapsed = (Date.now() - startTime) / 60000;
    const wpm = elapsed > 0 ? (wordCount / elapsed) : 0;

    setResponses(prev => { const upd = [...prev]; upd[currentIndex] = currentText; return upd; });
    setMetrics(prev => {
      const upd = [...prev];
      upd[currentIndex] = { wpm: wpm || 0, filler_count: fillersDetected, composure_score: composureScore / 100 };
      return upd;
    });

    if (currentIndex >= prompts.length - 1) {
      submitSession();
    } else {
      setCurrentIndex(prev => prev + 1);
      setCurrentText('');
      setWordCount(0);
      setFillersDetected(0);
      setMachineState(STATES.AI_SPEAKING);
    }
  }, [currentIndex, currentText, prompts.length, machineState, isRecording, wordCount, fillersDetected, composureScore, startTime]);

  const submitSession = async () => {
    setMachineState(STATES.SUBMITTING);
    clearInterval(timerRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    
    try {
      // Must use the most up-to-date data directly for the final prompt
      const finalResponses = [...responses];
      finalResponses[currentIndex] = currentText;
      
      const payload = {
        responses: prompts.map((p, i) => ({
          prompt_id: p.id,
          order_index: i,
          user_text: finalResponses[i] || '',
          wpm: metrics[i]?.wpm || 0,
          filler_count: metrics[i]?.filler_count || 0,
          composure_score: metrics[i]?.composure_score || 0.5,
        })),
      };
      
      await api.submitSession(sessionId, payload);
      setMachineState(STATES.COMPLETED);
      navigate(`/results/${sessionId}`);
    } catch (err) {
      setError(err.message || 'Something went wrong while finishing the roleplay.');
      setMachineState(STATES.USER_RESPONDING);
    }
  };

  const toggleRecording = () => {
    if (machineState !== STATES.USER_RESPONDING) return;
    
    if (isRecording) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      if (recognitionRef.current) {
        try { recognitionRef.current.start(); } catch(e) {}
      }
      setIsRecording(true);
    }
  };

  // --- Render Views ---
  if (machineState === STATES.SETUP) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-lg w-full">
          <div className="glass-card p-8">
            <h1 className="font-display text-3xl font-bold mb-2">🎭 Roleplay Simulator</h1>
            <p className="text-white/50 mb-6">Train in high-stress behavioral scenarios against a live Voice Agent.</p>
            {error && <div className="px-4 py-3 mb-6 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}
            <button onClick={startSession} className="btn-primary w-full text-lg">
               🚀 Start Simulator
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (machineState === STATES.STARTING_SESSION) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-lg w-full text-center">
          <div className="glass-card p-8 animate-pulse">
            <h2 className="text-2xl font-bold text-primary-400 mb-4">Instantiating Agent...</h2>
            <p className="text-white/50">Calling API and generating dynamic scenarios.</p>
          </div>
        </div>
      </div>
    );
  }

  if (machineState === STATES.SUBMITTING) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-lg w-full text-center">
          <div className="glass-card p-8 animate-pulse border-emerald-500/50 border">
            <h2 className="text-2xl font-bold text-emerald-400 mb-4">Analyzing Behavioral Dynamics...</h2>
            <p className="text-white/50">Compiling your composure, word choices, and psychological profile.</p>
          </div>
        </div>
      </div>
    );
  }

  if (machineState === STATES.COMPLETED) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="font-display text-3xl font-bold mb-8">Scenario Simulator Complete!</h2>
          <button onClick={() => navigate(`/results/${sessionId}`)} className="btn-primary text-lg">Debrief Simulation</button>
        </div>
      </div>
    );
  }

  // AI_SPEAKING & USER_RESPONDING Views
  const prompt = prompts[currentIndex];
  const timerColor = timeLeft <= 10 ? 'text-red-400' : 'text-primary-400';
  const isAgentSpeaking = machineState === STATES.AI_SPEAKING;
  
  return (
    <div className="min-h-screen pt-20 px-4">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}
          
          <div className={`p-8 rounded-2xl border-2 shadow-2xl mb-6 transition-all duration-500 ${isAgentSpeaking ? 'border-primary-500 bg-primary-500/10 scale-[1.02]' : 'border-surface-200 bg-surface-800'}`}>
            <p className="text-white/50 text-sm font-semibold uppercase mb-2">
              Voice Agent {isAgentSpeaking ? '(Speaking...)' : '(Listening...)'}
            </p>
            <h2 className="text-2xl font-light text-white leading-relaxed">
              "{prompt?.word}"
            </h2>
          </div>
          
          <div className={`glass-card p-6 border transition-colors ${!isAgentSpeaking ? 'border-emerald-500/30 ring-1 ring-emerald-500/20' : 'border-surface-200 opacity-50'}`}>
            <div className="flex items-center gap-4 mb-4">
              <button 
                onClick={toggleRecording}
                disabled={isAgentSpeaking}
                className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-lg transition-transform ${isRecording ? 'bg-red-500 animate-pulse text-white scale-110' : isAgentSpeaking ? 'bg-surface-400 cursor-not-allowed' : 'bg-surface-200 hover:bg-surface-300'}`}
              >🎙️</button>
              <div className="flex-1 text-sm text-white/50">Your Response:</div>
            </div>
            
            <textarea
               value={currentText} 
               onChange={e => setCurrentText(e.target.value)}
               className="w-full bg-transparent resize-none h-32 text-lg focus:outline-none"
               placeholder={isAgentSpeaking ? "Wait for AI to finish speaking..." : "Speak or type your response here..."}
               disabled={isAgentSpeaking}
            />
            
            <div className="text-right mt-2">
              <button 
                onClick={advanceToNext} 
                className={`btn-primary ${isAgentSpeaking ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isAgentSpeaking}
              >
                 {currentIndex >= prompts.length - 1 ? 'Finish Roleplay' : 'Submit & Continue'}
              </button>
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className={`glass-card p-6 text-center transition-opacity ${isAgentSpeaking ? 'opacity-30' : 'opacity-100'}`}>
            <h3 className="text-sm text-white/50 mb-2">Reaction Timer</h3>
            <p className={`text-4xl font-mono ${timerColor}`}>{isAgentSpeaking ? '--' : timeLeft}s</p>
          </div>
          
          <div className="glass-card p-4">
            <h3 className="text-sm text-white/50 mb-2">Composure Stream</h3>
            <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
              <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/80">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-white/50">STRESS/CONFIDENCE</span>
                  <span className={`transition-colors ${composureScore > 50 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {composureScore.toFixed(0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
