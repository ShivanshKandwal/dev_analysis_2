import React, { useEffect, useState, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';

interface PlotlyChartProps {
  reportId: string;
  categoryFilter?: 'all' | 'languages' | 'databases' | 'devops';
  clusterFilter?: 'all' | 'devops' | 'web' | 'enterprise';
  searchQuery?: string;
}

export const PlotlyChart: React.FC<PlotlyChartProps> = ({ 
  reportId,
  categoryFilter = 'all',
  clusterFilter = 'all',
  searchQuery = ''
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    // Fetch the JSON representation of the Plotly figure
    const jsonUrl = `./${reportId.replace('.html', '.json')}`;
    
    fetch(jsonUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((plotlyData) => {
        if (!containerRef.current) return;
        
        // Custom dark cybernetic theme layout overlay
        const layout = {
          ...plotlyData.layout,
          paper_bgcolor: 'transparent',
          plot_bgcolor: 'rgba(0, 0, 0, 0.25)',
          font: {
            family: 'Outfit, sans-serif',
            color: '#94a3b8', // slate 400
            size: 11
          },
          title: {
            ...plotlyData.layout?.title,
            font: {
              family: 'Outfit, sans-serif',
              color: '#ffffff', // white
              size: 14,
              weight: 'bold'
            }
          },
          xaxis: {
            ...plotlyData.layout?.xaxis,
            gridcolor: 'rgba(255, 255, 255, 0.05)',
            zerolinecolor: 'rgba(255, 255, 255, 0.1)',
            linecolor: 'rgba(255, 255, 255, 0.1)',
            tickcolor: 'rgba(255, 255, 255, 0.1)',
            font: { color: '#94a3b8' }
          },
          yaxis: {
            ...plotlyData.layout?.yaxis,
            gridcolor: 'rgba(255, 255, 255, 0.05)',
            zerolinecolor: 'rgba(255, 255, 255, 0.1)',
            linecolor: 'rgba(255, 255, 255, 0.1)',
            tickcolor: 'rgba(255, 255, 255, 0.1)',
            font: { color: '#94a3b8' }
          },
          legend: {
            ...plotlyData.layout?.legend,
            font: { color: '#94a3b8' },
            bgcolor: 'transparent'
          },
          margin: { t: 50, r: 30, b: 50, l: 50 }
        };

        // Filter data traces dynamically
        let filteredTraces = [...plotlyData.data];

        // 1. Category Filter (for Talent Forecasting)
        if (reportId === 'interactive_forecasts.html' && categoryFilter !== 'all') {
          const langGroups = ["Python", "JavaScript", "TypeScript", "Rust", "Go", "Java", "C#", "C++", "Kotlin", "Swift"];
          const dbGroups = ["PostgreSQL", "MySQL", "MongoDB", "Redis", "SQLite", "Elasticsearch", "Supabase"];
          const devopsGroups = ["AWS", "Docker", "Kubernetes"];

          filteredTraces = filteredTraces.filter((trace: any) => {
            if (categoryFilter === 'languages') {
              return langGroups.includes(trace.legendgroup);
            } else if (categoryFilter === 'databases') {
              return dbGroups.includes(trace.legendgroup);
            } else if (categoryFilter === 'devops') {
              return devopsGroups.includes(trace.legendgroup);
            }
            return true;
          });
        }

        // 2. Cluster Filter (for Developer Clusters UMAP)
        if (reportId === 'umap_developer_clusters.html' && clusterFilter !== 'all') {
          filteredTraces = filteredTraces.filter((trace: any) => {
            const name = (trace.name || '').toLowerCase();
            if (clusterFilter === 'devops') {
              return name.includes('infrastructure') || name.includes('cloud') || name.includes('devops');
            } else if (clusterFilter === 'web') {
              return name.includes('fullstack') || name.includes('web') || name.includes('frontend') || name.includes('specialists');
            } else if (clusterFilter === 'enterprise') {
              return name.includes('enterprise') || name.includes('pioneers') || name.includes('senior');
            }
            return true;
          });
        }

        // 3. Search Query Filter (for NLP Profile Map / general highlights)
        if (searchQuery.trim() !== '') {
          const query = searchQuery.toLowerCase().trim();
          filteredTraces = filteredTraces.map((trace: any) => {
            const matchesQuery = (trace.name || '').toLowerCase().includes(query) || 
                                 (trace.text || '').toLowerCase().includes(query);
            
            // Highlight matching markers by increasing opacity and size
            if (trace.marker) {
              return {
                ...trace,
                marker: {
                  ...trace.marker,
                  opacity: matchesQuery ? 0.95 : 0.15,
                  size: matchesQuery ? trace.marker.size * 2.5 : trace.marker.size
                }
              };
            }
            return trace;
          });
        }

        // Ensure responsive text sizing
        const data = filteredTraces.map((trace: any) => {
          return {
            ...trace,
            font: { family: 'Outfit, sans-serif' }
          };
        });

        Plotly.newPlot(containerRef.current, data, layout, {
          responsive: true,
          displayModeBar: false,
        });
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load Plotly JSON:", err);
        setError(`Failed to render chart data: ${err.message}`);
        setLoading(false);
      });

    return () => {
      if (containerRef.current) {
        Plotly.purge(containerRef.current);
      }
    };
  }, [reportId, categoryFilter, clusterFilter, searchQuery]);

  return (
    <div className="w-full h-full flex flex-col justify-center items-center min-h-[500px] relative">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm z-10 rounded-2xl">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Loading Chart Telemetry...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-sm z-10 rounded-2xl">
          <div className="max-w-md bg-rose-500/10 border border-rose-500/20 rounded-2xl p-6 text-center">
            <span className="block text-rose-400 font-bold text-sm mb-2">Inference Rendering Error</span>
            <p className="text-xs text-rose-300 font-medium leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      <div ref={containerRef} className="w-full flex-1 min-h-[500px]" />
    </div>
  );
};
