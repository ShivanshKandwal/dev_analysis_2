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

export default function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'salary' | 'retention' | 'search'>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // HF Token state saved in localStorage for private spaces
  const [hfToken, setHfToken] = useState(() => localStorage.getItem("hf_token") || "");

  // Gradio client state
  const [gradioClient, setGradioClient] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Tab 1: Salary States
  const [salaryForm, setSalaryForm] = useState({
    country: "United States of America",
    edLevel: "Bachelor’s degree (B.A., B.S., B.Eng., etc.)",
    orgSize: "100 to 499 employees",
    devType: "Developer, back-end",
    remoteWork: "Remote",
    yearsCode: 10,
    yearsCodePro: 6,
    workExp: 8,
    jobSat: 4
  });
  const [predictedSalary, setPredictedSalary] = useState<string>("");

  // Tab 2: Retention States
  const [retentionForm, setRetentionForm] = useState({
    yearsCode: 8,
    yearsCodePro: 4,
    workExp: 6,
    isEnterprise: "Startup / Mid-Size Organization",
    devType: "Developer, back-end"
  });
  const [retentionResult, setRetentionResult] = useState<{
    prob: string;
    risk: string;
    value: string;
  } | null>(null);

  // Tab 3: Semantic Search States
  const [searchQuery, setSearchQuery] = useState<string>("Backend engineer with cloud scaling experience");
  const [searchK, setSearchK] = useState<number>(5);
  const [searchResultMarkdown, setSearchResultMarkdown] = useState<string>("");

  // Initialize connection to Hugging Face Space
  useEffect(() => {
    async function initClient() {
      setGradioClient(null);
      setErrorMsg("");
      try {
        const connectOptions: any = {};
        if (hfToken.trim()) {
          connectOptions.hf_token = hfToken.trim();
        }
        const client = await Client.connect("ShivanshKandwal/devintel-hub");
        setGradioClient(client);
      } catch (err: any) {
        console.error("Failed to connect to Gradio API:", err);
        setErrorMsg(`Model server is offline. Reason: ${err?.message || err}`);
      }
    }
    initClient();
  }, [hfToken]);

  const handleSaveToken = (val: string) => {
    localStorage.setItem("hf_token", val);
    setHfToken(val);
  };

  const handleEstimateSalary = async () => {
    if (!gradioClient) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await gradioClient.predict("/predict_salary_interface", {
        country: salaryForm.country,
        ed_level: salaryForm.edLevel,
        org_size: salaryForm.orgSize,
        dev_type: salaryForm.devType,
        remote_work: salaryForm.remoteWork,
        years_code: salaryForm.yearsCode,
        years_code_pro: salaryForm.yearsCodePro,
        work_exp: salaryForm.workExp,
        job_sat: salaryForm.jobSat
      });
      setPredictedSalary(res.data[0]);
    } catch (err) {
      setErrorMsg("Failed to query salary model.");
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluateRetention = async () => {
    if (!gradioClient) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await gradioClient.predict("/predict_retention_interface", {
        years_code: retentionForm.yearsCode,
        years_code_pro: retentionForm.yearsCodePro,
        work_exp: retentionForm.workExp,
        is_enterprise: retentionForm.isEnterprise,
        dev_type: retentionForm.devType
      });
      setRetentionResult({
        prob: res.data[0],
        risk: res.data[1],
        value: res.data[2]
      });
    } catch (err) {
      setErrorMsg("Failed to query retention model.");
    } finally {
      setLoading(false);
    }
  };

  const handleSemanticSearch = async () => {
    if (!gradioClient) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await gradioClient.predict("/semantic_search_interface", {
        query: searchQuery,
        k: searchK
      });
      setSearchResultMarkdown(res.data[0]);
    } catch (err) {
      setErrorMsg("Failed to retrieve profile matches.");
    } finally {
      setLoading(false);
    }
  };

  const renderMarkdownTable = (md: string) => {
    if (!md) return null;
    const rows = md.split('\n').filter(r => r.includes('|') && !r.includes('---'));
    if (rows.length <= 1) return <p className="text-slate-450 font-medium">{md}</p>;
    
    const headers = rows[0].split('|').map(h => h.trim()).filter(Boolean);
    const dataRows = rows.slice(1).map(row => row.split('|').map(c => c.trim()).filter(Boolean));

    return (
      <div className="overflow-x-auto w-full rounded-2xl border border-white/10 bg-slate-950/40 backdrop-blur-md">
        <table className="min-w-full divide-y divide-white/10 text-left text-sm text-slate-350">
          <thead className="bg-slate-900/60 font-semibold text-slate-200">
            <tr>
              {headers.map((h, i) => (
                <th key={i} className="px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {dataRows.map((row, idx) => (
              <tr key={idx} className="hover:bg-white/5 transition-colors">
                {row.map((cell, i) => (
                  <td key={i} className="px-4 py-3 font-medium text-slate-300">
                    {cell.startsWith('**') ? cell.replace(/\*\*/g, '') : cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden bg-transparent text-slate-100">
      
      {/* 3D ShaderGradient Background with Blue-Green configuration */}
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
          color1="#0ea5e9"
          color2="#10b981"
          color3="#4f46e5"
          bgColor1="#030712"
          bgColor2="#030712"
          brightness={1.2}
          uDensity={1.5}
          uFrequency={5.5}
          uSpeed={0.15}
          grain="on"
        />
      </ShaderGradientCanvas>

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
            { id: 'salary', label: 'Salary Predictor' },
            { id: 'retention', label: 'Retention Risk' },
            { id: 'search', label: 'Talent Search' }
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
              { id: 'salary', label: 'Salary Predictor' },
              { id: 'retention', label: 'Retention Risk' },
              { id: 'search', label: 'Talent Search' }
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

                    {/* Inference resource logs component */}
                    <TelemetryDashboard />
                  </div>

                  {/* Sidebar status */}
                  <div className="flex flex-col gap-6">
                    <MinimalCard className="p-6 bg-slate-950/40 border border-white/5">
                      <MinimalCardTitle className="flex items-center gap-1.5 text-slate-300 text-sm font-bold uppercase tracking-wider mb-4">
                        <Server className="w-4.5 h-4.5 text-indigo-400" />
                        ML Registry Health
                      </MinimalCardTitle>
                      
                      <div className="flex items-center gap-3 bg-slate-900/30 rounded-2xl p-3 border border-white/5 mb-3">
                        <div className={`w-3 h-3 rounded-full ${gradioClient ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-amber-500 animate-pulse'}`} />
                        <div className="flex-1 text-xs">
                          <span className="font-bold text-slate-200 block">Space Server Link</span>
                          <span className="text-slate-400">{gradioClient ? "HF Spaces Connected" : "Connecting..."}</span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 mt-4">
                        <Label htmlFor="hf-token" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">HF Read Token (for Private Space)</Label>
                        <Input
                          id="hf-token"
                          type="password"
                          value={hfToken}
                          onChange={(e) => handleSaveToken(e.target.value)}
                          placeholder="hf_..."
                          className="h-8 text-xs bg-slate-900/50 border-white/10 text-white focus:bg-slate-900"
                        />
                      </div>

                      {errorMsg && (
                        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 mt-4 text-left">
                          <p className="text-xs text-rose-400 font-semibold leading-normal">{errorMsg}</p>
                        </div>
                      )}

                      <MinimalCardDescription className="text-xs text-slate-500 mt-4 leading-relaxed font-medium">
                        Pipelines automatically execute target embeddings locally or route queries via LFS pointers on backend space environments.
                      </MinimalCardDescription>
                    </MinimalCard>

                    <MinimalCard className="p-6 bg-slate-950/40 border border-white/5">
                      <MinimalCardTitle className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Instructions</MinimalCardTitle>
                      <MinimalCardDescription className="text-xs text-slate-400 leading-relaxed font-medium">
                        Select a page from the floating navigation bar to load compensation analysis, retention probability assessments, or vector searching consoles.
                      </MinimalCardDescription>
                    </MinimalCard>
                  </div>
                </motion.div>
              )}

              {/* View 2: Salary market predictor */}
              {currentPage === 'salary' && (
                <motion.div
                  key="salary"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                  className="w-full text-left"
                >
                  <MinimalCard className="p-6 bg-slate-950/40 border border-white/5 flex flex-col gap-6">
                    <div className="border-b border-white/10 pb-4">
                      <h2 className="text-2xl font-extrabold text-white">Compensation Market Estimator</h2>
                      <p className="text-sm text-slate-400 mt-1 font-medium">Evaluate expected annual compensation rates based on demographics, work environments, and background levels.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Country */}
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="country" className="text-xs font-bold text-slate-400 uppercase tracking-wider">Demographic Region / Location</Label>
                        <Select
                          value={salaryForm.country}
                          onValueChange={(val) => setSalaryForm(p => ({ ...p, country: val }))}
                        >
                          <SelectTrigger id="country" className="bg-slate-900/60 border-white/10 text-white">
                            <SelectValue placeholder="Select location" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-900 border-white/15 text-white">
                            {countries.map(c => <SelectItem key={c} value={c} className="focus:bg-indigo-600 focus:text-white">{c}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Education */}
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="edLevel" className="text-xs font-bold text-slate-400 uppercase tracking-wider">Educational Attainment</Label>
                        <Select
                          value={salaryForm.edLevel}
                          onValueChange={(val) => setSalaryForm(p => ({ ...p, edLevel: val }))}
                        >
                          <SelectTrigger id="edLevel" className="bg-slate-900/60 border-white/10 text-white">
                            <SelectValue placeholder="Select degree" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-900 border-white/15 text-white">
                            {edLevels.map(e => <SelectItem key={e} value={e} className="focus:bg-indigo-600">{e}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Company Size */}
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="orgSize" className="text-xs font-bold text-slate-400 uppercase tracking-wider">Workforce Size</Label>
                        <Select
                          value={salaryForm.orgSize}
                          onValueChange={(val) => setSalaryForm(p => ({ ...p, orgSize: val }))}
                        >
                          <SelectTrigger id="orgSize" className="bg-slate-900/60 border-white/10 text-white">
                            <SelectValue placeholder="Select size" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-900 border-white/15 text-white">
                            {orgSizes.map(o => <SelectItem key={o} value={o} className="focus:bg-indigo-600">{o}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Developer Subtype */}
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="devType" className="text-xs font-bold text-slate-400 uppercase tracking-wider">Developer Primary Subtype</Label>
                        <Select
                          value={salaryForm.devType}
                          onValueChange={(val) => setSalaryForm(p => ({ ...p, devType: val }))}
                        >
                          <SelectTrigger id="devType" className="bg-slate-900/60 border-white/10 text-white">
                            <SelectValue placeholder="Select subtype" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-900 border-white/15 text-white">
                            {devTypes.map(d => <SelectItem key={d} value={d} className="focus:bg-indigo-600">{d}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Remote Work Mode */}
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="remoteWork" className="text-xs font-bold text-slate-400 uppercase tracking-wider">Remote Modality</Label>
                        <Select
                          value={salaryForm.remoteWork}
                          onValueChange={(val) => setSalaryForm(p => ({ ...p, remoteWork: val }))}
                        >
                          <SelectTrigger id="remoteWork" className="bg-slate-900/60 border-white/10 text-white">
                            <SelectValue placeholder="Select work-mode" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-900 border-white/15 text-white">
                            {remoteWorkOptions.map(r => <SelectItem key={r} value={r} className="focus:bg-indigo-600">{r}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Years Code Slider */}
                      <div className="flex flex-col gap-2">
                        <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Coding Experience: {salaryForm.yearsCode} Years</Label>
                        <Slider 
                          value={[salaryForm.yearsCode]} 
                          onValueChange={(val) => setSalaryForm(p => ({ ...p, yearsCode: val[0] }))}
                          max={50} 
                          step={1} 
                        />
                      </div>

                      {/* Years Pro Code Slider */}
                      <div className="flex flex-col gap-2">
                        <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Professional Coding Experience: {salaryForm.yearsCodePro} Years</Label>
                        <Slider 
                          value={[salaryForm.yearsCodePro]} 
                          onValueChange={(val) => setSalaryForm(p => ({ ...p, yearsCodePro: val[0] }))}
                          max={50} 
                          step={1} 
                        />
                      </div>

                      {/* Work Exp Slider */}
                      <div className="flex flex-col gap-2">
                        <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Aggregate Work Experience: {salaryForm.workExp} Years</Label>
                        <Slider 
                          value={[salaryForm.workExp]} 
                          onValueChange={(val) => setSalaryForm(p => ({ ...p, workExp: val[0] }))}
                          max={50} 
                          step={1} 
                        />
                      </div>

                      {/* Job Satisfaction */}
                      <div className="flex flex-col gap-2">
                        <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Satisfaction Index: {salaryForm.jobSat}/5</Label>
                        <Slider 
                          value={[salaryForm.jobSat]} 
                          onValueChange={(val) => setSalaryForm(p => ({ ...p, jobSat: val[0] }))}
                          max={5} 
                          min={1}
                          step={1} 
                        />
                      </div>
                    </div>

                    <div className="mt-6 flex flex-col md:flex-row justify-between items-center gap-6 border-t border-white/10 pt-6">
                      <BorderBeamButton 
                        onClick={handleEstimateSalary} 
                        disabled={loading || !gradioClient}
                        className="w-full md:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white transition font-semibold"
                      >
                        {loading ? "Calculating..." : "Compute Estimate"}
                      </BorderBeamButton>

                      {predictedSalary && (
                        <div className="w-full md:w-auto bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-6 py-3">
                          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">Estimated Annual Compensation</span>
                          <h4 className="text-xl font-mono font-bold text-emerald-300 mt-0.5">{predictedSalary}</h4>
                        </div>
                      )}
                    </div>
                  </MinimalCard>
                </motion.div>
              )}

              {/* View 3: Retention Risk Analysis */}
              {currentPage === 'retention' && (
                <motion.div
                  key="retention"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                  className="w-full text-left"
                >
                  <MinimalCard className="p-6 bg-slate-950/40 border border-white/5 flex flex-col gap-6">
                    <div className="border-b border-white/10 pb-4">
                      <h2 className="text-2xl font-extrabold text-white">Retention Evaluator &amp; Profile Valuator</h2>
                      <p className="text-sm text-slate-400 mt-1 font-medium">Analyze churn probabilities and evaluate equity career valuation calculations.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Developer Subtype */}
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="ret-devType" className="text-xs font-bold text-slate-400 uppercase tracking-wider">Developer Subtype / Role</Label>
                        <Select
                          value={retentionForm.devType}
                          onValueChange={(val) => setRetentionForm(p => ({ ...p, devType: val }))}
                        >
                          <SelectTrigger id="ret-devType" className="bg-slate-900/60 border-white/10 text-white">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-900 border-white/15 text-white">
                            {devTypes.map(d => <SelectItem key={d} value={d} className="focus:bg-indigo-600">{d}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Organization Type (Enterprise vs Startup) */}
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="isEnterprise" className="text-xs font-bold text-slate-400 uppercase tracking-wider">Organization Tier Type</Label>
                        <Select
                          value={retentionForm.isEnterprise}
                          onValueChange={(val) => setRetentionForm(p => ({ ...p, isEnterprise: val }))}
                        >
                          <SelectTrigger id="isEnterprise" className="bg-slate-900/60 border-white/10 text-white">
                            <SelectValue placeholder="Select org type" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-900 border-white/15 text-white">
                            <SelectItem value="Startup / Mid-Size Organization" className="focus:bg-indigo-600">Startup / Mid-Size (Under 1,000 employees)</SelectItem>
                            <SelectItem value="Enterprise Organization (1,000+ employees)" className="focus:bg-indigo-600">Enterprise Scale (1,000+ employees)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Years Code Slider */}
                      <div className="flex flex-col gap-2">
                        <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Years Coding: {retentionForm.yearsCode} Years</Label>
                        <Slider 
                          value={[retentionForm.yearsCode]} 
                          onValueChange={(val) => setRetentionForm(p => ({ ...p, yearsCode: val[0] }))}
                          max={50} 
                          step={1} 
                        />
                      </div>

                      {/* Years Pro Code Slider */}
                      <div className="flex flex-col gap-2">
                        <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Professional Coding: {retentionForm.yearsCodePro} Years</Label>
                        <Slider 
                          value={[retentionForm.yearsCodePro]} 
                          onValueChange={(val) => setRetentionForm(p => ({ ...p, yearsCodePro: val[0] }))}
                          max={50} 
                          step={1} 
                        />
                      </div>

                      {/* Work Exp Slider */}
                      <div className="flex flex-col gap-2 md:col-span-2">
                        <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Aggregate Work Experience: {retentionForm.workExp} Years</Label>
                        <Slider 
                          value={[retentionForm.workExp]} 
                          onValueChange={(val) => setRetentionForm(p => ({ ...p, workExp: val[0] }))}
                          max={50} 
                          step={1} 
                        />
                      </div>
                    </div>

                    <div className="mt-6 flex flex-col justify-start gap-6 border-t border-white/10 pt-6">
                      <BorderBeamButton 
                        onClick={handleEvaluateRetention} 
                        disabled={loading || !gradioClient}
                        className="w-full md:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white transition font-semibold"
                      >
                        {loading ? "Evaluating..." : "Run Risk Analysis"}
                      </BorderBeamButton>

                      {retentionResult && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mt-2">
                          <div className="bg-slate-950/50 border border-white/5 rounded-2xl p-4">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Estimated Churn Prob</span>
                            <span className="text-lg font-mono font-bold text-slate-200 mt-1 block">{retentionResult.prob}</span>
                          </div>
                          
                          <div className="bg-slate-950/50 border border-white/5 rounded-2xl p-4">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Assessment Status</span>
                            <span className="text-sm font-semibold text-indigo-300 mt-1 block">{retentionResult.risk}</span>
                          </div>

                          <div className="bg-slate-950/50 border border-white/5 rounded-2xl p-4">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Stage Equity Valuation</span>
                            <span className="text-lg font-mono font-bold text-indigo-400 mt-1 block">{retentionResult.value}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </MinimalCard>
                </motion.div>
              )}

              {/* View 4: Semantic Talent Search */}
              {currentPage === 'search' && (
                <motion.div
                  key="search"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                  className="w-full text-left"
                >
                  <MinimalCard className="p-6 bg-slate-950/40 border border-white/5 flex flex-col gap-6">
                    <div className="border-b border-white/10 pb-4">
                      <h2 className="text-2xl font-extrabold text-white">Semantic Talent Search</h2>
                      <p className="text-sm text-slate-400 mt-1 font-medium">Locate matches within 48,200 developer profiles using vector embeddings indexing.</p>
                    </div>

                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="searchQuery" className="text-xs font-bold text-slate-400 uppercase tracking-wider">Search Prompt / Requirements</Label>
                        <Input
                          id="searchQuery"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="e.g. backend specialist with python expertise and 10+ years experience"
                          className="w-full bg-slate-900/60 border-white/10 text-white placeholder:text-slate-500 focus:bg-slate-900"
                        />
                      </div>

                      <div className="flex flex-col gap-2">
                        <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Top-K Matches Limit: {searchK} Profiles</Label>
                        <Slider 
                          value={[searchK]} 
                          onValueChange={(val) => setSearchK(val[0])}
                          max={25} 
                          min={1}
                          step={1} 
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-6 border-t border-white/10 pt-6">
                      <BorderBeamButton 
                        onClick={handleSemanticSearch} 
                        disabled={loading || !gradioClient}
                        className="w-full md:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white transition font-semibold"
                      >
                        {loading ? "Searching..." : "Retrieve Matches"}
                      </BorderBeamButton>

                      {searchResultMarkdown && (
                        <div className="w-full mt-2">
                          <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Matching Candidates</h4>
                          {renderMarkdownTable(searchResultMarkdown)}
                        </div>
                      )}
                    </div>
                  </MinimalCard>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </BrowserWindow>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-8 text-center text-xs font-semibold text-slate-500 select-none">
        &copy; 2026 DevIntel Platforms Inc. Pre-trained supervised estimators on Stack Overflow survey telemetry.
      </footer>
    </div>
  );
}
