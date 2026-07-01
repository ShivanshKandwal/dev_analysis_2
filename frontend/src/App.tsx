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
import { CanvasFractalGrid } from './components/ui/canvas-fractal-grid';
import { MinimalCard, MinimalCardTitle, MinimalCardDescription } from './components/ui/minimal-card';
import { BorderBeamButton } from './components/ui/border-beam-button';
import { BrowserWindow } from './components/ui/mock-browser-window';
import { TelemetryDashboard } from './components/TelemetryDashboard';
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
  const [currentPage, setCurrentPage] = useState<'home' | 'predict'>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-black font-sans text-slate-100 flex flex-col justify-between overflow-x-hidden selection:bg-cyan-500/30 selection:text-white">
      {/* Black & Neon-Cyan Cybernetic Grid Background */}
      <div className="fixed inset-0 z-[-2] bg-black pointer-events-none overflow-hidden">
        {/* Neon-cyan radial glow at top left */}
        <div className="absolute -top-[20%] -left-[20%] w-[60vw] h-[60vw] rounded-full bg-cyan-500/15 blur-[120px]" />
        {/* Neon-cyan/blue radial glow at bottom right */}
        <div className="absolute -bottom-[20%] -right-[20%] w-[60vw] h-[60vw] rounded-full bg-cyan-600/10 blur-[120px]" />
        
        {/* Cybernetic grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0891b2_1px,transparent_1px),linear-gradient(to_bottom,#0891b2_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20" />
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
        <div className="hidden md:flex items-center gap-1">
          {[
            { id: 'home', label: 'Console Home' },
            { id: 'predict', label: 'Predictive Console' }
          ].map((link) => (
            <button
              key={link.id}
              onClick={() => setCurrentPage(link.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                currentPage === link.id 
                  ? 'bg-white/10 text-white border-b-2 border-indigo-400' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {link.label}
            </button>
          ))}
        </div>

        {/* Mobile menu trigger */}
        <div className="md:hidden">
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
            className="fixed top-20 left-4 right-4 z-40 glass-nav rounded-2xl p-4 flex flex-col gap-2 md:hidden"
          >
            {[
              { id: 'home', label: 'Console Home' },
              { id: 'predict', label: 'Predictive Console' }
            ].map((link) => (
              <button
                key={link.id}
                onClick={() => {
                  setCurrentPage(link.id as any);
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${
                  currentPage === link.id 
                    ? 'bg-white/10 text-white' 
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
      <main className="relative z-10 max-w-7xl mx-auto w-full px-6 pt-28 pb-12 flex-1 flex flex-col justify-start">
        <BrowserWindow 
          url={`https://devintel.platform/console/${currentPage}`} 
          headerStyle="full" 
          variant="safari" 
          className="flex-1 w-full flex flex-col justify-between min-h-[580px] p-0 overflow-hidden bg-slate-950/20"
        >
          <div className="flex-1 p-6 md:p-8 overflow-y-auto">
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
