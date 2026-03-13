import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { api } from '../api';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.login({ username, password });
      login(data.access_token, { id: data.user_id, username: data.username });
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed');
    }
    setLoading(false);
  };

  const handleDemoLogin = async () => {
    setError('');
    setDemoLoading(true);
    try {
      const data = await api.demo();
      login(data.access_token, { id: data.user_id, username: data.username });
      navigate('/scenario'); // Drop judges straight into the action
    } catch (err) {
      setError(err.message || 'Demo login failed');
    }
    setDemoLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-surface-950 overflow-hidden relative">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      
      {/* Left Hero Section */}
      <div className="w-full md:w-1/2 flex flex-col justify-center px-8 md:px-16 py-12 relative z-10 text-center md:text-left">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/20 rounded-full blur-[100px] -z-10 animate-pulse-slow" />
        
        <div className="w-16 h-16 mb-8 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-3xl font-bold text-white shadow-xl shadow-primary-500/30 mx-auto md:mx-0 animate-glow">
          W
        </div>
        
        <h1 className="text-5xl md:text-6xl font-display font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-white/90 to-white/60 mb-6 leading-tight">
          Master Your <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-accent-400">Communication</span><br/>
          with AI.
        </h1>
        
        <p className="text-xl text-white/50 mb-10 max-w-lg mx-auto md:mx-0 leading-relaxed font-light">
          Real-time analysis of sentiment, tone, and agency. Turn every conversation into an opportunity for growth with your personal AI roleplay coach.
        </p>
        
        <div className="flex justify-center md:justify-start">
          <button 
            onClick={handleDemoLogin} 
            disabled={demoLoading}
            className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 bg-gradient-to-r from-primary-500 to-accent-500 rounded-2xl overflow-hidden hover:scale-105 active:scale-95 shadow-[0_0_40px_-10px_rgba(var(--color-primary-500),0.5)]"
          >
            <div className="absolute inset-0 w-full h-full -mt-1 rounded-2xl opacity-30 bg-gradient-to-b from-transparent via-transparent to-black" />
            <span className="relative flex items-center gap-2 text-lg">
              {demoLoading ? 'Starting Demo...' : 'Try Live Demo Now'}
              {!demoLoading && <span className="text-xl group-hover:translate-x-1 transition-transform">→</span>}
            </span>
          </button>
        </div>
        
        <div className="mt-8 flex items-center justify-center md:justify-start gap-4 text-sm text-white/40">
          <div className="flex -space-x-2">
            {[1,2,3].map(i => (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-surface-950 bg-surface-800 flex items-center justify-center text-xs">👨‍💼</div>
            ))}
          </div>
          <p>Join 1,000+ professionals levelling up.</p>
        </div>
      </div>

      {/* Right Login Section */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 md:p-16 relative z-10">
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-500/20 rounded-full blur-[100px] -z-10 animate-pulse-slow delay-1000" />
        
        <div className="w-full max-w-md animate-slide-up bg-surface-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h2 className="font-display text-2xl font-bold text-white">Welcome Back</h2>
            <p className="text-white/50 mt-2 text-sm">Sign in to your account</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                <span>⚠️</span> {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-white/60 mb-2">Username</label>
              <input id="login-username" type="text" value={username} onChange={e => setUsername(e.target.value)} className="input-field bg-surface-950/50" placeholder="e.g. jdoe" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/60 mb-2">Password</label>
              <input id="login-password" type="password" value={password} onChange={e => setPassword(e.target.value)} className="input-field bg-surface-950/50" placeholder="••••••••" required />
            </div>
            
            <button id="login-submit" type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50 py-3 mt-4">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
            
            <div className="relative flex items-center py-5">
              <div className="flex-grow border-t border-white/10"></div>
              <span className="flex-shrink-0 mx-4 text-white/30 text-xs text-uppercase font-medium">Or</span>
              <div className="flex-grow border-t border-white/10"></div>
            </div>

            <p className="text-center text-sm text-white/40">
              Don't have an account? <Link to="/register" className="text-white hover:text-primary-300 font-medium transition-colors border-b border-primary-500/30 hover:border-primary-400pb-0.5">Create one</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
