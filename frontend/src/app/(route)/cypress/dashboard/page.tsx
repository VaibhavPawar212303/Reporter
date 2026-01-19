'use client';

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  getBuildHistory, getCypressBuildDetails, getMasterTestCases,
  getCypressTestSteps, getCypressGlobalStats, getCypressTrend
} from "@/lib/actions";
import {
  Loader2, Zap, Target, CheckCircle2, XCircle, FileText,
  Activity, ListFilter, LayoutDashboard, TrendingUp, Monitor, Clock
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

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#09090b]"><Loader2 className="animate-spin text-indigo-500 w-10 h-10" /></div>;

  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-300 overflow-hidden">
      <aside className="w-72 border-r border-white/5 flex flex-col bg-[#0b0b0d] shrink-0">
        <div className="p-6 border-b border-white/5 flex justify-between items-center">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Cypress Runs</span>
          <button onClick={() => setSelectedBuild(null)} className="hover:text-indigo-400 transition-colors"><LayoutDashboard size={14} /></button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {builds.map(b => (
            <button key={b.id} onClick={() => handleBuildSelect(b)} className={cn("w-full text-left p-6 border-b border-white/5 transition-all relative group", selectedBuild?.id === b.id ? 'bg-indigo-600/10' : 'hover:bg-white/5')}>
              {selectedBuild?.id === b.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />}
              <div className="flex justify-between items-center mb-1"><span className="text-sm font-black text-white">Build #{b.id}</span><StatusBadge status={b.status} /></div>
              <p className="text-[10px] text-zinc-600 font-mono uppercase">{new Date(b.createdAt).toLocaleDateString()}</p>
            </button>
          ))}
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden bg-[#09090b]">
        <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar">
          {!selectedBuild ? (
            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4">
              <div className="space-y-2"><h1 className="text-5xl font-black text-white tracking-tighter uppercase italic">Cypress Intelligence</h1><p className="text-zinc-500 text-sm font-medium uppercase">TiDB Serverless Analytics Engine</p></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard title="Total Builds" value={globalStats?.totalBuilds} sub="Run History" icon={<Activity className="text-indigo-500" />} />
                <MetricCard title="Tests Executed" value={globalStats?.totalTestsExecuted} sub="Lifetime" icon={<Target className="text-emerald-500" />} />
                <MetricCard
                  title="Pass Rate"
                  value={`${globalStats?.lifetimePassRate ?? 0}%`}
                  sub="Overall Stability"
                  icon={<Zap className="text-yellow-500" />}
                />
              </div>
              <div className="bg-[#0b0b0d] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl">
                <div className="flex items-center gap-3 mb-8"><TrendingUp className="text-indigo-500" size={20} /><h2 className="text-sm font-black text-white uppercase tracking-widest">Execution Trend</h2></div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer><AreaChart data={trendData}><defs><linearGradient id="colorP" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} /><stop offset="95%" stopColor="#6366f1" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" /><XAxis dataKey="name" tick={{ fill: '#52525b', fontSize: 10 }} dy={10} /><Tooltip contentStyle={{ backgroundColor: '#0b0b0d', border: '1px solid #ffffff10', borderRadius: '1rem' }} /><Area type="monotone" dataKey="passed" stroke="#6366f1" strokeWidth={4} fill="url(#colorP)" /></AreaChart></ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-12 animate-in fade-in duration-500">
              <DashboardHeader selectedBuild={buildDetails || selectedBuild} masterCases={masterCases} filterStatus={filterStatus} setFilterStatus={setFilterStatus} specSearch={specSearch} setSpecSearch={setSpecSearch} />
              {loadingDetails ? (
                <div className="h-64 flex flex-col items-center justify-center gap-4"><Loader2 className="animate-spin text-indigo-500 w-6 h-6" /><span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Aggregating TiDB Results...</span></div>
              ) : (
                <div className="space-y-20">
                  {Object.entries(specGroups).map(([name, group]: [string, any]) => (
                    <div key={name} className="space-y-6">
                      <div className="flex items-center justify-between bg-white/[0.02] p-4 rounded-3xl border border-white/5">
                        <div className="flex items-center gap-4"><div className="p-2 bg-indigo-500/10 rounded-xl"><FileText size={16} className="text-indigo-500" /></div><div><h3 className="text-xs font-black text-white uppercase tracking-widest">{name}</h3><div className="flex gap-4 mt-1"><div className="flex items-center gap-1.5 text-zinc-500 text-[9px] font-bold uppercase"><Monitor size={10} />{group.env.browser}</div><div className="flex items-center gap-1.5 text-zinc-500 text-[9px] font-bold uppercase"><Clock size={10} />{group.stats.duration}</div></div></div></div>
                        <div className="flex gap-2"><span className="text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">{group.stats.passed} PASSED</span><span className="text-[9px] font-black text-rose-500 bg-rose-500/10 px-2 py-1 rounded-lg border border-rose-500/20">{group.stats.failed} FAILED</span></div>
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        {group.tests.map((t: any, idx: number) => (
                          <TestResultCard key={idx} test={t} isExpanded={expandedTests.includes(`${name}-${idx}`)} onToggle={() => toggleTest(`${name}-${idx}`, group.id, t.title)} />
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