import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Client } from '@gradio/client';
import { 
  DollarSign, 
  UserCheck, 
  Search, 
  Activity, 
  ChevronRight, 
  TrendingUp, 
  HelpCircle,
  Briefcase,
  Award,
  Users
} from 'lucide-react';

// Cult UI & Shadcn Components
import { CanvasFractalGrid } from './components/ui/canvas-fractal-grid';
import { DirectionAwareTabs } from './components/ui/direction-aware-tabs';
import { MinimalCard, MinimalCardTitle, MinimalCardDescription } from './components/ui/minimal-card';
import { BorderBeamButton } from './components/ui/border-beam-button';
import { GlassCard } from './components/ui/GlassCard';
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

// Option lists matching Gradio drop-down categories
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
  const [activeTab, setActiveTab] = useState<'salary' | 'retention' | 'search'>('salary');
  
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
      try {
        const client = await Client.connect("ShivanshKandwal/devintel-hub");
        setGradioClient(client);
      } catch (err: any) {
        console.error("Failed to connect to Gradio API:", err);
        setErrorMsg("Model server is offline. Try reloading.");
      }
    }
    initClient();
  }, []);

  // Submit handlers calling API
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

  // Convert Markdown table simple parser for search results
  const renderMarkdownTable = (md: string) => {
    if (!md) return null;
    
    // Quick regex parser to turn markdown tables to clean styled items
    const rows = md.split('\n').filter(r => r.includes('|') && !r.includes('---'));
    if (rows.length <= 1) return <p className="text-slate-500 font-medium">{md}</p>;
    
    const headers = rows[0].split('|').map(h => h.trim()).filter(Boolean);
    const dataRows = rows.slice(1).map(row => row.split('|').map(c => c.trim()).filter(Boolean));

    return (
      <div className="overflow-x-auto w-full rounded-2xl border border-black/5 bg-white/20 backdrop-blur-md">
        <table className="min-w-full divide-y divide-slate-200/50 text-left text-sm text-slate-700">
          <thead className="bg-slate-100/60 font-semibold text-slate-800">
            <tr>
              {headers.map((h, i) => (
                <th key={i} className="px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/40">
            {dataRows.map((row, idx) => (
              <tr key={idx} className="hover:bg-white/20 transition-colors">
                {row.map((cell, i) => (
                  <td key={i} className="px-4 py-3 font-medium">
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

  const tabs = [
    { id: 'salary', label: 'Salary Estimator', icon: DollarSign },
    { id: 'retention', label: 'Retention & Career Value', icon: UserCheck },
    { id: 'search', label: 'Talent Vector Search', icon: Search }
  ];

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden bg-grid-lines">
      {/* Background Interactive canvas */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
        <CanvasFractalGrid />
      </div>

      {/* Hero section */}
      <header className="relative z-10 max-w-7xl mx-auto w-full px-6 pt-12 text-center select-none">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-xs font-semibold text-indigo-600 mb-6"
        >
          <Activity className="w-3.5 h-3.5 animate-pulse" />
          DevIntel Predictive Analytics Suite
        </motion.div>
        
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-800"
        >
          Developer Intelligence <span className="text-indigo-600">Platform</span>
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-base md:text-lg text-slate-500 max-w-2xl mx-auto mt-4 font-medium"
        >
          Standardized ML pipeline evaluating compensation ranges, organizational retention probabilities, and matching vector embeddings.
        </motion.p>
      </header>

      {/* Main Panels layout */}
      <main className="relative z-10 max-w-7xl mx-auto w-full px-6 py-10 flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Forms section */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Tab buttons using Cult UI DirectionAwareTabs */}
          <div className="flex justify-center md:justify-start">
            <DirectionAwareTabs
              tabs={tabs}
              onChange={(tabId) => setActiveTab(tabId as any)}
              className="bg-white/40 border border-white/80 p-1.5 rounded-full shadow-sm"
            />
          </div>

          <div className="w-full">
            <AnimatePresence mode="wait">
              {/* Tab 1: Salary market estimator */}
              {activeTab === 'salary' && (
                <motion.div
                  key="salary"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.3 }}
                >
                  <GlassCard className="p-8 flex flex-col gap-6">
                    <div className="text-left border-b border-black/5 pb-4">
                      <h3 className="text-lg font-bold text-slate-800">Developer Compensation Predictor</h3>
                      <p className="text-sm text-slate-500 mt-1 font-medium">Predict market rate salaries based on regional demographics, tech roles, and background.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                      {/* Country */}
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="country" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Demographic Country</Label>
                        <Select
                          value={salaryForm.country}
                          onValueChange={(val) => setSalaryForm(p => ({ ...p, country: val }))}
                        >
                          <SelectTrigger id="country">
                            <SelectValue placeholder="Select location" />
                          </SelectTrigger>
                          <SelectContent>
                            {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Education */}
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="edLevel" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Educational Level</Label>
                        <Select
                          value={salaryForm.edLevel}
                          onValueChange={(val) => setSalaryForm(p => ({ ...p, edLevel: val }))}
                        >
                          <SelectTrigger id="edLevel">
                            <SelectValue placeholder="Select degree" />
                          </SelectTrigger>
                          <SelectContent>
                            {edLevels.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Organization Size */}
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="orgSize" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Company Workforce Size</Label>
                        <Select
                          value={salaryForm.orgSize}
                          onValueChange={(val) => setSalaryForm(p => ({ ...p, orgSize: val }))}
                        >
                          <SelectTrigger id="orgSize">
                            <SelectValue placeholder="Select size" />
                          </SelectTrigger>
                          <SelectContent>
                            {orgSizes.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Developer Subtype */}
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="devType" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Developer Subtype / Role</Label>
                        <Select
                          value={salaryForm.devType}
                          onValueChange={(val) => setSalaryForm(p => ({ ...p, devType: val }))}
                        >
                          <SelectTrigger id="devType">
                            <SelectValue placeholder="Select subtype" />
                          </SelectTrigger>
                          <SelectContent>
                            {devTypes.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Remote Work Mode */}
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="remoteWork" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Work Modality</Label>
                        <Select
                          value={salaryForm.remoteWork}
                          onValueChange={(val) => setSalaryForm(p => ({ ...p, remoteWork: val }))}
                        >
                          <SelectTrigger id="remoteWork">
                            <SelectValue placeholder="Select work-mode" />
                          </SelectTrigger>
                          <SelectContent>
                            {remoteWorkOptions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Years Code Slider */}
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Experience: {salaryForm.yearsCode} Years</Label>
                        </div>
                        <Slider 
                          value={[salaryForm.yearsCode]} 
                          onValueChange={(val) => setSalaryForm(p => ({ ...p, yearsCode: val[0] }))}
                          max={50} 
                          step={1} 
                        />
                      </div>

                      {/* Years Pro Code Slider */}
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Professional Experience: {salaryForm.yearsCodePro} Years</Label>
                        </div>
                        <Slider 
                          value={[salaryForm.yearsCodePro]} 
                          onValueChange={(val) => setSalaryForm(p => ({ ...p, yearsCodePro: val[0] }))}
                          max={50} 
                          step={1} 
                        />
                      </div>

                      {/* Work Exp Slider */}
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Work Experience: {salaryForm.workExp} Years</Label>
                        </div>
                        <Slider 
                          value={[salaryForm.workExp]} 
                          onValueChange={(val) => setSalaryForm(p => ({ ...p, workExp: val[0] }))}
                          max={50} 
                          step={1} 
                        />
                      </div>

                      {/* Job Satisfaction */}
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Job Satisfaction Score: {salaryForm.jobSat}/5</Label>
                        </div>
                        <Slider 
                          value={[salaryForm.jobSat]} 
                          onValueChange={(val) => setSalaryForm(p => ({ ...p, jobSat: val[0] }))}
                          max={5} 
                          min={1}
                          step={1} 
                        />
                      </div>
                    </div>

                    <div className="mt-6 flex flex-col md:flex-row justify-between items-center gap-6 border-t border-black/5 pt-6">
                      <BorderBeamButton 
                        onClick={handleEstimateSalary} 
                        disabled={loading || !gradioClient}
                        className="w-full md:w-auto px-8 py-3 bg-indigo-600 text-white hover:bg-indigo-700 transition"
                      >
                        {loading ? "Calculating..." : "Compute Predicted Salary"}
                      </BorderBeamButton>

                      {predictedSalary && (
                        <div className="w-full md:w-auto bg-emerald-50 border border-emerald-100 rounded-2xl px-6 py-3 text-left">
                          <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Market Estimate (Annual)</span>
                          <h4 className="text-xl font-mono font-bold text-emerald-700 mt-0.5">{predictedSalary}</h4>
                        </div>
                      )}
                    </div>
                  </GlassCard>
                </motion.div>
              )}

              {/* Tab 2: Retention Risk Analysis */}
              {activeTab === 'retention' && (
                <motion.div
                  key="retention"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.3 }}
                >
                  <GlassCard className="p-8 flex flex-col gap-6">
                    <div className="text-left border-b border-black/5 pb-4">
                      <h3 className="text-lg font-bold text-slate-800">Retention Risk &amp; Career Valuator</h3>
                      <p className="text-sm text-slate-500 mt-1 font-medium">Evaluate probability of developer attrition risks alongside career-stage equity value predictions.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                      {/* Developer Subtype */}
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="ret-devType" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Developer Primary Role</Label>
                        <Select
                          value={retentionForm.devType}
                          onValueChange={(val) => setRetentionForm(p => ({ ...p, devType: val }))}
                        >
                          <SelectTrigger id="ret-devType">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            {devTypes.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Org Type (Enterprise vs Startup) */}
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="isEnterprise" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Organization Tier Type</Label>
                        <Select
                          value={retentionForm.isEnterprise}
                          onValueChange={(val) => setRetentionForm(p => ({ ...p, isEnterprise: val }))}
                        >
                          <SelectTrigger id="isEnterprise">
                            <SelectValue placeholder="Select org type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Startup / Mid-Size Organization">Startup / Mid-Size (Under 1,000 employees)</SelectItem>
                            <SelectItem value="Enterprise Organization (1,000+ employees)">Enterprise Scale (1,000+ employees)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Years Code Slider */}
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Coding Years: {retentionForm.yearsCode} Years</Label>
                        </div>
                        <Slider 
                          value={[retentionForm.yearsCode]} 
                          onValueChange={(val) => setRetentionForm(p => ({ ...p, yearsCode: val[0] }))}
                          max={50} 
                          step={1} 
                        />
                      </div>

                      {/* Years Pro Code Slider */}
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Professional Coding Years: {retentionForm.yearsCodePro} Years</Label>
                        </div>
                        <Slider 
                          value={[retentionForm.yearsCodePro]} 
                          onValueChange={(val) => setRetentionForm(p => ({ ...p, yearsCodePro: val[0] }))}
                          max={50} 
                          step={1} 
                        />
                      </div>

                      {/* Work Exp Slider */}
                      <div className="flex flex-col gap-2 md:col-span-2">
                        <div className="flex justify-between items-center">
                          <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Aggregate Work Experience: {retentionForm.workExp} Years</Label>
                        </div>
                        <Slider 
                          value={[retentionForm.workExp]} 
                          onValueChange={(val) => setRetentionForm(p => ({ ...p, workExp: val[0] }))}
                          max={50} 
                          step={1} 
                        />
                      </div>
                    </div>

                    <div className="mt-6 flex flex-col justify-start gap-6 border-t border-black/5 pt-6 text-left">
                      <BorderBeamButton 
                        onClick={handleEvaluateRetention} 
                        disabled={loading || !gradioClient}
                        className="w-full md:w-auto px-8 py-3 bg-indigo-600 text-white hover:bg-indigo-700 transition"
                      >
                        {loading ? "Evaluating..." : "Run Risk Valuation Engine"}
                      </BorderBeamButton>

                      {retentionResult && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mt-2">
                          <div className="bg-white/40 border border-black/5 rounded-2xl p-4">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Estimated Churn Prob</span>
                            <span className="text-lg font-mono font-bold text-slate-800 mt-1 block">{retentionResult.prob}</span>
                          </div>
                          
                          <div className="bg-white/40 border border-black/5 rounded-2xl p-4">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Risk Assessment Status</span>
                            <span className="text-sm font-semibold text-slate-700 mt-1 block">{retentionResult.risk}</span>
                          </div>

                          <div className="bg-white/40 border border-black/5 rounded-2xl p-4">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Profile Career Value</span>
                            <span className="text-lg font-mono font-bold text-indigo-600 mt-1 block">{retentionResult.value}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </GlassCard>
                </motion.div>
              )}

              {/* Tab 3: Semantic searching */}
              {activeTab === 'search' && (
                <motion.div
                  key="search"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.3 }}
                >
                  <GlassCard className="p-8 flex flex-col gap-6">
                    <div className="text-left border-b border-black/5 pb-4">
                      <h3 className="text-lg font-bold text-slate-800">Recruiter Semantic Profile Search</h3>
                      <p className="text-sm text-slate-500 mt-1 font-medium">Discover talent matches by describing candidate expectations in natural language queries.</p>
                    </div>

                    <div className="flex flex-col gap-4 text-left">
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="searchQuery" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Semantic Prompt / Search Criteria</Label>
                        <Input
                          id="searchQuery"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="e.g. backend specialist with python expertise and 10+ years experience"
                          className="w-full bg-white/40 border border-black/10 text-slate-800 placeholder:text-slate-400 focus:bg-white"
                        />
                      </div>

                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Retrieve Matches Cap: {searchK} Profiles</Label>
                        </div>
                        <Slider 
                          value={[searchK]} 
                          onValueChange={(val) => setSearchK(val[0])}
                          max={25} 
                          min={1}
                          step={1} 
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-6 border-t border-black/5 pt-6 text-left">
                      <BorderBeamButton 
                        onClick={handleSemanticSearch} 
                        disabled={loading || !gradioClient}
                        className="w-full md:w-auto px-8 py-3 bg-indigo-600 text-white hover:bg-indigo-700 transition"
                      >
                        {loading ? "Searching..." : "Retrieve Matching Candidates"}
                      </BorderBeamButton>

                      {searchResultMarkdown && (
                        <div className="w-full mt-2">
                          <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Top Discovered Talent Profiles</h4>
                          {renderMarkdownTable(searchResultMarkdown)}
                        </div>
                      )}
                    </div>
                  </GlassCard>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Stats & Telemetry side bar */}
        <div className="flex flex-col gap-6">
          {/* Status info box */}
          <MinimalCard className="p-6 bg-white/50 border border-white text-left">
            <MinimalCardTitle className="flex items-center gap-2 text-slate-800 text-sm font-bold">
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${gradioClient ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
              Model Server Status
            </MinimalCardTitle>
            <MinimalCardDescription className="text-xs text-slate-500 font-medium mt-1">
              {gradioClient ? "Successfully connected to Hugging Face Space model registry." : "Connecting to Model Server..."}
            </MinimalCardDescription>
            {errorMsg && (
              <p className="text-xs text-rose-500 font-semibold mt-2">{errorMsg}</p>
            )}
          </MinimalCard>

          {/* Telemetry Dashboard component */}
          <TelemetryDashboard />
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-8 text-center text-xs font-semibold text-slate-400 select-none">
        &copy; 2026 DevIntel Platforms Inc. All modeling states based on merged multi-year Stack Overflow surveys.
      </footer>
    </div>
  );
}
