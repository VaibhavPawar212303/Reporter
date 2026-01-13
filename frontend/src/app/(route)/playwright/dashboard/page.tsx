'use client';

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { getBuildHistory, getMasterTestCases } from "@/lib/actions";
import { createClient } from "@supabase/supabase-js";
import { 
  Loader2, Activity, Search, Cpu, Shield, Zap, Globe, 
  TrendingUp, CheckCircle2, XCircle, ArrowUpRight, ArrowDownRight,
  PieChart as PieChartIcon
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, Legend 
} from 'recharts';

import { StatusBadge } from "./_components/StatusBadge";
import { FilterButton } from "./_components/FilterButton";
import { ProjectLevelStats } from "./_components/ProjectLevelStats";
import { TestRow } from "./_components/TestRow";
import { cn } from "@/lib/utils";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/* -------------------- NORMALIZER -------------------- */
function normalizePlaywrightResults(results: any[]) {
  const map = new Map<string, any>();
  results?.forEach((spec: any) => {
    const specId = spec.id || spec.specFile.replace(/[^a-z0-9]/gi, '');
    spec.tests.forEach((test: any) => {
      const key = `${test.project}-${spec.specFile}-${test.title}`;
      if (!map.has(key)) {
        map.set(key, { ...test, specFile: spec.specFile, specId: specId, attempts: [test] });
      } else {
        map.get(key).attempts.push(test);
      }
    });
  });

  return Array.from(map.values()).map(testGroup => {
    testGroup.attempts.sort((a: any, b: any) => a.run_number - b.run_number);
    const latest = testGroup.attempts[testGroup.attempts.length - 1];
    const hasPassed = testGroup.attempts.some((a: any) => a.status === 'passed' || a.status === 'expected');
    const wasFailed = testGroup.attempts.some((a: any) => a.status === 'failed');

    let finalStatus = 'failed';
    if (latest.status === 'running') finalStatus = 'running';
    else if (hasPassed) finalStatus = 'passed';

    return {
      ...latest,
      status: finalStatus, 
      attempts: testGroup.attempts,
      specId: testGroup.specId,
      specFile: testGroup.specFile,
      isFlaky: hasPassed && wasFailed && latest.status !== 'running',
    };
  });
}

export default function PlaywrightDashboard() {
  const [builds, setBuilds] = useState<any[]>([]);
  const [masterCases, setMasterCases] = useState<any[]>([]);
  const [selectedBuild, setSelectedBuild] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedTests, setExpandedTests] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'passed' | 'failed' | 'running'>('all');
  const [projectSearch, setProjectSearch] = useState('');

  const loadData = useCallback(async (initial = false) => {
    try {
      if (initial) setLoading(true);
      const [history, master] = await Promise.all([getBuildHistory(), getMasterTestCases()]);
      setBuilds(history);
      setMasterCases(master);
      const pwBuilds = history.filter((b: any) => b.type === 'playwright');
      if (pwBuilds.length) {
        //@ts-ignore
        setSelectedBuild(prev => pwBuilds.find((b: any) => b.id === prev?.id) || pwBuilds[0]);
      }
    } catch (e) { console.error(e); } finally { if (initial) setLoading(false); }
  }, []);

  useEffect(() => {
    loadData(true);
    const interval = setInterval(() => { if (!document.hidden) loadData(); }, 3000);
    const channel = supabase.channel('db-changes').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'test_results' }, () => loadData()).subscribe();
    return () => { clearInterval(interval); supabase.removeChannel(channel); };
  }, [loadData]);

  const masterMap = useMemo(() => masterCases.reduce((acc: any, tc) => ({ ...acc, [tc.caseCode]: tc }), {}), [masterCases]);

  const normalizedTests = useMemo(() => {
    if (!selectedBuild?.results) return [];
    return normalizePlaywrightResults(selectedBuild.results);
  }, [selectedBuild]);

  const currentStats = useMemo(() => {
    const s = { total: 0, passed: 0, failed: 0, running: 0 };
    normalizedTests.forEach((t: any) => {
      s.total++;
      if (t.status === 'running') s.running++;
      else if (t.status === 'passed') s.passed++;
      else s.failed++;
    });
    return s;
  }, [normalizedTests]);

  /* -------------------- 🔥 IMPROVEMENT LOGIC -------------------- */
  const analysis = useMemo(() => {
    const pwBuilds = builds.filter(b => b.type === 'playwright');
    const last10 = pwBuilds.slice(1, 11); // Exclude current, take next 10
    
    let histPassed = 0;
    let histTotal = 0;

    last10.forEach(b => {
      b.results?.forEach((s: any) => s.tests.forEach((t: any) => {
        histTotal++;
        if (t.status === 'passed' || t.status === 'expected') histPassed++;
      }));
    });

    const historicalRate = histTotal > 0 ? (histPassed / histTotal) * 100 : 0;
    const currentRate = currentStats.total > 0 ? (currentStats.passed / currentStats.total) * 100 : 0;
    const diff = currentRate - historicalRate;

    return {
      historicalRate: Math.round(historicalRate),
      currentRate: Math.round(currentRate),
      diff: parseFloat(diff.toFixed(1)),
      isImprovement: diff >= 0
    };
  }, [builds, currentStats]);

  const trendData = useMemo(() => {
    return builds.filter(b => b.type === 'playwright').slice(0, 10).reverse().map((b: any) => {
      let p = 0, t = 0;
      b.results?.forEach((s: any) => s.tests.forEach((test: any) => { t++; if (test.status === 'passed' || test.status === 'expected') p++; }));
      return { name: `#${b.id}`, passed: p, total: t };
    });
  }, [builds]);

  const pieData = useMemo(() => [
    { name: 'FAILED', value: currentStats.failed, color: '#ef4444' },
    { name: 'PASSED', value: currentStats.passed, color: '#10b981' },
    { name: 'RUNNING', value: currentStats.running, color: '#6366f1' },
  ].filter(d => d.value > 0), [currentStats]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#09090b]"><Loader2 className="animate-spin text-indigo-500 w-10 h-10" /></div>;

  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-300 font-sans selection:bg-emerald-500/30">
      <aside className="w-80 border-r border-white/5 bg-[#0b0b0d] overflow-y-auto shrink-0">
        <div className="p-6 border-b border-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 font-mono">History</div>
        {builds.filter(b => b.type === 'playwright').map(b => (
          <button key={b.id} onClick={() => setSelectedBuild(b)} className={cn("w-full text-left p-5 border-b border-white/5 transition-all", selectedBuild?.id === b.id ? "bg-emerald-600/10 border-r-2 border-r-emerald-500" : "hover:bg-white/5")}>
            <div className="flex justify-between items-center mb-1">
              <span className="font-black text-white text-sm">BUILD #{b.id}</span>
              <StatusBadge status={b.status} />
            </div>
            <p className="text-[10px] text-zinc-500 font-mono uppercase">{new Date(b.createdAt).toLocaleDateString()}</p>
          </button>
        ))}
      </aside>

      <main className="flex-1 overflow-y-auto p-10 space-y-12 bg-[#09090b]">
        <header className="flex flex-col gap-10">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
                <h1 className="text-4xl font-black text-white tracking-tighter uppercase">Command Center</h1>
                <div className="flex items-center gap-3">
                   <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold", analysis.isImprovement ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500")}>
                        {analysis.isImprovement ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {Math.abs(analysis.diff)}% {analysis.isImprovement ? 'Improvement' : 'Regression'}
                   </div>
                   <span className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest">vs historical baseline ({analysis.historicalRate}%)</span>
                </div>
            </div>
          </div>

          {/* Stats Grid with dynamic comparison badges */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Total Scenarios" value={currentStats.total} sub="Current Build" icon={<Shield className="text-emerald-500" />} />
            <StatCard title="Passed" value={currentStats.passed} sub="Successful" icon={<CheckCircle2 className="text-emerald-400" />} />
            <StatCard title="Active Workers" value={currentStats.running} sub="Live" icon={<Activity className="text-indigo-500" />} pulse={currentStats.running > 0} />
            <StatCard 
                title="Health Score" 
                value={`${analysis.currentRate}%`} 
                sub="Build Stability" 
                icon={<Zap className="text-orange-500" />} 
                trend={analysis.diff} 
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2 bg-[#0c0c0e] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl space-y-6">
              <h2 className="text-sm font-black text-white uppercase mb-6 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-500"/> Execution Trend</h2>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#52525b', fontSize: 10}} dy={10} />
                    <Tooltip contentStyle={{backgroundColor: '#0c0c0e', border: '1px solid #ffffff10', borderRadius: '1rem', color: '#fff'}} />
                    <Area type="monotone" dataKey="passed" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#grad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-[#0c0c0e] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl flex flex-col items-center">
              <div className="w-full flex items-center gap-2 mb-6">
                <PieChartIcon className="w-4 h-4 text-indigo-500" />
                <h2 className="text-sm font-black text-white uppercase tracking-widest">Build Distribution</h2>
              </div>
              <div className="flex-1 w-full min-h-[250px] relative">
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                    <span className="text-3xl font-black text-white">{currentStats.total}</span>
                    <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Tests</span>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={8} dataKey="value" stroke="none">
                      {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Legend verticalAlign="bottom" align="center" iconType="circle" iconSize={8} formatter={(value) => <span className="text-white text-[10px] font-black tracking-widest ml-1">{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="flex items-center gap-2 bg-[#111113] border border-white/5 p-2 rounded-2xl overflow-x-auto scrollbar-hide">
              <FilterButton active={filterStatus === 'all'} label="All" count={currentStats.total} onClick={() => setFilterStatus('all')} color="zinc" />
              <FilterButton active={filterStatus === 'passed'} label="Passed" count={currentStats.passed} onClick={() => setFilterStatus('passed')} color="green" />
              <FilterButton active={filterStatus === 'failed'} label="Failed" count={currentStats.failed} onClick={() => setFilterStatus('failed')} color="red" />
              <FilterButton active={filterStatus === 'running'} label="Running" count={currentStats.running} onClick={() => setFilterStatus('running')} color="indigo" />
            </div>
            <div className="flex items-center gap-3 px-4 bg-[#111113] border border-white/5 rounded-2xl shadow-inner">
              <Search className="w-4 h-4 text-zinc-600" />
              <input value={projectSearch} onChange={e => setProjectSearch(e.target.value)} placeholder="Filter project..." className="bg-transparent border-none focus:ring-0 text-sm py-3 w-full text-zinc-300 outline-none" />
            </div>
          </div>
        </header>

        <div className="space-y-16 pb-20">
          {Object.entries(normalizePlaywrightResults(selectedBuild?.results || []).reduce((acc: any, test: any) => {
            const project = test.project || 'Default';
            if ((filterStatus === 'all' || test.status === filterStatus) && project.toLowerCase().includes(projectSearch.toLowerCase())) {
              if (!acc[project]) acc[project] = [];
              acc[project].push(test);
            }
            return acc;
          }, {})).map(([project, tests]: any) => (
            <div key={project} className="bg-[#0c0c0e] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
              <div className="px-8 py-6 border-b border-white/5 flex justify-between bg-white/[0.01]">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20"><Cpu className="w-6 h-6 text-emerald-500" /></div>
                  <span className="text-xl font-black text-white tracking-tight uppercase">{project}</span>
                </div>
                <ProjectLevelStats tests={tests} />
              </div>
              <div className="divide-y divide-white/5">
                {tests.map((test: any) => {
                  const uniqueId = `${test.specId}-${project}-${test.title.replace(/\s+/g, '_')}`;
                  return (
                    <TestRow 
                      key={uniqueId} test={test} masterMap={masterMap}
                      isExpanded={expandedTests.includes(uniqueId)} 
                      onToggle={() => setExpandedTests(prev => prev.includes(uniqueId) ? prev.filter(id => id !== uniqueId) : [...prev, uniqueId])}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value, sub, icon, pulse, trend }: any) {
    return (
      <div className="bg-[#0c0c0e] border border-white/5 p-8 rounded-[2rem] shadow-xl hover:border-emerald-500/20 transition-all group relative overflow-hidden">
        <div className="flex justify-between items-start mb-6 relative z-10">
          <div className="p-3 bg-white/5 rounded-2xl group-hover:scale-110 transition-transform border border-white/5">{icon}</div>
          {pulse && <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping" />}
          {trend !== undefined && (
             <div className={cn("px-2 py-1 rounded-lg text-[9px] font-black flex items-center gap-1", trend >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500")}>
                {trend >= 0 ? "+" : ""}{trend}%
             </div>
          )}
        </div>
        <div className="relative z-10">
          <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">{title}</h3>
          <div className="text-4xl font-black text-white tracking-tighter mt-1 tabular-nums">{value}</div>
          <p className="text-[10px] text-zinc-600 font-bold mt-2 uppercase tracking-tight">{sub}</p>
        </div>
      </div>
    );
}