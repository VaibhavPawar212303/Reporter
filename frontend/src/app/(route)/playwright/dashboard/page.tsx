'use client';

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { getBuildHistory, getMasterTestCases, getBuildDetails, getPlaywrightTrend } from "@/lib/actions";
import { 
  Loader2, Activity, Search, Cpu, Shield, Zap, 
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

/* -------------------- NORMALIZER -------------------- */
function normalizePlaywrightResults(specResults: any[]) {
  const map = new Map<string, any>();
  specResults?.forEach((spec: any) => {
    const specId = spec.id;
    spec.tests?.forEach((test: any) => {
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
  const [trendData, setTrendData] = useState<any[]>([]);
  const [masterCases, setMasterCases] = useState<any[]>([]);
  const [selectedBuildId, setSelectedBuildId] = useState<number | null>(null);
  const [buildDetails, setBuildDetails] = useState<any>(null);
  
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [expandedTests, setExpandedTests] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'passed' | 'failed' | 'running'>('all');
  const [projectSearch, setProjectSearch] = useState('');

  // 1. Initial Load: History, Master List, and Aggregated Trend
  const loadData = useCallback(async (initial = false) => {
    try {
      if (initial) setLoading(true);
      const [history, master, trend] = await Promise.all([
        getBuildHistory(), 
        getMasterTestCases(),
        getPlaywrightTrend()
      ]);
      
      const pwBuilds = history.filter((b: any) => b.type === 'playwright');
      setBuilds(pwBuilds);
      setMasterCases(master);
      setTrendData(trend);

      if (pwBuilds.length && !selectedBuildId) {
        setSelectedBuildId(pwBuilds[0].id);
      }
    } catch (e) { console.error(e); } finally { if (initial) setLoading(false); }
  }, [selectedBuildId]);

  // 2. Fetch Build Results from TiDB when selection changes
  useEffect(() => {
    if (!selectedBuildId) return;
    const fetchDetails = async () => {
      setLoadingDetails(true);
      const details = await getBuildDetails(selectedBuildId);
      setBuildDetails(details);
      setLoadingDetails(false);
    };
    fetchDetails();
  }, [selectedBuildId]);

  // 3. TiDB Polling
  useEffect(() => {
    loadData(true);
    const interval = setInterval(() => { if (!document.hidden) loadData(); }, 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  const masterMap = useMemo(() => masterCases.reduce((acc: any, tc) => ({ ...acc, [tc.caseCode]: tc }), {}), [masterCases]);

  const normalizedTests = useMemo(() => {
    if (!buildDetails?.results) return [];
    return normalizePlaywrightResults(buildDetails.results);
  }, [buildDetails]);

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

  const analysis = useMemo(() => {
    if (trendData.length < 2) return { historicalRate: 0, currentRate: 0, diff: 0, isImprovement: true };
    const historicalBuilds = trendData.slice(0, -1);
    let hPassed = 0, hTotal = 0;
    historicalBuilds.forEach(b => { hPassed += b.passed; hTotal += b.total; });
    const historicalRate = hTotal > 0 ? (hPassed / hTotal) * 100 : 0;
    const currentRate = currentStats.total > 0 ? (currentStats.passed / currentStats.total) * 100 : 0;
    const diff = currentRate - historicalRate;
    return { historicalRate: Math.round(historicalRate), currentRate: Math.round(currentRate), diff: parseFloat(diff.toFixed(1)), isImprovement: diff >= 0 };
  }, [trendData, currentStats]);

  const pieData = useMemo(() => [
    { name: 'FAILED', value: currentStats.failed, color: '#ef4444' },
    { name: 'PASSED', value: currentStats.passed, color: '#10b981' },
    { name: 'RUNNING', value: currentStats.running, color: '#6366f1' },
  ].filter(d => d.value > 0), [currentStats]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#09090b]"><Loader2 className="animate-spin text-indigo-500 w-10 h-10" /></div>;

  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-300 font-sans selection:bg-emerald-500/30">
      {/* Sidebar */}
      <aside className="w-80 border-r border-white/5 bg-[#0b0b0d] overflow-y-auto shrink-0">
        <div className="p-6 border-b border-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Build History</div>
        {builds.map(b => (
          <button key={b.id} onClick={() => setSelectedBuildId(b.id)} className={cn("w-full text-left p-5 border-b border-white/5 transition-all", selectedBuildId === b.id ? "bg-emerald-600/10 border-r-2 border-r-emerald-500" : "hover:bg-white/5")}>
            <div className="flex justify-between items-center mb-1">
              <span className="font-black text-white text-sm">BUILD #{b.id}</span>
              <StatusBadge status={b.status} />
            </div>
            <p className="text-[10px] text-zinc-500 uppercase">{new Date(b.createdAt).toLocaleDateString()}</p>
          </button>
        ))}
      </aside>

      {/* Main View */}
      <main className="flex-1 overflow-y-auto p-10 space-y-12 bg-[#09090b] custom-scrollbar">
        <header className="flex flex-col gap-10">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
                <h1 className="text-4xl font-black text-white tracking-tighter uppercase">Command Center</h1>
                <div className="flex items-center gap-3">
                   <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold", analysis.isImprovement ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500")}>
                        {analysis.isImprovement ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {Math.abs(analysis.diff)}% {analysis.isImprovement ? 'Improvement' : 'Regression'}
                   </div>
                   <span className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest">baseline ({analysis.historicalRate}%)</span>
                </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Total Scenarios" value={currentStats.total} sub={`Build #${selectedBuildId}`} icon={<Shield className="text-emerald-500" />} />
            <StatCard title="Passed" value={currentStats.passed} sub="Successful" icon={<CheckCircle2 className="text-emerald-400" />} />
            <StatCard title="Active Workers" value={currentStats.running} sub="Live" icon={<Activity className="text-indigo-500" />} pulse={currentStats.running > 0} />
            <StatCard title="Health Score" value={`${analysis.currentRate}%`} sub="Stability" icon={<Zap className="text-orange-500" />} trend={analysis.diff} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Trend Chart */}
            <div className="xl:col-span-2 bg-[#0c0c0e] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl">
              <h2 className="text-sm font-black text-white uppercase mb-6 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-500"/> Execution Trend</h2>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#52525b', fontSize: 10}} dy={10} />
                    <Tooltip contentStyle={{backgroundColor: '#0c0c0e', border: '1px solid #ffffff10', borderRadius: '1rem'}} />
                    <Area type="monotone" dataKey="passed" stroke="#10b981" strokeWidth={3} fill="url(#grad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pie Chart */}
            <div className="bg-[#0c0c0e] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl flex flex-col items-center">
              <div className="w-full flex items-center gap-2 mb-6"><PieChartIcon className="w-4 h-4 text-indigo-500" /><h2 className="text-sm font-black text-white uppercase tracking-widest">Distribution</h2></div>
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
                    <Legend verticalAlign="bottom" iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="flex items-center gap-2 bg-[#111113] border border-white/5 p-2 rounded-2xl overflow-x-auto scrollbar-hide">
              <FilterButton active={filterStatus === 'all'} label="All" count={currentStats.total} onClick={() => setFilterStatus('all')} color="zinc" />
              <FilterButton active={filterStatus === 'passed'} label="Passed" count={currentStats.passed} onClick={() => setFilterStatus('passed')} color="green" />
              <FilterButton active={filterStatus === 'failed'} label="Failed" count={currentStats.failed} onClick={() => setFilterStatus('failed')} color="red" />
              <FilterButton active={filterStatus === 'running'} label="Running" count={currentStats.running} onClick={() => setFilterStatus('running')} color="indigo" />
            </div>
            <div className="flex items-center gap-3 px-4 bg-[#111113] border border-white/5 rounded-2xl shadow-inner">
              <Search className="w-4 h-4 text-zinc-600" />
              <input value={projectSearch} onChange={e => setProjectSearch(e.target.value)} placeholder="Filter browser project..." className="bg-transparent border-none outline-none text-sm py-3 w-full" />
            </div>
          </div>
        </header>

        {/* Results List */}
        {loadingDetails ? (
           <div className="h-64 flex flex-col items-center justify-center gap-4"><Loader2 className="animate-spin text-emerald-500 w-6 h-6" /><span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Loading results...</span></div>
        ) : (
          <div className="space-y-16 pb-20">
            {Object.entries(normalizedTests.reduce((acc: any, test: any) => {
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
                  {tests.map((test: any) => (
                    <TestRow 
                      key={`${test.specId}-${test.title}`} test={test} masterMap={masterMap}
                      isExpanded={expandedTests.includes(`${test.specId}-${test.title}`)} 
                      onToggle={() => setExpandedTests(prev => prev.includes(`${test.specId}-${test.title}`) ? prev.filter(id => id !== `${test.specId}-${test.title}`) : [...prev, `${test.specId}-${test.title}`])}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ title, value, sub, icon, pulse, trend }: any) {
    return (
      <div className="bg-[#0c0c0e] border border-white/5 p-8 rounded-[2rem] shadow-xl hover:border-emerald-500/20 transition-all group relative overflow-hidden">
        <div className="flex justify-between items-start mb-6">
          <div className="p-3 bg-white/5 rounded-2xl group-hover:scale-110 transition-transform">{icon}</div>
          {pulse && <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping" />}
          {trend !== undefined && (
             <div className={cn("px-2 py-1 rounded-lg text-[9px] font-black", trend >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500")}>
                {trend >= 0 ? "+" : ""}{trend}%
             </div>
          )}
        </div>
        <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">{title}</h3>
        <div className="text-4xl font-black text-white tracking-tighter mt-1 tabular-nums">{value}</div>
        <p className="text-[10px] text-zinc-600 font-bold mt-2 uppercase">{sub}</p>
      </div>
    );
}