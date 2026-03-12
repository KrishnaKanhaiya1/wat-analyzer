import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { api } from '../api';

const MODULE_CONFIG = {
  ssb: {
    title: 'Defence & SSB WAT Coach',
    subtitle: 'Prepare for Officer Like Qualities assessment',
    icon: '🎖️',
    gradient: 'from-amber-600 to-orange-600',
    shadow: 'shadow-amber-500/20',
    description: 'Practice word association tests designed for SSB interviews. Build leadership, responsibility, courage, and cooperation traits.',
    timer: 15,
    count: 15,
  },
  interview: {
    title: 'Job Interview & Campus WAT Coach',
    subtitle: 'Ace your interview personality assessment',
    icon: '💼',
    gradient: 'from-blue-600 to-cyan-600',
    shadow: 'shadow-blue-500/20',
    description: 'Sharpen communication, ownership, and teamwork through rapid word-association drills designed for interviews.',
    timer: 15,
    count: 15,
  },
  student: {
    title: 'Student Mindset WAT Coach',
    subtitle: 'Build growth mindset and resilience',
    icon: '🎓',
    gradient: 'from-emerald-600 to-teal-600',
    shadow: 'shadow-emerald-500/20',
    description: 'Develop discipline, empathy, and positive mindset habits through engaging word-association exercises for students.',
    timer: 20,
    count: 12,
  },
  workplace: {
    title: 'Workplace Communication Analyzer',
    subtitle: 'Enhance leadership & professional skills',
    icon: '🏢',
    gradient: 'from-purple-600 to-pink-600',
    shadow: 'shadow-purple-500/20',
    description: 'Analyze your communication patterns, assertiveness, empathy, and leadership in workplace contexts.',
    timer: 20,
    count: 12,
  },
  scenario: {
    title: 'Interactive Roleplay Simulator',
    subtitle: 'Voice-Activated Stress Scenarios',
    icon: '🎭',
    gradient: 'from-rose-600 to-red-600',
    shadow: 'shadow-rose-500/20',
    description: 'Talk to an AI agent in realistic high-pressure situations. Tracks voice, pacing, fillers, and facial composure.',
    timer: 60,
    count: 3,
  }
};

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-950 via-surface-950 to-accent-950" />
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-primary-500/10 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl animate-pulse-slow" style={{animationDelay: '1s'}} />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-16 pb-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-300 text-sm font-medium mb-6 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" />
            Powered by Real Transformer AI Models
          </div>
          
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-extrabold text-white mb-6 animate-slide-up">
            AI-Powered Word Association
            <br />
            <span className="bg-gradient-to-r from-primary-400 via-accent-400 to-primary-400 bg-clip-text text-transparent">
              Test Analyzer
            </span>
          </h1>
          
          <p className="text-lg sm:text-xl text-white/60 max-w-3xl mx-auto mb-12 animate-slide-up" style={{animationDelay: '0.2s'}}>
            Coach your mindset and soft skills across Defence, Interviews, Education, and Workplace domains.
            Real AI analysis with explainable insights, adaptive learning, and personal growth tracking.
          </p>

          <div className="flex flex-wrap justify-center gap-4 mb-16 animate-slide-up" style={{animationDelay: '0.3s'}}>
            <div className="flex items-center gap-2 text-white/40 text-sm">
              <span className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">🧠</span>
              Transformer Models
            </div>
            <div className="flex items-center gap-2 text-white/40 text-sm">
              <span className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">📊</span>
              Explainable AI
            </div>
            <div className="flex items-center gap-2 text-white/40 text-sm">
              <span className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">🌐</span>
              Hindi + English
            </div>
            <div className="flex items-center gap-2 text-white/40 text-sm">
              <span className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">🎯</span>
              Adaptive Learning
            </div>
          </div>
        </div>
      </section>

      {/* Module Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 -mt-8 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(MODULE_CONFIG).map(([key, config], idx) => (
            <ModuleCard key={key} moduleKey={key} config={config} index={idx} />
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
        <h2 className="font-display text-3xl font-bold text-center mb-12">
          <span className="bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
            What Makes This Different
          </span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: '🔍', title: 'Explainable Token Highlights', desc: 'See exactly which words strengthen or weaken each trait with color-coded analysis.' },
            { icon: '📈', title: 'Thought Pattern Timeline', desc: 'Track how your traits evolve across sessions with time-series visualizations.' },
            { icon: '✍️', title: 'AI Rewrite Coach', desc: 'Get AI-generated alternative responses with trait-by-trait improvement analysis.' },
            { icon: '🎯', title: 'Adaptive Difficulty', desc: 'Bandit algorithm surfaces challenging prompts from your weak areas.' },
            { icon: '🎫', title: 'Soft-Skill Passport', desc: 'A unified profile across all domains that you can share with mentors.' },
            { icon: '🌐', title: 'Multilingual Support', desc: 'Responds in Hindi or English — analyzed equally by multilingual transformers.' },
          ].map((f, i) => (
            <div key={i} className="glass-card p-6 animate-slide-up" style={{animationDelay: `${i * 0.1}s`}}>
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-display font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ModuleCard({ moduleKey, config, index }) {
  const navigate = useNavigate();

  return (
    <div
      className={`glass-card-hover p-8 cursor-pointer group animate-slide-up`}
      style={{ animationDelay: `${index * 0.1}s` }}
      onClick={() => navigate(moduleKey === 'scenario' ? '/scenario' : `/test/${moduleKey}`)}
    >
      <div className="flex items-start gap-5">
        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${config.gradient} flex items-center justify-center text-3xl shrink-0 group-hover:scale-110 transition-transform duration-300 ${config.shadow} shadow-lg`}>
          {config.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-bold text-xl mb-1 group-hover:text-primary-300 transition-colors">{config.title}</h3>
          <p className="text-white/40 text-sm mb-3">{config.subtitle}</p>
          <p className="text-white/50 text-sm leading-relaxed">{config.description}</p>
          <div className="flex items-center gap-4 mt-4 text-xs text-white/30">
            <span>⏱ {config.timer}s per word</span>
            <span>📝 {config.count} prompts</span>
          </div>
        </div>
      </div>
      <div className="mt-6 flex justify-end">
        <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-gradient-to-r ${config.gradient} text-white opacity-80 group-hover:opacity-100 transition-opacity`}>
          Start Test →
        </span>
      </div>
    </div>
  );
}
