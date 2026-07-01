import React, { useState, useEffect } from 'react';
import { Cpu, Thermometer, Database, Activity } from 'lucide-react';
import { MinimalCard, MinimalCardTitle, MinimalCardDescription } from './ui/minimal-card';
import { 
  TerminalAnimationRoot, 
  TerminalAnimationWindow, 
  TerminalAnimationContent, 
  TerminalAnimationCommandBar, 
  TerminalAnimationOutput, 
  TerminalAnimationTabList, 
  TerminalAnimationTabTrigger 
} from './ui/terminal-animation';

export const TelemetryDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState({
    gpuLoad: 88,
    vram: 11.2,
    temp: 74,
    speed: 342
  });

  useEffect(() => {
    const metricsInterval = setInterval(() => {
      setMetrics(prev => {
        const deltaLoad = (Math.random() - 0.5) * 4;
        const newLoad = Math.min(Math.max(prev.gpuLoad + deltaLoad, 80), 98);
        
        const deltaVram = (Math.random() - 0.5) * 0.2;
        const newVram = Math.min(Math.max(prev.vram + deltaVram, 10.8), 12.0);

        const deltaTemp = (Math.random() - 0.5) * 2;
        const newTemp = Math.min(Math.max(prev.temp + deltaTemp, 70), 79);

        const deltaSpeed = (Math.random() - 0.5) * 15;
        const newSpeed = Math.min(Math.max(prev.speed + deltaSpeed, 320), 365);

        return {
          gpuLoad: parseFloat(newLoad.toFixed(1)),
          vram: parseFloat(newVram.toFixed(2)),
          temp: Math.round(newTemp),
          speed: Math.round(newSpeed)
        };
      });
    }, 1500);

    return () => clearInterval(metricsInterval);
  }, []);

  const terminalTabs = [
    {
      label: "inference",
      command: "python app.py --mode=eval",
      lines: [
        { text: "[INFO] Model inference server connection initialized.", color: "text-[#b39aff]", delay: 100 },
        { text: "[INFO] Handshake verified with client on WebSocket :7860", color: "text-neutral-400", delay: 300 },
        { text: "[OK] Core predictor pipelines actively listening.", color: "text-emerald-400", delay: 200 },
        { text: "[QUERY] Computed XGBoost salary evaluation (120ms)", color: "text-neutral-400", delay: 150 },
        { text: "[QUERY] Computed Churn classification probability (95ms)", color: "text-neutral-400", delay: 150 }
      ]
    },
    {
      label: "models",
      command: "xgb-inspect --weights",
      lines: [
        { text: "Loading XGBoost weights from /models/...", color: "text-[#b39aff]", delay: 200 },
        { text: "  -> Churn Classifier loaded (AUC = 0.9531)", color: "text-[#32f3e9]", delay: 100 },
        { text: "  -> Salary Regressor loaded (R2 = 0.6199)", color: "text-[#32f3e9]", delay: 100 },
        { text: "  -> Career Stage Evaluator loaded (R2 = 0.7678)", color: "text-[#32f3e9]", delay: 100 },
        { text: "[OK] Weights verification complete. Ready.", color: "text-emerald-400", delay: 200 }
      ]
    },
    {
      label: "faiss",
      command: "faiss-search --query 'Backend' --k 5",
      lines: [
        { text: "Encoding semantic description via SentenceTransformer...", color: "text-[#b39aff]", delay: 250 },
        { text: "  -> Vector projection dimensions: 384", color: "text-neutral-500", delay: 100 },
        { text: "Querying FAISS database indices (48,200 records)...", color: "text-[#b39aff]", delay: 200 },
        { text: "  -> Match ID: 4125 (Cosine Similarity: 0.892)", color: "text-emerald-400", delay: 80 },
        { text: "  -> Match ID: 8122 (Cosine Similarity: 0.865)", color: "text-emerald-400", delay: 80 },
        { text: "  -> Match ID: 1982 (Cosine Similarity: 0.841)", color: "text-emerald-400", delay: 80 }
      ]
    }
  ];

  return (
    <MinimalCard className="p-6 bg-slate-950/40 border border-white/5 flex flex-col justify-between w-full h-[460px] text-left">
      <div>
        <MinimalCardTitle className="flex items-center gap-1.5 text-slate-300 text-sm font-bold uppercase tracking-wider">
          <Activity className="w-4.5 h-4.5 text-rose-500 animate-pulse" />
          Server Resource &amp; Inference Telemetry (GPU_0)
        </MinimalCardTitle>
        <MinimalCardDescription className="text-xs text-slate-500 mt-1 font-medium">
          Simulated hardware utilization variables and console query metrics.
        </MinimalCardDescription>
      </div>

      {/* Grid of stats */}
      <div className="grid grid-cols-2 gap-3 mb-4 select-none">
        
        {/* GPU Load */}
        <div className="bg-slate-900/40 rounded-2xl border border-white/5 p-3 flex flex-col items-center justify-center">
          <Cpu className="w-5 h-5 text-indigo-400 mb-1" />
          <span className="text-xs text-slate-400 font-semibold">Server Load</span>
          <span className="text-base font-bold text-slate-200 font-mono">{metrics.gpuLoad}%</span>
        </div>

        {/* VRAM */}
        <div className="bg-slate-900/40 rounded-2xl border border-white/5 p-3 flex flex-col items-center justify-center">
          <Database className="w-5 h-5 text-purple-400 mb-1" />
          <span className="text-xs text-slate-400 font-semibold">VRAM Alloc</span>
          <span className="text-base font-bold text-slate-200 font-mono">{metrics.vram} GB</span>
        </div>

      </div>

      {/* Composable TerminalAnimation */}
      <TerminalAnimationRoot tabs={terminalTabs} defaultActiveTab={0} className="w-full flex-1 flex flex-col justify-between">
        <TerminalAnimationWindow minHeight="12rem" className="flex-1 flex flex-col justify-between bg-slate-950/80 border border-white/5 rounded-2xl">
          <TerminalAnimationTabList>
            {terminalTabs.map((t, idx) => (
              <TerminalAnimationTabTrigger key={t.label} index={idx}>
                {t.label}
              </TerminalAnimationTabTrigger>
            ))}
          </TerminalAnimationTabList>
          
          <TerminalAnimationContent className="flex-1 p-3">
            <TerminalAnimationCommandBar />
            <TerminalAnimationOutput />
          </TerminalAnimationContent>
        </TerminalAnimationWindow>
      </TerminalAnimationRoot>
    </MinimalCard>
  );
};
