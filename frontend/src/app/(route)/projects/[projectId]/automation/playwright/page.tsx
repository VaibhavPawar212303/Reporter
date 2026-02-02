'use client';

import React, { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  getBuildHistory,
  getMasterTestCases,
  getBuildDetails,
  getPlaywrightTrend,
  getTestSteps,
  getProjectById
} from "@/lib/actions";
import {
  Loader2, Activity, Search, Cpu, Shield, Zap, TrendingUp,
  CheckCircle2, XCircle, ArrowUpRight, ArrowDownRight,
  PieChart as PieChartIcon, Star, Lock, Unlock,
  Monitor, Calendar, Server, Command, ChevronRight, Sparkles, X
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
import { BuildOverview } from "./_components/BuildOverview";
import { useTheme } from "next-themes";

/* --- HELPERS (LOGIC MAINTAINED AS IS) --- */
function normalizeStatus(status: string): 'passed' | 'failed' | 'running' | 'skipped' {
  if (!status) return 'running';
  const s = status.toLowerCase().trim();
  if (s === 'passed' || s === 'success' || s === 'expected') return 'passed';
  if (s === 'failed' || s === 'error') return 'failed';
  if (s === 'skipped') return 'skipped';
  return 'running';
}

function normalizePlaywrightResults(specResults: any[]) {
  const testMap = new Map<string, any>();
  specResults?.forEach((spec: any) => {
    let tests = [];
    try {
      tests = typeof spec.tests === 'string' ? JSON.parse(spec.tests) : spec.tests;
    } catch (e) {
      console.error("JSON Parsing failed for spec:", spec.id);
    }
    if (!Array.isArray(tests)) return;
    tests.forEach((test: any) => {
      const key = test.unique_key || `${test.project || 'default'}::${test.title || 'unknown'}`;
      const existing = testMap.get(key);
      if (!existing) {
        testMap.set(key, { ...test, unique_key: key, status: normalizeStatus(test.status) });
      } else {
        const existingIsFinal = ['passed', 'failed'].includes(existing.status);
        const newIsFinal = ['passed', 'failed'].includes(normalizeStatus(test.status));
        let shouldReplace = false;
        if (newIsFinal && !existingIsFinal) shouldReplace = true;
        else if (newIsFinal === existingIsFinal) {
          shouldReplace = (test.run_number || 0) > (existing.run_number || 0);
        }
        if (shouldReplace) testMap.set(key, { ...test, unique_key: key, status: normalizeStatus(test.status) });
      }
    });
  });
  return Array.from(testMap.values());
}

function PlaywrightDashboardContent() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const gridColor = isDark ? "#27272a" : "#e4e4e7";
  const tooltipBg = isDark ? "#000000" : "#ffffff";

  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');
  const urlBuildId = searchParams.get('buildId');

  const [builds, setBuilds] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [masterCases, setMasterCases] = useState<any[]>([]);
  const [selectedBuildId, setSelectedBuildId] = useState<number | null>(urlBuildId ? Number(urlBuildId) : null);
  const [buildDetails, setBuildDetails] = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [expandedTests, setExpandedTests] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'passed' | 'failed' | 'running'>('all');
  const [projectSearch, setProjectSearch] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isShared, setIsShared] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState<string | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);

  const masterMap = useMemo(() => masterCases.reduce((acc: any, tc) => {
    if (tc.caseCode) acc[tc.caseCode] = tc;
    return acc;
  }, {}), [masterCases]);

  const loadData = useCallback(async (initial = false) => {
    if (!projectId) return;
    try {
      if (initial) setLoading(true);
      const [history, master, trend, projInfo] = await Promise.all([
        getBuildHistory(), getMasterTestCases(), getPlaywrightTrend(Number(projectId)), getProjectById(Number(projectId))
      ]);
      const pwBuilds = Array.isArray(history) ? history.filter((b: any) => b.type?.toLowerCase() === 'playwright') : [];
      setBuilds(pwBuilds);
      setMasterCases(master);
      setProject(projInfo);
      setTrendData(Array.isArray(trend) ? trend : []);
      if (pwBuilds.length && !selectedBuildId) setSelectedBuildId(pwBuilds[0].id);
    } catch (e) {
      console.error(e);
    } finally {
      if (initial) setLoading(false);
    }
  }, [selectedBuildId, projectId]);

  useEffect(() => {
    if (!selectedBuildId) return;
    (async () => {
      setLoadingDetails(true);
      const details = await getBuildDetails(selectedBuildId);
      setBuildDetails(details);
      setLoadingDetails(false);
    })();
  }, [selectedBuildId]);

  useEffect(() => {
    loadData(true);
    const interval = setInterval(() => { if (!document.hidden) loadData(); }, 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  const toggleTestLogs = async (uiId: string, testResultId: number, title: string) => {
    const isOpening = !expandedTests.includes(uiId);
    if (!isOpening) { setExpandedTests(prev => prev.filter(i => i !== uiId)); return; }
    setExpandedTests(prev => [...prev, uiId]);
    setLoadingLogs(uiId);
    try {
      const data = await getTestSteps(testResultId, title);
      if (data) setBuildDetails((prev: any) => {
        if (!prev) return prev;
        const results = prev.results.map((spec: any) => ({
          ...spec,
          tests: typeof spec.tests === 'string' ? JSON.parse(spec.tests) : spec.tests
        })).map((spec: any) => ({
          ...spec,
          tests: spec.tests.map((t: any) => t.title === title ? { ...t, ...data, has_details: true } : t)
        }));
        return { ...prev, results };
      });
    } finally { setLoadingLogs(null); }
  };

  const normalizedTests = useMemo(() => normalizePlaywrightResults(buildDetails?.results || []), [buildDetails]);
  
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
    if (trendData.length < 2) return { hRate: 0, cRate: 0, diff: 0, improve: true };
    const historical = trendData.slice(0, -1);
    let hP = 0, hT = 0;
    historical.forEach(b => { hP += b.passed; hT += b.total; });
    const hRate = hT > 0 ? (hP / hT) * 100 : 0;
    const cRate = currentStats.total > 0 ? (currentStats.passed / currentStats.total) * 100 : 0;
    const diff = cRate - hRate;
    return { hRate: Math.round(hRate), cRate: Math.round(cRate), diff: parseFloat(diff.toFixed(1)), improve: diff >= 0 };
  }, [trendData, currentStats]);

  const pieData = useMemo(() => [
    { name: 'FAIL', value: currentStats.failed, color: '#ef4444' },
    { name: 'PASS', value: currentStats.passed, color: '#10b981' },
    { name: 'LIVE', value: currentStats.running, color: '#3b82f6' }
  ].filter(d => d.value > 0), [currentStats]);

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 text-muted animate-spin" />
    </div>
  );

  return (
    <div className="flex h-screen bg-background text-foreground font-sans selection:bg-indigo-500/30 overflow-hidden transition-colors duration-300">
      <main className="flex-1 overflow-y-auto p-8 space-y-8 bg-background custom-scrollbar">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-8">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted">
               <Command size={14} />
               <span className="text-[10px] font-bold uppercase tracking-widest">Analytics / Playwright Console</span>
            </div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-3 uppercase">
              {showAnalysis ? 'Intelligence Analysis' : 'Playwright Command Center'}
            </h1>
            <div className="flex items-center gap-3 mt-2">
               <div className={cn("px-2 py-0.5 rounded-sm text-[10px] font-black border", analysis.improve ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-500" : "bg-rose-500/10 text-rose-600 dark:text-rose-500")}>
                  {analysis.improve ? <ArrowUpRight size={10} className="inline mr-1"/> : <ArrowDownRight size={10} className="inline mr-1"/>}
                  {Math.abs(analysis.diff)}% {analysis.improve ? 'HEALTH_GAIN' : 'REGRESSION'}
               </div>
               <span className="text-muted text-[9px] font-bold uppercase tracking-widest font-mono opacity-50">stability_baseline: {analysis.hRate}%</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowAnalysis(!showAnalysis)} 
              className={cn(
                "px-4 py-2 border rounded-sm text-[10px] font-black transition-all uppercase tracking-widest flex items-center gap-2",
                showAnalysis ? "bg-foreground text-background border-foreground shadow-xl" : "bg-card border-border text-muted hover:text-foreground"
              )}
            >
              {showAnalysis ? <X size={12} /> : <Sparkles size={12} />}
              {showAnalysis ? 'Exit Intelligence' : 'Run Intelligence'}
            </button>
            <button onClick={() => setIsShared(!isShared)} className="px-4 py-2 bg-card border border-border rounded-sm text-muted text-[10px] font-bold hover:text-foreground transition-all uppercase tracking-widest flex items-center gap-2">
              {isShared ? <Unlock size={12} /> : <Lock size={12} />} {isShared ? 'Shared Access' : 'Private Instance'}
            </button>
          </div>
        </header>

        {showAnalysis ? (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <BuildOverview buildId={selectedBuildId} buildData={buildDetails} />
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Throughput" value={currentStats.total} sub="Active Scenarios" icon={<Shield size={18}/>} color="indigo" />
              <StatCard title="Reliability" value={currentStats.passed} sub="Success Vector" icon={<CheckCircle2 size={18}/>} color="emerald" />
              <StatCard title="Concurrency" value={currentStats.running} sub="Workers Active" icon={<Activity size={18}/>} pulse={currentStats.running > 0} color="amber" />
              <StatCard title="Build Health" value={`${analysis.cRate}%`} sub="Stability Index" icon={<Zap size={18}/>} trend={analysis.diff} color="zinc" />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 bg-card border border-border rounded-sm shadow-sm flex flex-col">
                <div className="px-6 py-4 border-b border-border bg-muted/5 flex items-center gap-3">
                  <TrendingUp size={14} className="text-emerald-500" />
                  <h2 className="text-[10px] font-black text-foreground uppercase tracking-widest">Execution Analytics</h2>
                </div>
                <div className="h-[250px] w-full p-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData}>
                      <defs><linearGradient id="gradP" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: isDark ? '#52525b' : '#a1a1aa', fontSize: 9, fontWeight: 800}} dy={10} />
                      <Tooltip contentStyle={{backgroundColor: tooltipBg, border: `1px solid ${gridColor}`, color: isDark ? '#fff' : '#000'}} itemStyle={{fontSize: '11px', fontWeight: 'bold'}} />
                      <Area type="monotone" dataKey="passed" stroke="#10b981" strokeWidth={3} fill="url(#gradP)" fillOpacity={1} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div className="bg-card border border-border rounded-sm shadow-sm flex flex-col items-center">
                <div className="w-full px-6 py-4 border-b border-border bg-muted/5 flex items-center gap-3">
                  <PieChartIcon size={14} className="text-indigo-500" />
                  <h2 className="text-[10px] font-black text-foreground uppercase tracking-widest">Status Matrix</h2>
                </div>
                <div className="flex-1 w-full min-h-[200px] relative flex items-center justify-center">
                   <div className="absolute flex flex-col items-center justify-center pointer-events-none pb-4">
                      <span className="text-3xl font-bold text-foreground font-mono">{currentStats.total}</span>
                      <span className="text-[8px] font-bold text-muted uppercase tracking-widest">Tests</span>
                   </div>
                   <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                       <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={75} paddingAngle={8} dataKey="value" stroke="none">
                         {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                       </Pie>
                       <Legend iconType="circle" verticalAlign="bottom" wrapperStyle={{paddingTop: '20px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: isDark ? '#a1a1aa' : '#71717a'}} />
                     </PieChart>
                   </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="flex items-center gap-2 bg-card border border-border p-2 rounded-sm shadow-sm overflow-x-auto scrollbar-hide">
                <FilterButton active={filterStatus === 'all'} label="TOTAL" count={currentStats.total} onClick={() => setFilterStatus('all')} color="zinc" />
                <FilterButton active={filterStatus === 'passed'} label="PASSED" count={currentStats.passed} onClick={() => setFilterStatus('passed')} color="green" />
                <FilterButton active={filterStatus === 'failed'} label="FAILED" count={currentStats.failed} onClick={() => setFilterStatus('failed')} color="red" />
                <FilterButton active={filterStatus === 'running'} label="ACTIVE" count={currentStats.running} onClick={() => setFilterStatus('running')} color="indigo" />
              </div>
              <div className="flex items-center gap-4 px-4 bg-card border border-border rounded-sm group focus-within:border-muted transition-all">
                <Search size={14} className="text-muted" />
                <input value={projectSearch} onChange={e => setProjectSearch(e.target.value)} placeholder="SEARCH_WORKER_PROJECT..." className="bg-transparent border-none outline-none text-[11px] py-4 w-full text-foreground font-mono placeholder:text-muted/50" />
              </div>
            </div>

            <div className="space-y-12 pb-40">
              {Object.entries(normalizedTests.reduce((acc: any, t: any) => {
                if ((filterStatus === 'all' || t.status === filterStatus) && t.project.toLowerCase().includes(projectSearch.toLowerCase())) {
                  if (!acc[t.project]) acc[t.project] = [];
                  acc[t.project].push(t);
                }
                return acc;
              }, {})).map(([project, tests]: any) => (
                <div key={project} className="bg-card border border-border rounded-sm overflow-hidden shadow-sm flex flex-col">
                  <div className="px-6 py-4 border-b border-border bg-muted/5 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <Cpu size={14} className="text-indigo-500" />
                      <span className="text-xs font-bold text-foreground uppercase tracking-widest font-mono">{project}</span>
                    </div>
                    <ProjectLevelStats tests={tests} />
                  </div>
                  <div className="divide-y divide-border">
                    {tests.map((t: any) => {
                      const uiId = t.unique_key || `${t.id}-${t.project}-${t.title}`;
                      return (
                        <div key={uiId} className="relative group hover:bg-muted/5 transition-colors">
                          <TestRow test={t} masterMap={masterMap} isExpanded={expandedTests.includes(uiId)} isLoadingLogs={loadingLogs === uiId} onToggle={() => toggleTestLogs(uiId, t.id, t.title)} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function PlaywrightDashboard() {
  return (
    <Suspense fallback={<div className="h-screen flex flex-col items-center justify-center bg-background text-muted"><Loader2 className="animate-spin" /></div>}>
      <PlaywrightDashboardContent />
    </Suspense>
  );
}

function StatCard({ title, value, sub, icon, pulse, color }: any) {
  const accents: any = { indigo: 'border-t-indigo-500', amber: 'border-t-amber-500', emerald: 'border-t-emerald-500', zinc: 'border-t-border' };
  return (
    <div className={cn("bg-card border border-border border-t-2 rounded-sm p-8 shadow-sm hover:bg-muted/5 transition-all duration-300 group", accents[color])}>
      <div className="flex justify-between items-center mb-6">
        <div className="text-muted group-hover:text-foreground transition-colors">{icon}</div>
        {pulse && <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]" />}
      </div>
      <h3 className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">{title}</h3>
      <div className="text-4xl font-bold text-foreground tracking-tighter font-mono">{value ?? '0'}</div>
      <p className="text-[9px] text-muted font-bold mt-3 uppercase tracking-widest">{sub}</p>
    </div>
  );
}