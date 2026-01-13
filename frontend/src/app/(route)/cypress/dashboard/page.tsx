'use client';

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { getBuildHistory, getMasterTestCases } from "@/lib/actions";
import { createClient } from "@supabase/supabase-js";
import { 
  Loader2, Zap, Book, CheckCircle2, XCircle, Activity, Target, 
  TrendingUp, PieChart as PieChartIcon, FileCode, Search, Hash,
  LineChart as LineChartIcon
} from "lucide-react";
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  AreaChart, Area
} from 'recharts';

import { StatusBadge } from "./_components/StatusBadge";
import { SpecFileCard } from "./_components/SpecFileCard";
import { DashboardHeader } from "./_components/DashboardHeader";
import { CoverageGap } from "./_components/CoverageGap";
import { cn } from "@/lib/utils";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AutomationDashboard() {
  const [builds, setBuilds] = useState<any[]>([]);
  const [masterCases, setMasterCases] = useState<any[]>([]);
  const [selectedBuild, setSelectedBuild] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedTests, setExpandedTests] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'passed' | 'failed' | 'running'>('all');
  const [projectSearch, setProjectSearch] = useState('');
  const [specSearch, setSpecSearch] = useState('');

  const loadData = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const [history, master] = await Promise.all([getBuildHistory(), getMasterTestCases()]);
      setBuilds(history);
      setMasterCases(master);

      const onlyCypress = history.filter((b: any) => b.type === 'cypress');
      if (onlyCypress.length > 0) {
        setSelectedBuild((current: any) => {
          const found = onlyCypress.find((b: any) => b.id === (current?.id || onlyCypress[0].id));
          return found || onlyCypress[0];
        });
      }
    } catch (e) { console.error(e); } finally { if (isInitial) setLoading(false); }
  }, []);

  useEffect(() => {
    loadData(true);
    const interval = setInterval(() => { if (!document.hidden) loadData(false); }, 3000);
    const channel = supabase.channel('db-changes').on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'test_results'
    }, () => loadData(false)).subscribe();
    return () => { clearInterval(interval); supabase.removeChannel(channel); };
  }, [loadData]);

  const masterMap = useMemo(() => masterCases.reduce((acc, tc) => ({ ...acc, [tc.caseCode]: tc }), {}), [masterCases]);

  /* -------------------- 🔥 AGGREGATE LOGIC & CHART DATA -------------------- */

  // 1. Current Build Stats
  const buildMetrics = useMemo(() => {
    if (!selectedBuild || masterCases.length === 0) return null;
    const automatedCodes = new Set<string>();
    let passed = 0, failed = 0, running = 0;

    selectedBuild.results?.forEach((spec: any) => {
      spec.tests.forEach((test: any) => {
        const codes = test.case_codes || (test.case_code ? [test.case_code] : []);
        codes.forEach((c: string) => { if(c !== 'N/A') automatedCodes.add(c); });
        if (test.status === 'running') running++;
        else if (test.status === 'passed') passed++;
        else failed++;
      });
    });

    return {
      totalMaster: masterCases.length,
      automatedCount: automatedCodes.size,
      manualCount: masterCases.length - automatedCodes.size,
      coveragePercent: Math.round((automatedCodes.size / (masterCases.length || 1)) * 100),
      passed, failed, running
    };
  }, [selectedBuild, masterCases]);

  // 2. Global Build Trend (Last 10)
  const buildTrendData = useMemo(() => {
    return builds
      .filter(b => b.type === 'cypress')
      .slice(0, 10)
      .reverse()
      .map((b: any) => {
        let p = 0, t = 0;
        b.results?.forEach((s: any) => s.tests.forEach((test: any) => { 
          t++; if (test.status === 'passed' || test.status === 'success') p++; 
        }));
        return { name: `#${b.id}`, passed: p, total: t };
      });
  }, [builds]);

  // 3. 🔥 SPEC RELIABILITY LINE DATA (Last 10 Builds)
  const specLineTrendData = useMemo(() => {
    const last10Cypress = builds.filter(b => b.type === 'cypress').slice(0, 10).reverse();
    
    return last10Cypress.map((build) => {
        const dataPoint: any = { name: `#${build.id}` };
        build.results?.forEach((spec: any) => {
            const fileName = spec.specFile.split(/[\\/]/).pop();
            let p = 0, t = 0;
            spec.tests.forEach((test: any) => {
                t++;
                if (test.status === 'passed' || test.status === 'success') p++;
            });
            dataPoint[fileName] = t > 0 ? Math.round((p / t) * 100) : 0;
        });
        return dataPoint;
    });
  }, [builds]);

  // Extract unique spec names for dynamic Line generation
  const specFileNames = useMemo(() => {
    const names = new Set<string>();
    specLineTrendData.forEach(point => {
        Object.keys(point).forEach(key => { if(key !== 'name') names.add(key); });
    });
    return Array.from(names);
  }, [specLineTrendData]);

  const pieData = useMemo(() => {
    if (!buildMetrics) return [];
    return [
      { name: 'PASSED', value: buildMetrics.passed, color: '#10b981' },
      { name: 'FAILED', value: buildMetrics.failed, color: '#ef4444' },
      { name: 'RUNNING', value: buildMetrics.running, color: '#6366f1' },
    ].filter(d => d.value > 0);
  }, [buildMetrics]);

  /* -------------------- UI MAPPING -------------------- */

  const specGroups = useMemo(() => {
    return selectedBuild?.results?.reduce((acc: any, result: any) => {
      const fileName = result.specFile;
      if (specSearch && !fileName.toLowerCase().includes(specSearch.toLowerCase())) return acc;
      const filteredTests = result.tests.filter((test: any) => {
        const matchesStatus = filterStatus === 'all' || test.status === filterStatus;
        const matchesProject = projectSearch === '' || test.project?.toLowerCase().includes(projectSearch.toLowerCase());
        return matchesStatus && matchesProject;
      });
      if (filteredTests.length > 0) {
        if (!acc[fileName]) acc[fileName] = { specFile: fileName, tests: [], video: null };
        if (!acc[fileName].video) acc[fileName].video = filteredTests.find((t: any) => t.video_url)?.video_url;
        acc[fileName].tests.push(...filteredTests.map((t: any) => ({ ...t, specId: result.id, specFile: fileName })));
      }
      return acc;
    }, {});
  }, [selectedBuild, filterStatus, projectSearch, specSearch]);

  const toggleTest = (id: string) => setExpandedTests(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#09090b]"><Loader2 className="animate-spin text-indigo-500 w-8 h-8" /></div>;

  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-300 font-sans selection:bg-indigo-500/30">
      <aside className="w-80 border-r border-white/5 overflow-y-auto bg-[#0b0b0d] shrink-0">
        <div className="p-6 border-b border-white/5 font-black text-[10px] uppercase tracking-[0.2em] text-zinc-500 flex justify-between items-center">
          <span>Cypress History</span>
          <span className="bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded text-[8px] border border-indigo-500/20">LIVE</span>
        </div>
        {builds.filter(b => b.type === 'cypress').map(b => (
          <button key={b.id} onClick={() => setSelectedBuild(b)} className={cn("w-full text-left p-5 border-b border-white/5 transition-all", selectedBuild?.id === b.id ? 'bg-indigo-600/10 border-r-2 border-r-indigo-500' : 'hover:bg-white/5')}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-black text-white uppercase tracking-tighter">Build #{b.id}</span>
              <StatusBadge status={b.status} />
            </div>
            <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-tight">{new Date(b.createdAt).toLocaleDateString()}</p>
          </button>
        ))}
      </aside>

      <main className="flex-1 overflow-y-auto p-10 space-y-12 bg-[#09090b]">
        <DashboardHeader 
          selectedBuild={selectedBuild} masterCases={masterCases} 
          filterStatus={filterStatus} setFilterStatus={setFilterStatus} 
          projectSearch={projectSearch} setProjectSearch={setProjectSearch}
          specSearch={specSearch} setSpecSearch={setSpecSearch}
        />

        {buildMetrics && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard title="Automation Coverage" value={`${buildMetrics.coveragePercent}%`} sub={`${buildMetrics.automatedCount} Automated TCs`} icon={<Target className="text-indigo-500" />} />
              <MetricCard title="Execution Passed" value={buildMetrics.passed} sub={`${buildMetrics.failed} Failed Scenarios`} icon={<CheckCircle2 className="text-green-500" />} trend={buildMetrics.running > 0 ? "Live" : undefined} />
              <MetricCard title="Manual Requirements" value={buildMetrics.manualCount} sub="Pending Automation" icon={<Book className="text-orange-500" />} />
              <MetricCard title="Success Rate" value={`${Math.round((buildMetrics.passed / (buildMetrics.passed + buildMetrics.failed || 1)) * 100)}%`} sub="Current Stability" icon={<Zap className="text-yellow-500" />} />
            </div>

            <div className="space-y-8">
                {/* Build Performance Area Chart */}
                <div className="bg-[#0c0c0e] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/10 rounded-lg"><LineChartIcon className="w-4 h-4 text-indigo-500" /></div>
                        <h2 className="text-sm font-black text-white uppercase tracking-widest">Global Build Trend</h2>
                    </div>
                    <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={buildTrendData}>
                                <defs><linearGradient id="gradTrend" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient></defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#52525b', fontSize: 10}} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#52525b', fontSize: 10}} />
                                <Tooltip contentStyle={{backgroundColor: '#111', border: '1px solid #333', borderRadius: '12px', fontSize: '10px'}} />
                                <Area type="monotone" dataKey="passed" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#gradTrend)" />
                                <Area type="monotone" dataKey="total" stroke="#3f3f46" strokeWidth={1} fill="transparent" strokeDasharray="4 4" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* 🔥 SPEC RELIABILITY LINE GRAPH */}
                    <div className="xl:col-span-2 bg-[#0c0c0e] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-500/10 rounded-lg"><TrendingUp className="w-4 h-4 text-indigo-500" /></div>
                            <div>
                                <h2 className="text-sm font-black text-white uppercase tracking-widest leading-none">Spec Stability Trend</h2>
                                <span className="text-[9px] text-zinc-500 font-bold uppercase mt-1 block">Success % per file over last 10 builds</span>
                            </div>
                        </div>
                        <div className="h-[280px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={specLineTrendData} margin={{ left: -20, right: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#52525b', fontSize: 10}} dy={10} />
                                    <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{fill: '#52525b', fontSize: 10}} tickFormatter={(v)=>`${v}%`} />
                                    <Tooltip content={<CustomLineTooltip />} />
                                    {specFileNames.map((name, i) => (
                                        <Area key={name} type="monotone" dataKey={name} stroke={i % 2 === 0 ? '#6366f1' : '#a855f7'} strokeWidth={2} fill="transparent" connectNulls />
                                    ))}
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Donut Chart */}
                    <div className="bg-[#0c0c0e] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl flex flex-col items-center">
                        <div className="w-full flex items-center gap-2 mb-6">
                            <PieChartIcon className="w-4 h-4 text-indigo-500" />
                            <h2 className="text-sm font-black text-white uppercase tracking-widest leading-none">Build Status</h2>
                        </div>
                        <div className="flex-1 w-full min-h-[250px] relative">
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8 text-center">
                                <span className="text-3xl font-black text-white leading-none block">{buildMetrics.passed + buildMetrics.failed + buildMetrics.running}</span>
                                <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Total Tests</span>
                            </div>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={8} dataKey="value" stroke="none">
                                        {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                    </Pie>
                                    <Legend verticalAlign="bottom" align="center" iconType="circle" formatter={(v) => <span className="text-white text-[10px] font-black uppercase ml-1">{v}</span>} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
          </>
        )}
        
        <div className="space-y-16">
          {Object.entries(specGroups || {}).sort().map(([name, data]: [string, any]) => (
            <SpecFileCard key={name} projectName={name} data={data} masterMap={masterMap} expandedTests={expandedTests} toggleTest={toggleTest} />
          ))}
        </div>

        <CoverageGap selectedBuild={selectedBuild} masterCases={masterCases} filterStatus={filterStatus} />
      </main>
    </div>
  );
}

function CustomLineTooltip({ active, payload, label }: any) {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#111] border border-white/10 p-4 rounded-2xl shadow-2xl max-w-[280px]">
          <p className="text-[10px] font-black text-zinc-500 uppercase mb-3 border-b border-white/5 pb-2">Build {label}</p>
          <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
            {payload.map((entry: any) => (
              <div key={entry.dataKey} className="flex justify-between items-center gap-6">
                <span className="text-[10px] font-bold text-zinc-300 truncate">{entry.dataKey}</span>
                <span className="text-[10px] font-black" style={{ color: entry.stroke }}>{entry.value}%</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
}

function MetricCard({ title, value, sub, icon, trend }: any) {
    return (
        <div className="bg-[#0c0c0e] border border-white/5 p-6 rounded-[2.5rem] shadow-xl hover:border-white/10 transition-all group">
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-white/5 rounded-2xl border border-white/5">{icon}</div>
                {trend === "Live" && <div className="bg-indigo-500/10 text-indigo-500 text-[8px] font-black rounded-full animate-pulse border border-indigo-500/20 px-2 py-1 uppercase font-mono tracking-widest">Live Sync</div>}
            </div>
            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{title}</h3>
            <div className="text-3xl font-black text-white tracking-tighter mt-1 tabular-nums">{value}</div>
            <p className="text-[10px] text-zinc-600 font-bold mt-1 uppercase tracking-tight">{sub}</p>
        </div>
    );
}