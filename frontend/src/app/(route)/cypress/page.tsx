'use client';

import React, { useEffect, useState, useCallback, useMemo, Suspense } from "react"; // Added Suspense
import { useSearchParams } from "next/navigation";
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
import { TestResultCard } from "./_components/TestResultCard";
import { BuildIntelligencePanel } from "./_components/BuildIntelligencePanel";
import { cn } from "@/lib/utils";

// 1. Move the original logic into a Content component
function AutomationDashboardContent() {
  const searchParams = useSearchParams();
  const urlBuildId = searchParams.get('buildId');
  const urlProjectId = searchParams.get('projectId');

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

  const loadDirectBuild = useCallback(async (buildId: string) => {
    try {
      setLoading(true);
      setLoadingDetails(true);
      const [master, details] = await Promise.all([
        getMasterTestCases(),
        getCypressBuildDetails(Number(buildId))
      ]);
      setMasterCases(master);
      setBuildDetails(details);
      setSelectedBuild(details); 
    } catch (e) { console.error(e); } finally { 
      setLoading(false); 
      setLoadingDetails(false); 
    }
  }, []);

  useEffect(() => {
    if (urlBuildId) {
      loadDirectBuild(urlBuildId);
    } else {
      loadInitialData();
    }
  }, [urlBuildId, loadDirectBuild, loadInitialData]);

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

  const specGroups = useMemo(() => {
    if (!buildDetails?.results) return {};
    return buildDetails.results.reduce((acc: any, res: any) => {
      const filtered = res.tests?.filter((t: any) => (filterStatus === 'all' || t.status === filterStatus) && (!specSearch || res.specFile.toLowerCase().includes(specSearch.toLowerCase())));
      if (filtered?.length > 0) acc[res.specFile] = { id: res.id, tests: filtered, stats: res.stats, env: res.envInfo };
      return acc;
    }, {});
  }, [buildDetails, filterStatus, specSearch]);

  if (loading && !buildDetails) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#09090b]">
      <Loader2 className="w-8 h-8 text-zinc-500 animate-spin" />
      <span className="text-[10px] text-zinc-600 font-mono mt-4 uppercase tracking-[0.3em]">Direct_Build_Link_Auth</span>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#0c0c0e] text-zinc-300 font-sans selection:bg-indigo-500/30 overflow-hidden">
      {!urlBuildId && (
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
      )}

      <main className="flex-1 flex flex-col overflow-hidden bg-[#0c0c0e]">
        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          {!selectedBuild ? (
            <div className="space-y-8 animate-in fade-in duration-700">
              <header className="border-b border-zinc-800 pb-8">
                 <div className="flex items-center gap-2 text-zinc-500 mb-2">
                    <Command size={12} />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Infrastructure / Cypress Console</span>
                 </div>
                 <h1 className="text-3xl font-bold text-white tracking-tight uppercase">Cypress Command Center</h1>
              </header>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard title="Total Builds" value={globalStats?.totalBuilds ?? 0} icon={<Activity size={18} />} color="zinc" />
                <StatCard title="Scenarios" value={globalStats?.totalTestsExecuted ?? 0} icon={<Target size={18} />} color="indigo" />
                <StatCard title="Stability" value={`${globalStats?.lifetimePassRate ?? 0}%`} icon={<Zap size={18} />} color="emerald" />
              </div>
              <div className="bg-[#111114] border border-zinc-800 rounded-sm shadow-sm p-6">
                 <h2 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                   <TrendingUp size={14} className="text-indigo-500" /> Reliability Metrics
                 </h2>
                 <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendData}>
                            <Area type="monotone" dataKey="passed" stroke="#6366f1" fill="#6366f120" />
                            <CartesianGrid stroke="#ffffff05" vertical={false} />
                            <XAxis dataKey="name" hide />
                            <Tooltip contentStyle={{ background: '#000', border: '1px solid #333' }} />
                        </AreaChart>
                    </ResponsiveContainer>
                 </div>
              </div>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in duration-500">
              <DashboardHeader selectedBuild={buildDetails || selectedBuild} masterCases={masterCases} filterStatus={filterStatus} setFilterStatus={setFilterStatus} specSearch={specSearch} setSpecSearch={setSpecSearch} />
              {!loadingDetails && buildDetails && <BuildIntelligencePanel buildId={selectedBuild?.id} buildData={buildDetails} />}
              {loadingDetails ? (
                <div className="h-96 flex flex-col items-center justify-center gap-4 text-zinc-600">
                  <Loader2 className="animate-spin w-6 h-6" />
                  <span className="text-[9px] font-mono uppercase tracking-widest italic">Extracting_Artifacts_From_TIDB</span>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(specGroups).map(([name, group]: [string, any]) => (
                    <div key={name} className="bg-[#111114] border border-zinc-800 rounded-none overflow-hidden flex flex-col shadow-xl">
                      <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                           <div className="p-2 border border-zinc-800"><FileText size={14} className="text-zinc-500" /></div>
                           <h3 className="text-xs font-bold text-zinc-100 font-mono uppercase">{name.split('/').pop()}</h3>
                        </div>
                        <div className="flex items-center gap-4">
                           <div className="w-32 h-1 bg-zinc-800 rounded-none overflow-hidden flex">
                              <div className="h-full bg-emerald-500" style={{ width: `${(group.stats.passed/group.tests.length)*100}%` }} />
                              <div className="h-full bg-rose-500" style={{ width: `${(group.stats.failed/group.tests.length)*100}%` }} />
                           </div>
                           <span className="text-[10px] font-mono text-zinc-400">{group.stats.passed}/{group.tests.length} PASS</span>
                        </div>
                      </div>
                      <div className="divide-y divide-zinc-800/30">
                        {group.tests.map((t: any, idx: number) => (
                          <TestResultCard key={`${name}-${idx}`} test={t} isExpanded={expandedTests.includes(`${name}-${idx}`)} onToggle={() => toggleTest(`${name}-${idx}`, group.id, t.title)} />
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

// 2. Export the main component wrapped in Suspense
export default function AutomationDashboard() {
  return (
    <Suspense fallback={
        <div className="h-screen flex flex-col items-center justify-center bg-[#09090b]">
            <Loader2 className="w-8 h-8 text-zinc-500 animate-spin" />
        </div>
    }>
      <AutomationDashboardContent />
    </Suspense>
  );
}

function StatCard({ title, value, icon, color }: any) {
  const accentColors: any = { indigo: 'border-t-indigo-500', emerald: 'border-t-emerald-500', zinc: 'border-t-zinc-700' };
  return (
    <div className={cn("bg-[#111114] border border-zinc-800 border-t-2 rounded-none p-8 flex flex-col justify-between min-h-[160px]", accentColors[color])}>
      <div className="text-zinc-500">{icon}</div>
      <div>
        <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">{title}</h3>
        <div className="text-5xl font-bold text-white tracking-tighter font-mono">{value ?? '0'}</div>
      </div>
    </div>
  );
}