'use client';

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  getBuildHistory, getCypressBuildDetails, getMasterTestCases,
  getCypressTestSteps, getCypressGlobalStats, getCypressTrend
} from "@/lib/actions";
import {
  Loader2, Zap, Target, CheckCircle2, XCircle, FileText,
  Activity, ListFilter, LayoutDashboard, TrendingUp, Monitor, Clock, 
  ChevronRight, ArrowUpRight, ArrowDownRight, Server, Command, Box, Calendar
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import { StatusBadge } from "./_components/StatusBadge";
import { DashboardHeader } from "./_components/DashboardHeader";
import { MetricCard } from "./_components/MetricCard";
import { TestResultCard } from "./_components/TestResultCard";
import { cn } from "@/lib/utils";

export default function AutomationDashboard() {
  const [builds, setBuilds] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [globalStats, setGlobalStats] = useState<any>(null);
  const [masterCases, setMasterCases] = useState<any[]>([]);
  const [selectedBuild, setSelectedBuild] = useState<any>(null);
  const [buildDetails, setBuildDetails] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [expandedTests, setExpandedTests] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'passed' | 'failed' | 'running'>('all');
  const [specSearch, setSpecSearch] = useState('');

  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const [history, master, stats, trend] = await Promise.all([
        getBuildHistory(), getMasterTestCases(), getCypressGlobalStats(), getCypressTrend()
      ]);
      setBuilds(history.filter((b: any) => b.type?.toLowerCase() === 'cypress'));
      setMasterCases(master);
      setGlobalStats(stats);
      setTrendData(trend);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  const handleBuildSelect = async (build: any) => {
    setSelectedBuild(build);
    setLoadingDetails(true);
    setExpandedTests([]);
    const details = await getCypressBuildDetails(build.id);
    setBuildDetails(details);
    setLoadingDetails(false);
  };

  const toggleTest = async (uiId: string, specId: number, title: string) => {
    const isOpening = !expandedTests.includes(uiId);
    setExpandedTests(prev => isOpening ? [...prev, uiId] : prev.filter(x => x !== uiId));
    if (isOpening) {
      const data = await getCypressTestSteps(specId, title);
      if (data) setBuildDetails((prev: any) => {
        const results = prev.results.map((s: any) => s.id === specId ? { ...s, tests: s.tests.map((t: any) => t.title === title ? { ...t, ...data } : t) } : s);
        return { ...prev, results };
      });
    }
  };

  useEffect(() => { loadInitialData(); }, [loadInitialData]);

  const specGroups = useMemo(() => {
    if (!buildDetails?.results) return {};
    return buildDetails.results.reduce((acc: any, res: any) => {
      const filtered = res.tests?.filter((t: any) => (filterStatus === 'all' || t.status === filterStatus) && (!specSearch || res.specFile.toLowerCase().includes(specSearch.toLowerCase())));
      if (filtered?.length > 0) acc[res.specFile] = { id: res.id, tests: filtered, stats: res.stats, env: res.envInfo };
      return acc;
    }, {});
  }, [buildDetails, filterStatus, specSearch]);

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#09090b]">
      <Loader2 className="w-8 h-8 text-zinc-500 animate-spin" />
    </div>
  );

  return (
    <div className="flex h-screen bg-[#0c0c0e] text-zinc-300 font-sans selection:bg-indigo-500/30 overflow-hidden">
      <aside className="w-80 border-r border-zinc-800 bg-[#0b0b0d] flex flex-col shrink-0">
        <div className="p-5 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <Server size={14} className="text-zinc-500" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">Registry / CY_ARCHIVE</span>
           </div>
           <button 
            onClick={() => { setSelectedBuild(null); setBuildDetails(null); }} 
            className="p-1.5 hover:bg-white/5 rounded-sm transition-colors text-zinc-500"
          >
            <LayoutDashboard size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
          {builds.map(b => (
            <button key={b.id} onClick={() => handleBuildSelect(b)} className={cn("w-full text-left p-4 rounded-sm transition-all border group relative", selectedBuild?.id === b.id ? "bg-zinc-900 border-zinc-700 shadow-inner" : "bg-transparent border-transparent hover:bg-white/[0.02]")}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-mono font-bold text-zinc-200 uppercase">Build_Ref_{b.id}</span>
                <StatusBadge status={b.status} />
              </div>
              <div className="flex items-center gap-3 text-[9px] text-zinc-600 font-bold uppercase"><Calendar size={10}/> {new Date(b.createdAt).toLocaleDateString()} <span className="opacity-30">•</span> {b.environment}</div>
            </button>
          ))}
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden bg-[#0c0c0e]">
        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          
          {!selectedBuild ? (
            /* --- SCENARIO A: AWS COMMAND CENTER OVERVIEW --- */
            <div className="space-y-8 animate-in fade-in duration-700">
              <header className="border-b border-zinc-800 pb-8">
                 <div className="flex items-center gap-2 text-zinc-500 mb-2">
                    <Command size={12} />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Infrastructure / Cypress Console</span>
                 </div>
                 <h1 className="text-3xl font-bold text-white tracking-tight uppercase">Cypress Command Center</h1>
                 <p className="text-zinc-500 text-sm mt-1">Cross-build regression analysis and quality intelligence pipeline.</p>
              </header>

              {/* Stat Cards - Square/AWS Style */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard title="Total Build Objects" value={globalStats?.totalBuilds ?? 0} sub="Historical Registry" icon={<Activity size={18} />} color="zinc" />
                <StatCard title="Executed Scenarios" value={globalStats?.totalTestsExecuted ?? 0} sub="All Environments" icon={<Target size={18} />} color="indigo" />
                <StatCard title="Pipeline Stability" value={`${globalStats?.lifetimePassRate ?? 0}%`} sub="Global Pass Rate" icon={<Zap size={18} />} color="emerald" />
              </div>

              {/* Execution Trend Panel */}
              <div className="bg-[#111114] border border-zinc-800 rounded-sm shadow-sm flex flex-col">
                <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/50 flex items-center gap-3">
                  <TrendingUp size={14} className="text-emerald-500" />
                  <h2 className="text-[10px] font-black text-zinc-100 uppercase tracking-widest">Efficiency Metrics (Last 10 Runs)</h2>
                </div>
                <div className="h-[300px] w-full p-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData}>
                      <defs><linearGradient id="colorP" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} /><stop offset="95%" stopColor="#6366f1" stopOpacity={0} /></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#52525b', fontSize: 10, fontWeight: 700 }} dy={10} />
                      <YAxis hide />
                      <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '4px' }} itemStyle={{ color: '#fff', fontSize: '11px', fontWeight: 'bold' }} />
                      <Area type="monotone" dataKey="passed" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorP)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : (
            /* --- SCENARIO B: BUILD DETAIL PANEL --- */
            <div className="space-y-8 animate-in fade-in duration-500">
              <DashboardHeader 
                selectedBuild={buildDetails || selectedBuild} 
                masterCases={masterCases} 
                filterStatus={filterStatus} setFilterStatus={setFilterStatus} 
                specSearch={specSearch} setSpecSearch={setSpecSearch} 
              />

              {loadingDetails ? (
                <div className="h-96 flex flex-col items-center justify-center gap-4">
                  <Loader2 className="animate-spin text-zinc-500 w-6 h-6" />
                  <span className="text-zinc-600 text-[9px] font-mono uppercase tracking-widest">GET_SPEC_DATA_FROM_TIDB</span>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(specGroups).map(([name, group]: [string, any]) => (
                    <div key={name} className="bg-[#111114] border border-zinc-800 rounded-sm shadow-sm overflow-hidden flex flex-col">
                      {/* Spec Panel Header */}
                      <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                           <div className="p-2 bg-white/5 rounded-sm border border-zinc-800"><FileText size={14} className="text-zinc-400" /></div>
                           <div>
                              <h3 className="text-xs font-bold text-zinc-100 font-mono tracking-tight uppercase">{name.split('/').pop()}</h3>
                              <div className="flex gap-4 mt-1">
                                 <span className="text-[9px] text-zinc-500 uppercase font-bold flex items-center gap-1"><Monitor size={10}/> {group.env.browser}</span>
                                 <span className="text-[9px] text-zinc-500 uppercase font-bold flex items-center gap-1"><Clock size={10}/> {group.stats.duration}</span>
                              </div>
                           </div>
                        </div>
                        {/* Spec Progress Bar */}
                        <div className="flex items-center gap-4">
                           <div className="w-32 h-1 bg-zinc-800 rounded-none overflow-hidden flex">
                              <div className="h-full bg-emerald-500" style={{ width: `${(group.stats.passed/group.tests.length)*100}%` }} />
                              <div className="h-full bg-rose-500" style={{ width: `${(group.stats.failed/group.tests.length)*100}%` }} />
                           </div>
                           <span className="text-[10px] font-mono text-zinc-400">{group.stats.passed}/{group.tests.length} PASS</span>
                        </div>
                      </div>

                      {/* Nested Tests */}
                      <div className="divide-y divide-zinc-800/50">
                        {group.tests.map((t: any, idx: number) => (
                          <TestResultCard 
                            key={idx} 
                            test={t} 
                            isExpanded={expandedTests.includes(`${name}-${idx}`)} 
                            onToggle={() => toggleTest(`${name}-${idx}`, group.id, t.title)} 
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// --- Square AWS-Like Stat Component ---
function StatCard({ title, value, sub, icon, color }: any) {
  const accentColors: any = { indigo: 'border-t-indigo-500', emerald: 'border-t-emerald-500', zinc: 'border-t-zinc-500' };
  return (
    <div className={cn("bg-[#111114] border border-zinc-800 border-t-2 rounded-sm p-6 shadow-sm group", accentColors[color])}>
      <div className="flex justify-between items-center mb-4 text-zinc-500 group-hover:text-zinc-300 transition-colors">
        {icon}
      </div>
      <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">{title}</h3>
      <div className="text-4xl font-bold text-white tracking-tighter font-mono">{value ?? '0'}</div>
      <p className="text-[9px] text-zinc-600 font-bold mt-2 uppercase italic tracking-tighter">{sub}</p>
    </div>
  );
}