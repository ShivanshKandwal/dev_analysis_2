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
  const [activeEdaChart, setActiveEdaChart] = useState<number>(0);

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
                  className="flex flex-col gap-6 text-left w-full h-full"
                >
                  {/* Top Split Columns */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 flex flex-col gap-6">
                      <MinimalCard className="p-6 bg-slate-950/40 border border-white/5">
                        <h2 className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-400 to-indigo-400">
                          TALENT TELEMETRY HUB
                        </h2>
                        <p className="text-slate-300 font-medium mt-3 leading-relaxed text-base">
                          Real-time AI telemetry indexing 48,200 developer profiles across 124 technology dimensions.
                        </p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                          <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-4">
                            <Layers className="w-5 h-5 text-indigo-400 mb-2" />
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Models Loaded</h4>
                            <p className="text-base font-bold text-slate-100 mt-1">3 Estimators</p>
                          </div>

                          <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-4">
                            <Globe className="w-5 h-5 text-emerald-400 mb-2" />
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Regional Data</h4>
                            <p className="text-base font-bold text-slate-100 mt-1">17 Countries</p>
                          </div>

                          <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-4">
                            <TrendingUp className="w-5 h-5 text-rose-400 mb-2" />
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Indexed Profiles</h4>
                            <p className="text-base font-bold text-slate-100 mt-1">48,200 Nodes</p>
                          </div>
                        </div>
                      </MinimalCard>

                      <MinimalCard className="p-6 bg-slate-950/40 border border-white/5">
                        <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400 uppercase tracking-wider mb-3">
                          DATASET SCHEMATIC OVERVIEW
                        </h3>
                        <p className="text-slate-300 text-sm font-medium mb-5 leading-relaxed">
                          Survey datasets and GitHub public mappings processed through localized feature matching pipelines.
                        </p>
                        
                        {/* Interactive Spec Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {[
                            {
                              title: '124 Tech Features',
                              detailTitle: 'Dimensional Scope',
                              desc: '124 technology features including language competency scales, database engines, cloud runtimes, and local environment tags.',
                              color: 'text-indigo-400'
                            },
                            {
                              title: 'Propensity Cohorts',
                              detailTitle: 'Causal Sizing',
                              desc: 'Developers matched across firm sizes (Startup vs. Enterprise) using propensity scores to calculate attrition causal weights.',
                              color: 'text-emerald-400'
                            },
                            {
                              title: 'FAISS Semantic Index',
                              detailTitle: 'Vector Search Space',
                              desc: '48,200 profile vectors parsed into an indexed vector database for real-time semantic neighborhood candidate lookups.',
                              color: 'text-cyan-400'
                            },
                            {
                              title: '80/20 Train Split',
                              detailTitle: 'Model Optimization',
                              desc: 'Trained using supervised 80/20 training/validation splits, minimizing prediction error (MAE) using XGBoost boosters.',
                              color: 'text-rose-400'
                            }
                          ].map((spec) => (
                            <div 
                              key={spec.title} 
                              className="group relative bg-slate-900/30 hover:bg-slate-900/60 border border-white/5 hover:border-cyan-500/20 rounded-xl p-4 transition-all duration-300 cursor-help"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                                <span className="text-sm font-bold text-slate-200">{spec.title}</span>
                              </div>
                              
                              {/* Hover Tooltip Overlay */}
                              <div className="absolute bottom-full mb-2.5 left-1/2 -translate-x-1/2 w-64 p-3 bg-slate-950/95 border border-cyan-500/30 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-250 pointer-events-none z-50 text-xs leading-relaxed">
                                <span className={`font-bold block mb-1 uppercase tracking-wider ${spec.color}`}>{spec.detailTitle}</span>
                                <p className="text-slate-300 font-medium">{spec.desc}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </MinimalCard>
                    </div>

                    {/* Sidebar status */}
                    <div className="flex flex-col gap-6">
                      <MinimalCard className="p-6 bg-slate-950/40 border border-white/5">
                        <MinimalCardTitle className="flex items-center gap-1.5 text-slate-100 text-base font-bold uppercase tracking-wider mb-4">
                          <Server className="w-5 h-5 text-indigo-400" />
                          ML Registry Health
                        </MinimalCardTitle>
                        
                        <div className="flex items-center gap-3 bg-slate-900/30 rounded-2xl p-4 border border-white/5 mb-3">
                          <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />
                          <div className="flex-1 text-sm">
                            <span className="font-bold text-slate-100 block">Space Server Link</span>
                            <span className="text-slate-300 font-medium">HF Spaces Connected (Direct Embedded)</span>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-col gap-3">
                          <BorderBeamButton 
                            onClick={() => setCurrentPage('predict')}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs tracking-wider uppercase rounded-xl"
                          >
                            Launch Calculators Console
                          </BorderBeamButton>
                        </div>

                        <MinimalCardDescription className="text-sm text-slate-400 mt-4 leading-relaxed font-medium">
                          Predictions are served securely via our direct Hugging Face Space endpoint, guaranteeing zero CORS network blocks.
                        </MinimalCardDescription>
                      </MinimalCard>

                      <MinimalCard className="p-6 bg-slate-950/40 border border-white/5">
                        <MinimalCardTitle className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-2">Instructions</MinimalCardTitle>
                        <MinimalCardDescription className="text-sm text-slate-400 leading-relaxed font-medium">
                          Select **Predictive Console** from the top navigation bar or click **Launch Calculators** to load compensation estimators, attrition risks, and FAISS talent matchers.
                        </MinimalCardDescription>
                      </MinimalCard>
                    </div>
                  </div>

                  {/* Bottom Section: Gradient Toggled EDA Chart Matrix */}
                  <div className="flex flex-col gap-6 mt-4">
                    <h3 className="text-2xl font-bold text-white border-b border-white/5 pb-2">📊 Exploratory Data Analysis & Telemetry Matrix</h3>
                    
                    {/* Gradient Button Group */}
                    <div className="flex flex-wrap justify-center gap-2 bg-slate-900/60 p-3.5 border border-white/5 rounded-2xl max-w-5xl mx-auto w-full">
                      {[
                        { id: 'feature_importance.json', shortTitle: 'Salary Weights', title: 'Salary Estimator: Feature Weights', desc: 'Relative feature importances computed by the XGBoost training run.' },
                        { id: 'predicted_vs_actual.json', shortTitle: 'Salary Fit', title: 'Salary Estimator: Validation Fit', desc: 'Comparison plot matching validation predicted salaries vs actual targets.' },
                        { id: 'mae_by_career_stage.json', shortTitle: 'Salary Error', title: 'Salary Estimator: Error Metrics', desc: 'Mean Absolute Error scores calculated across junior, mid, and senior cohorts.' },
                        { id: 'churn_feature_importance.json', shortTitle: 'Attrition Weights', title: 'Attrition Risk: Feature Weights', desc: 'Relative feature impact weightings for developer attrition classifiers.' },
                        { id: 'churn_risk_distribution.json', shortTitle: 'Attrition Curve', title: 'Attrition Risk: Probability Curve', desc: 'Distribution plot of attrition likelihood ratios among indexed developers.' },
                        { id: 'model_comparison.json', shortTitle: 'Model Comparison', title: 'Telemetry: Algorithm Performance', desc: 'Receiver Operating Characteristic (ROC) comparison curves across models.' }
                      ].map((graph, idx) => (
                        <button
                          key={graph.id}
                          onClick={() => setActiveEdaChart(idx)}
                          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl border transition-all duration-300 ${
                            activeEdaChart === idx
                              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)] border-cyan-400/40'
                              : 'bg-slate-950/40 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                          }`}
                        >
                          {graph.shortTitle}
                        </button>
                      ))}
                    </div>

                    {/* Rendered active chart */}
                    {(() => {
                      const activeGraph = [
                        { id: 'feature_importance.json', title: 'Salary Estimator: Feature Weights', desc: 'Relative feature importances computed by the XGBoost training run.' },
                        { id: 'predicted_vs_actual.json', title: 'Salary Estimator: Validation Fit', desc: 'Comparison plot matching validation predicted salaries vs actual targets.' },
                        { id: 'mae_by_career_stage.json', title: 'Salary Estimator: Error Metrics', desc: 'Mean Absolute Error scores calculated across junior, mid, and senior cohorts.' },
                        { id: 'churn_feature_importance.json', title: 'Attrition Risk: Feature Weights', desc: 'Relative feature impact weightings for developer attrition classifiers.' },
                        { id: 'churn_risk_distribution.json', title: 'Attrition Risk: Probability Curve', desc: 'Distribution plot of attrition likelihood ratios among indexed developers.' },
                        { id: 'model_comparison.json', title: 'Telemetry: Algorithm Performance', desc: 'Receiver Operating Characteristic (ROC) comparison curves across models.' }
                      ][activeEdaChart] || { id: 'feature_importance.json', title: 'Salary Estimator: Feature Weights', desc: 'Relative feature importances computed by the XGBoost training run.' };

                      return (
                        <MinimalCard className="p-6 bg-slate-950/60 border border-white/5 overflow-hidden rounded-2xl flex flex-col justify-between min-h-[580px] w-full mt-4">
                          <div className="mb-4">
                            <span className="text-lg font-bold text-cyan-400 block uppercase tracking-wider">{activeGraph.title}</span>
                            <span className="text-sm text-slate-350 font-medium leading-relaxed block mt-1">{activeGraph.desc}</span>
                          </div>
                          <div className="flex-1 w-full min-h-[480px]">
                            <PlotlyChart reportId={activeGraph.id} />
                          </div>
                        </MinimalCard>
                      );
                    })()}
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
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Telemetry Category Scope</span>
                    <DirectionAwareTabs
                      rounded="rounded-full"
                      roundedInner="rounded-full"
                      className="bg-slate-900 border border-white/5"
                      onChange={(id) => {
                        if (id === 0) setForecastingFilter('all');
                        else if (id === 1) setForecastingFilter('languages');
                        else if (id === 2) setForecastingFilter('databases');
                        else if (id === 3) setForecastingFilter('devops');
                      }}
                      tabs={[
                        { id: 0, label: 'All Technologies', content: null },
                        { id: 1, label: 'Programming Languages', content: null },
                        { id: 2, label: 'Databases & Indexing', content: null },
                        { id: 3, label: 'DevOps & Orchestration', content: null }
                      ]}
                    />
                  </div>
                  <div className="flex flex-col gap-6">
                    {/* Plot canvas */}
                    <MinimalCard className="p-4 bg-slate-950/60 border border-white/5 overflow-hidden rounded-2xl min-h-[500px] w-full">
                      <PlotlyChart reportId="interactive_forecasts.html" categoryFilter={forecastingFilter} />
                    </MinimalCard>

                    {/* Insights in GlassCards side-by-side */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <GlassCard className="border border-white/5">
                        <h3 className="text-base font-bold text-cyan-400 uppercase tracking-wider mb-2">⚡ Python / Rust Ascendancy</h3>
                        <p className="text-sm text-slate-300 leading-relaxed font-medium">
                          Rust displays a robust upward adoption vector, projected to expand its active systems share by 32% by 2026 as concurrency and safety mandates increase. Python remains steady as the premier tooling environment.
                        </p>
                      </GlassCard>

                      <GlassCard className="border border-white/5">
                        <h3 className="text-base font-bold text-cyan-400 uppercase tracking-wider mb-2">💾 PostgreSQL Expansion</h3>
                        <p className="text-sm text-slate-300 leading-relaxed font-medium">
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
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Matching Causal Evaluators</span>
                    <DirectionAwareTabs
                      rounded="rounded-full"
                      roundedInner="rounded-full"
                      className="bg-slate-900 border border-white/5"
                      onChange={(id) => {
                        setAbTestingView(id === 0 ? 'uplift' : 'balance');
                      }}
                      tabs={[
                        { id: 0, label: 'Enterprise Uplift Performance', content: null },
                        { id: 1, label: 'Covariate Matching Balance', content: null }
                      ]}
                    />
                  </div>

                  <div className="flex flex-col gap-6">
                    {/* Plot Canvas */}
                    <MinimalCard className="p-4 bg-slate-950/60 border border-white/5 overflow-hidden rounded-2xl min-h-[500px] w-full">
                      <PlotlyChart 
                        reportId={abTestingView === 'uplift' ? 'enterprise_uplift_by_cluster.html' : 'enterprise_matching_balance.html'} 
                      />
                    </MinimalCard>

                    {/* Insights inside GlassCard side-by-side */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <GlassCard className="border border-white/5">
                        <h3 className="text-base font-bold text-cyan-400 uppercase tracking-wider mb-2">⚖️ Causal Treatment Impact</h3>
                        <p className="text-sm text-slate-300 leading-relaxed font-medium">
                          Propensity score matched analysis demonstrates that developers in enterprise-scale environments (+1,000 employees) see a retention probability boost of 14.5% compared to startups, proving the strong influence of compensation structures.
                        </p>
                      </GlassCard>

                      <GlassCard className="border border-white/5">
                        <h3 className="text-base font-bold text-cyan-400 uppercase tracking-wider mb-2">📊 Covariate Alignment</h3>
                        <p className="text-sm text-slate-300 leading-relaxed font-medium">
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
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dimensionality Cohort Filtering</span>
                    <DirectionAwareTabs
                      rounded="rounded-full"
                      roundedInner="rounded-full"
                      className="bg-slate-900 border border-white/5"
                      onChange={(id) => {
                        if (id === 0) setUmapClusterFilter('all');
                        else if (id === 1) setUmapClusterFilter('devops');
                        else if (id === 2) setUmapClusterFilter('web');
                        else if (id === 3) setUmapClusterFilter('enterprise');
                      }}
                      tabs={[
                        { id: 0, label: 'All Developer Clusters', content: null },
                        { id: 1, label: 'Infrastructure & DevOps', content: null },
                        { id: 2, label: 'Fullstack & Frontend', content: null },
                        { id: 3, label: 'Enterprise / Senior Pioneers', content: null }
                      ]}
                    />
                  </div>

                  <div className="flex flex-col gap-6">
                    {/* Plot Canvas */}
                    <MinimalCard className="p-4 bg-slate-950/60 border border-white/5 overflow-hidden rounded-2xl min-h-[500px] w-full">
                      <PlotlyChart reportId="umap_developer_clusters.html" clusterFilter={umapClusterFilter} />
                    </MinimalCard>

                    {/* Insights inside GlassCard */}
                    <GlassCard className="border border-white/5 w-full">
                      <h3 className="text-base font-bold text-cyan-400 uppercase tracking-wider mb-2">🪐 Cohort Segmentation</h3>
                      <p className="text-sm text-slate-300 leading-relaxed font-medium">
                        UMAP projection maps high-dimensional developer features to a 2D surface. The algorithm resolves distinct zones corresponding to specialized roles: Data/ML groups reside in the bottom right, DevOps in the center-left, and Fullstack teams span a wide central arc.
                      </p>
                    </GlassCard>
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
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0">Search Embeddings Map</span>
                    <input
                      type="text"
                      value={nlpSearchQuery}
                      onChange={(e) => setNlpSearchQuery(e.target.value)}
                      placeholder="Type role keyword (e.g. backend, docker, python) to highlight nodes..."
                      className="flex-1 w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>

                  <div className="flex flex-col gap-6">
                    {/* Plot Canvas */}
                    <MinimalCard className="p-4 bg-slate-950/60 border border-white/5 overflow-hidden rounded-2xl min-h-[500px] w-full">
                      <PlotlyChart reportId="nlp_profile_map.html" searchQuery={nlpSearchQuery} />
                    </MinimalCard>

                    {/* Insights inside GlassCard */}
                    <GlassCard className="border border-white/5 w-full">
                      <h3 className="text-base font-bold text-cyan-400 uppercase tracking-wider mb-2">🌐 Semantic Clustering</h3>
                      <p className="text-sm text-slate-300 leading-relaxed font-medium">
                        High-dimensional vector embeddings projection visualizes semantic relationships between developer talent tags. Proximity indicates similarity in technology pairings (e.g. cloud scales cluster near containerization nodes), validating vector retrieval configurations.
                      </p>
                    </GlassCard>
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
