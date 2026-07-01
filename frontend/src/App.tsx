import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Client } from '@gradio/client';
import { 
  DollarSign, 
  UserCheck, 
  Search, 
  Activity, 
  TrendingUp, 
  Server,
  Globe,
  Layers,
  Menu,
  X
} from 'lucide-react';

// Cult UI & Shadcn Components
import { ShaderGradientCanvas, ShaderGradient } from '@shadergradient/react';
import { CanvasFractalGrid } from './components/ui/canvas-fractal-grid';
import { MinimalCard, MinimalCardTitle, MinimalCardDescription } from './components/ui/minimal-card';
import { GlassCard } from './components/ui/GlassCard';
import { DirectionAwareTabs } from './components/ui/direction-aware-tabs';
import { BorderBeamButton } from './components/ui/border-beam-button';
import { BrowserWindow } from './components/ui/mock-browser-window';
import { TelemetryDashboard } from './components/TelemetryDashboard';
import { PlotlyChart } from './components/PlotlyChart';
import { Slider } from './components/ui/slider';
import { Label } from './components/ui/label';
import { Input } from './components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './components/ui/select';

// Options matching Gradio drop-down categories
const countries = [
  "United States of America", "Germany", "United Kingdom of Great Britain and Northern Ireland",
  "Canada", "France", "India", "Netherlands", "Australia", "Brazil", "Spain", "Sweden",
  "Italy", "Poland", "Switzerland", "Denmark", "Norway", "Israel"
];

const edLevels = [
  "Bachelor’s degree (B.A., B.S., B.Eng., etc.)",
  "Master’s degree (M.A., M.S., M.Eng., MBA, etc.)",
  "Secondary school (e.g. American high school, German Realschule, etc.)",
  "Associate degree (A.A., A.S., etc.)",
  "Professional degree (JD, MD, etc.)",
  "Other doctoral degree (Ph.D., Ed.D., etc.)"
];

const orgSizes = [
  "Just me - I am a freelancer, sole proprietor, etc.",
  "2 to 9 employees",
  "10 to 19 employees",
  "20 to 99 employees",
  "100 to 499 employees",
  "500 to 999 employees",
  "1,000 to 4,999 employees",
  "5,000 to 9,999 employees",
  "10,000 or more employees"
];

const devTypes = [
  "Developer, back-end", "Developer, full-stack", "Developer, front-end",
  "Developer, QA", "DevOps specialist", "Data scientist or machine learning specialist",
  "Data engineer", "Cloud infrastructure engineer", "System administrator",
  "Project manager", "Engineering manager", "Senior Executive (C-Suite, VP, etc.)"
];

const remoteWorkOptions = [
  "Remote",
  "Hybrid (some remote, some in-person)",
  "In-person"
];

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'gradio-app': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        src?: string;
        theme?: string;
        initial_height?: string;
        container?: string;
      }, HTMLElement>;
    }
  }
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'predict' | 'forecasting' | 'ab_testing' | 'umap_clusters' | 'nlp_map'>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Dashboard Sub-Filters
  const [forecastingFilter, setForecastingFilter] = useState<'all' | 'languages' | 'databases' | 'devops'>('all');
  const [abTestingView, setAbTestingView] = useState<'uplift' | 'balance'>('uplift');
  const [umapClusterFilter, setUmapClusterFilter] = useState<'all' | 'devops' | 'web' | 'enterprise'>('all');
  const [nlpSearchQuery, setNlpSearchQuery] = useState<string>('');

  return (
    <div className="min-h-screen bg-transparent font-sans text-slate-100 flex flex-col justify-between overflow-x-hidden selection:bg-cyan-500/30 selection:text-white">
      {/* 3D Fluid Shader Gradient Background (Black & Neon-Cyan) */}
      <div 
        className="fixed inset-0 z-[-2] pointer-events-none"
        style={{
          width: '100vw',
          height: '100vh',
        }}
      >
        <ShaderGradientCanvas
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: -2,
            pointerEvents: 'none'
          }}
        >
          <ShaderGradient
            type="waterPlane"
            animate="on"
            color1="#00ffff"
            color2="#0891b2"
            color3="#000000"
            bgColor1="#000000"
            bgColor2="#000000"
            brightness={1.0}
            uDensity={1.2}
            uFrequency={5.5}
            uSpeed={0.12}
            grain="on"
          />
        </ShaderGradientCanvas>
      </div>

      {/* Cybernetic Fractal dot grid overlay */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
        <CanvasFractalGrid />
      </div>

      {/* Floating Glass Navigation Bar */}
      <nav className="fixed top-4 left-4 right-4 z-50 glass-nav rounded-2xl max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 select-none">
          <Globe className="w-5 h-5 text-indigo-400 animate-spin-slow" />
          <span className="font-sans font-bold text-sm tracking-wider uppercase text-white">DevIntel Platform</span>
        </div>

        {/* Desktop Nav Links */}
        <div className="hidden lg:flex items-center gap-1">
          {[
            { id: 'home', label: 'Console Home' },
            { id: 'predict', label: 'Predictive Console' },
            { id: 'forecasting', label: 'Talent Forecasting' },
            { id: 'ab_testing', label: 'Causal A/B Testing' },
            { id: 'umap_clusters', label: 'UMAP Clusters' },
            { id: 'nlp_map', label: 'NLP Profile Map' }
          ].map((link) => (
            <button
              key={link.id}
              onClick={() => setCurrentPage(link.id as any)}
              className={`px-3 py-2 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                currentPage === link.id 
                  ? 'bg-white/10 text-cyan-400 border-b-2 border-cyan-400' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {link.label}
            </button>
          ))}
        </div>

        {/* Mobile menu trigger */}
        <div className="lg:hidden">
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-slate-400 hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile nav drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-20 left-4 right-4 z-40 glass-nav rounded-2xl p-4 flex flex-col gap-2 lg:hidden"
          >
            {[
              { id: 'home', label: 'Console Home' },
              { id: 'predict', label: 'Predictive Console' },
              { id: 'forecasting', label: 'Talent Forecasting' },
              { id: 'ab_testing', label: 'Causal A/B Testing' },
              { id: 'umap_clusters', label: 'UMAP Clusters' },
              { id: 'nlp_map', label: 'NLP Profile Map' }
            ].map((link) => (
              <button
                key={link.id}
                onClick={() => {
                  setCurrentPage(link.id as any);
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${
                  currentPage === link.id 
                    ? 'bg-white/10 text-cyan-400' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {link.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main View router workspace wrapped in BrowserWindow mockup */}
      <main className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 pt-28 pb-12 flex-1 flex flex-col justify-start">
        <BrowserWindow 
          url={`https://devintel.platform/console/${currentPage}`} 
          headerStyle="full" 
          variant="safari" 
          className="flex-1 w-full flex flex-col justify-between min-h-[600px] p-0 overflow-hidden bg-slate-950/20"
        >
          <div className="flex-1 p-4 sm:p-8 overflow-y-auto">
            <AnimatePresence mode="wait">
              
              {/* View 1: Console Home */}
              {currentPage === 'home' && (
                <motion.div
                  key="home"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left w-full h-full"
                >
                  <div className="lg:col-span-2 flex flex-col gap-6">
                    <MinimalCard className="p-6 bg-slate-950/40 border border-white/5">
                      <h2 className="text-2xl font-extrabold text-white">Talent Analytics Infrastructure</h2>
                      <p className="text-slate-400 font-medium mt-2 leading-relaxed text-sm">
                        Welcome to the DevIntel core control console. This client interface accesses pre-trained supervised estimators and high-dimensional semantic indexing endpoints compiled directly from multi-year developer survey repositories.
                      </p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                        <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-4">
                          <Layers className="w-5 h-5 text-indigo-400 mb-2" />
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Models Loaded</h4>
                          <p className="text-sm font-semibold text-slate-200 mt-1">3 Estimators</p>
                        </div>

                        <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-4">
                          <Globe className="w-5 h-5 text-emerald-400 mb-2" />
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Regional Data</h4>
                          <p className="text-sm font-semibold text-slate-200 mt-1">17 Countries</p>
                        </div>

                        <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-4">
                          <TrendingUp className="w-5 h-5 text-rose-400 mb-2" />
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Indexed Profiles</h4>
                          <p className="text-sm font-semibold text-slate-200 mt-1">48,200 Nodes</p>
                        </div>
                      </div>
                    </MinimalCard>
                  </div>

                  {/* Sidebar status */}
                  <div className="flex flex-col gap-6">
                    <MinimalCard className="p-6 bg-slate-950/40 border border-white/5">
                      <MinimalCardTitle className="flex items-center gap-1.5 text-slate-300 text-sm font-bold uppercase tracking-wider mb-4">
                        <Server className="w-4.5 h-4.5 text-indigo-400" />
                        ML Registry Health
                      </MinimalCardTitle>
                      
                      <div className="flex items-center gap-3 bg-slate-900/30 rounded-2xl p-3 border border-white/5 mb-3">
                        <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />
                        <div className="flex-1 text-xs">
                          <span className="font-bold text-slate-200 block">Space Server Link</span>
                          <span className="text-slate-400">HF Spaces Connected (Direct Embedded)</span>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-col gap-3">
                        <BorderBeamButton 
                          onClick={() => setCurrentPage('predict')}
                          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs tracking-wider uppercase rounded-xl"
                        >
                          Launch Calculators Console
                        </BorderBeamButton>
                      </div>

                      <MinimalCardDescription className="text-xs text-slate-500 mt-4 leading-relaxed font-medium">
                        Predictions are served securely via our direct Hugging Face Space endpoint, guaranteeing zero CORS network blocks.
                      </MinimalCardDescription>
                    </MinimalCard>

                    <MinimalCard className="p-6 bg-slate-950/40 border border-white/5">
                      <MinimalCardTitle className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Instructions</MinimalCardTitle>
                      <MinimalCardDescription className="text-xs text-slate-400 leading-relaxed font-medium">
                        Select **Predictive Console** from the top navigation bar or click **Launch Calculators** to load compensation estimators, attrition risks, and FAISS talent matchers.
                      </MinimalCardDescription>
                    </MinimalCard>
                  </div>
                </motion.div>
              )}

              {/* View 2: Embedded Gradio Console via standard CORS-immune iframe */}
              {currentPage === 'predict' && (
                <motion.div
                  key="predict"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                  className="w-full text-left h-full"
                >
                  <MinimalCard className="p-1 bg-slate-950/60 border border-white/5 overflow-hidden rounded-2xl flex flex-col">
                    <iframe
                      src="https://shivanshkandwal-devintel-hub.hf.space"
                      className="w-full min-h-[700px] border-0 rounded-xl bg-slate-900/10"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </MinimalCard>
                </motion.div>
              )}

              {/* View 3: Talent Forecasting Dashboard */}
              {currentPage === 'forecasting' && (
                <motion.div
                  key="forecasting"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col gap-6 text-left w-full h-full"
                >
                  {/* Slider Tabs filter */}
                  <div className="flex flex-col items-center gap-3 bg-slate-950/30 p-4 border border-white/5 rounded-2xl">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Telemetry Category Scope</span>
                    <DirectionAwareTabs
                      rounded="rounded-full"
                      roundedInner="rounded-full"
                      className="bg-slate-900 border border-white/5"
                      onChange={() => {}}
                      tabs={[
                        { id: 0, label: 'All Technologies', content: <div onClick={() => setForecastingFilter('all')} /> },
                        { id: 1, label: 'Programming Languages', content: <div onClick={() => setForecastingFilter('languages')} /> },
                        { id: 2, label: 'Databases & Indexing', content: <div onClick={() => setForecastingFilter('databases')} /> },
                        { id: 3, label: 'DevOps & Orchestration', content: <div onClick={() => setForecastingFilter('devops')} /> }
                      ]}
                    />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Plot canvas */}
                    <div className="lg:col-span-2">
                      <MinimalCard className="p-4 bg-slate-950/60 border border-white/5 overflow-hidden rounded-2xl min-h-[500px]">
                        <PlotlyChart reportId="interactive_forecasts.html" categoryFilter={forecastingFilter} />
                      </MinimalCard>
                    </div>

                    {/* Insights in GlassCards */}
                    <div className="flex flex-col gap-6">
                      <GlassCard className="border border-white/5">
                        <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-2">⚡ Python / Rust Ascendancy</h3>
                        <p className="text-xs text-slate-350 leading-relaxed font-medium">
                          Rust displays a robust upward adoption vector, projected to expand its active systems share by 32% by 2026 as concurrency and safety mandates increase. Python remains steady as the premier tooling environment.
                        </p>
                      </GlassCard>

                      <GlassCard className="border border-white/5">
                        <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-2">💾 PostgreSQL Expansion</h3>
                        <p className="text-xs text-slate-350 leading-relaxed font-medium">
                          Relational databases continue to command software backends. PostgreSQL maintains a widening lead over legacy engines, with adoption expected to cross 55% as vector query indexing integrates natively.
                        </p>
                      </GlassCard>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* View 4: Causal A/B Testing & Uplift Analysis */}
              {currentPage === 'ab_testing' && (
                <motion.div
                  key="ab_testing"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col gap-6 text-left w-full h-full"
                >
                  <div className="flex flex-col items-center gap-3 bg-slate-950/30 p-4 border border-white/5 rounded-2xl">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Matching Causal Evaluators</span>
                    <DirectionAwareTabs
                      rounded="rounded-full"
                      roundedInner="rounded-full"
                      className="bg-slate-900 border border-white/5"
                      onChange={() => {}}
                      tabs={[
                        { id: 0, label: 'Enterprise Uplift Performance', content: <div onClick={() => setAbTestingView('uplift')} /> },
                        { id: 1, label: 'Covariate Matching Balance', content: <div onClick={() => setAbTestingView('balance')} /> }
                      ]}
                    />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Plot Canvas */}
                    <div className="lg:col-span-2">
                      <MinimalCard className="p-4 bg-slate-950/60 border border-white/5 overflow-hidden rounded-2xl min-h-[500px]">
                        <PlotlyChart 
                          reportId={abTestingView === 'uplift' ? 'enterprise_uplift_by_cluster.html' : 'enterprise_matching_balance.html'} 
                        />
                      </MinimalCard>
                    </div>

                    {/* Insights inside GlassCard */}
                    <div className="flex flex-col gap-6">
                      <GlassCard className="border border-white/5">
                        <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-2">⚖️ Causal Treatment Impact</h3>
                        <p className="text-xs text-slate-350 leading-relaxed font-medium">
                          Propensity score matched analysis demonstrates that developers in enterprise-scale environments (+1,000 employees) see a retention probability boost of 14.5% compared to startups, proving the strong influence of compensation structures.
                        </p>
                      </GlassCard>

                      <GlassCard className="border border-white/5">
                        <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-2">📊 Covariate Alignment</h3>
                        <p className="text-xs text-slate-350 leading-relaxed font-medium">
                          Standardized Mean Difference (SMD) logs drop below the critical 0.05 threshold across all matched covariates (age, tenure, remote work mode), validating that selection bias has been successfully eliminated.
                        </p>
                      </GlassCard>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* View 5: UMAP Developer Clustering */}
              {currentPage === 'umap_clusters' && (
                <motion.div
                  key="umap_clusters"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col gap-6 text-left w-full h-full"
                >
                  <div className="flex flex-col items-center gap-3 bg-slate-950/30 p-4 border border-white/5 rounded-2xl">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Dimensionality Cohort Filtering</span>
                    <DirectionAwareTabs
                      rounded="rounded-full"
                      roundedInner="rounded-full"
                      className="bg-slate-900 border border-white/5"
                      onChange={() => {}}
                      tabs={[
                        { id: 0, label: 'All Developer Clusters', content: <div onClick={() => setUmapClusterFilter('all')} /> },
                        { id: 1, label: 'Infrastructure & DevOps', content: <div onClick={() => setUmapClusterFilter('devops')} /> },
                        { id: 2, label: 'Fullstack & Frontend', content: <div onClick={() => setUmapClusterFilter('web')} /> },
                        { id: 3, label: 'Enterprise / Senior Pioneers', content: <div onClick={() => setUmapClusterFilter('enterprise')} /> }
                      ]}
                    />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Plot Canvas */}
                    <div className="lg:col-span-2">
                      <MinimalCard className="p-4 bg-slate-950/60 border border-white/5 overflow-hidden rounded-2xl min-h-[500px]">
                        <PlotlyChart reportId="umap_developer_clusters.html" clusterFilter={umapClusterFilter} />
                      </MinimalCard>
                    </div>

                    {/* Insights inside GlassCard */}
                    <div className="flex flex-col gap-6">
                      <GlassCard className="border border-white/5">
                        <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-2">🪐 Cohort Segmentation</h3>
                        <p className="text-xs text-slate-350 leading-relaxed font-medium">
                          UMAP projection maps high-dimensional developer features to a 2D surface. The algorithm resolves distinct zones corresponding to specialized roles: Data/ML groups reside in the bottom right, DevOps in the center-left, and Fullstack teams span a wide central arc.
                        </p>
                      </GlassCard>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* View 6: NLP Profile Map Embedding */}
              {currentPage === 'nlp_map' && (
                <motion.div
                  key="nlp_map"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col gap-6 text-left w-full h-full"
                >
                  {/* Search Query Filter Overlay */}
                  <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-950/30 p-4 border border-white/5 rounded-2xl">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0">Search Embeddings Map</span>
                    <input
                      type="text"
                      value={nlpSearchQuery}
                      onChange={(e) => setNlpSearchQuery(e.target.value)}
                      placeholder="Type role keyword (e.g. backend, docker, python) to highlight nodes..."
                      className="flex-1 w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Plot Canvas */}
                    <div className="lg:col-span-2">
                      <MinimalCard className="p-4 bg-slate-950/60 border border-white/5 overflow-hidden rounded-2xl min-h-[500px]">
                        <PlotlyChart reportId="nlp_profile_map.html" searchQuery={nlpSearchQuery} />
                      </MinimalCard>
                    </div>

                    {/* Insights inside GlassCard */}
                    <div className="flex flex-col gap-6">
                      <GlassCard className="border border-white/5">
                        <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-2">🌐 Semantic Clustering</h3>
                        <p className="text-xs text-slate-350 leading-relaxed font-medium">
                          High-dimensional vector embeddings projection visualizes semantic relationships between developer talent tags. Proximity indicates similarity in technology pairings (e.g. cloud scales cluster near containerization nodes), validating vector retrieval configurations.
                        </p>
                      </GlassCard>
                    </div>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </BrowserWindow>
      </main>

      {/* Cybernetic Footer */}
      <footer className="relative z-10 border-t border-white/5 bg-slate-950/60 py-6 text-center text-xs text-slate-500 font-medium">
        <p>© 2026 DevIntel Unified Predictive Hub. All rights reserved. Powered by FAISS &amp; XGBoost.</p>
      </footer>
    </div>
  );
}
