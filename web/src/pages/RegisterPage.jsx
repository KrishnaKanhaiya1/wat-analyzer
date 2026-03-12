import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { api } from '../api';

export default function RegisterPage() {
  const [form, setForm] = useState({ username: '', email: '', password: '', full_name: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.register(form);
      login(data.access_token, { id: data.user_id, username: data.username });
      navigate('/');
    } catch (err) {
      setError(err.message || 'Registration failed');
    }
    setLoading(false);
  };

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-950 via-surface-950 to-accent-950" />
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl" />
      
      <div className="relative w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-2xl font-bold animate-glow">W</div>
          <h1 className="font-display text-3xl font-bold">Create Account</h1>
          <p className="text-white/50 mt-2">Start your soft-skill development journey</p>
        </div>
        
        <form onSubmit={handleSubmit} className="glass-card p-8 space-y-5">
          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">Full Name</label>
            <input id="reg-name" type="text" value={form.full_name} onChange={update('full_name')} className="input-field" placeholder="Your full name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">Username</label>
            <input id="reg-username" type="text" value={form.username} onChange={update('username')} className="input-field" placeholder="Choose a username" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">Email</label>
            <input id="reg-email" type="email" value={form.email} onChange={update('email')} className="input-field" placeholder="your@email.com" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">Password</label>
            <input id="reg-password" type="password" value={form.password} onChange={update('password')} className="input-field" placeholder="Create a strong password" required />
          </div>
          <button id="reg-submit" type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
          <p className="text-center text-sm text-white/40">
            Already have an account? <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
