'use client';

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  getBuildHistory,
  getMasterTestCases,
  getBuildDetails,
  getPlaywrightTrend,
  getTestSteps
} from "@/lib/actions";
import {
  Loader2, Activity, Search, Cpu, Shield, Zap, TrendingUp,
  CheckCircle2, XCircle, ArrowUpRight, ArrowDownRight,
  PieChart as PieChartIcon, Star, Lock, Unlock
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

/* -------------------- 🔥 FIXED STATUS NORMALIZER -------------------- */
function normalizeStatus(status: string): 'passed' | 'failed' | 'running' | 'skipped' {
  if (!status) return 'running';
  const s = status.toLowerCase().trim();
  if (s === 'passed') return 'passed';
  if (s === 'failed') return 'failed';
  if (s === 'skipped') return 'skipped';
  return 'running';
}

/* -------------------- 🔥 FIXED TiDB NORMALIZER -------------------- */
function normalizePlaywrightResults(specResults: any[]) {
  const testMap = new Map<string, any>();
  
  specResults?.forEach((spec: any) => {
    spec.tests?.forEach((test: any) => {
      // 🔥 Use unique_key if available, otherwise create from project::title
      const key = test.unique_key || `${test.project || 'default'}::${test.title || 'unknown'}`;
      
      const existing = testMap.get(key);
      
      if (!existing) {
        // First time seeing this test
        testMap.set(key, {
          ...test,
          unique_key: key,
          normalizedStatus: normalizeStatus(test.status)
        });
      } else {
        // 🔥 PRIORITY LOGIC:
        // 1. is_final=true ALWAYS wins over is_final=false
        // 2. If both have same is_final, use higher run_number
        // 3. Never let "running" status overwrite a final result
        
        const existingIsFinal = existing.is_final === true;
        const newIsFinal = test.is_final === true;
        
        let shouldReplace = false;
        
        if (newIsFinal && !existingIsFinal) {
          // New is final, existing is not -> replace
          shouldReplace = true;
        } else if (newIsFinal && existingIsFinal) {
          // Both final -> use higher run_number (later attempt)
          shouldReplace = (test.run_number || 0) > (existing.run_number || 0);
        } else if (!newIsFinal && !existingIsFinal) {
          // Neither final -> use higher run_number for progress
          shouldReplace = (test.run_number || 0) > (existing.run_number || 0);
        }
        // If existing is final and new is not -> never replace
        
        if (shouldReplace) {
          testMap.set(key, {
            ...test,
            unique_key: key,
            normalizedStatus: normalizeStatus(test.status)
          });
        }
      }
    });
  });

  // 🔥 Convert map to array with all required fields
  const result = Array.from(testMap.values()).map(test => ({
    ...test,
    id: test.id || 0,
    project: test.project || 'default',
    title: test.title || 'unknown',
    status: normalizeStatus(test.status), // 🔥 Normalized to lowercase
    specId: test.specId || 0,
    specFile: test.specFile || test.file || 'unknown',
    unique_key: test.unique_key
  }));

  // 🔥 Debug logging
  console.log('🔍 NORMALIZER DEBUG:');
  console.log('   Input specs:', specResults?.length || 0);
  console.log('   Total tests in specs:', specResults?.reduce((sum: number, s: any) => sum + (s.tests?.length || 0), 0) || 0);
  console.log('   Unique tests after dedup:', result.length);
  console.log('   By status:', {
    passed: result.filter(t => t.status === 'passed').length,
    failed: result.filter(t => t.status === 'failed').length,
    running: result.filter(t => t.status === 'running').length
  });

  return result;
}

export default function PlaywrightDashboard() {
  // --- States ---
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
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isShared, setIsShared] = useState(false);
  const [shareCode, setShareCode] = useState('');
  const [loadingLogs, setLoadingLogs] = useState<string | null>(null);

  /**
   * 🔥 masterMap: Maps TC codes to Master Case details
   */
  const masterMap = useMemo(() => {
    return masterCases.reduce((acc: any, tc) => {
      if (tc.caseCode) acc[tc.caseCode] = tc;
      return acc;
    }, {});
  }, [masterCases]);

  // 1. Initial Load
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
      if (pwBuilds.length && !selectedBuildId) setSelectedBuildId(pwBuilds[0].id);
    } catch (e) { console.error(e); } finally { if (initial) setLoading(false); }
  }, [selectedBuildId]);

  // 2. Fetch Build Details
  useEffect(() => {
    if (!selectedBuildId) return;
    (async () => {
      setLoadingDetails(true);
      const details = await getBuildDetails(selectedBuildId);
      setBuildDetails(details);
      setLoadingDetails(false);
    })();
  }, [selectedBuildId]);

  // 3. Polling
  useEffect(() => {
    loadData(true);
    const interval = setInterval(() => { if (!document.hidden) loadData(); }, 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  // --- Actions ---
  const toggleTestLogs = async (uiId: string, testResultId: number, title: string) => {
    const isOpening = !expandedTests.includes(uiId);
    
    if (!isOpening) {
      // 🔥 Closing - just collapse and clear loading state
      setExpandedTests(prev => prev.filter(i => i !== uiId));
      setLoadingLogs(null);
      return;
    }

    // 🔥 Opening - fetch logs
    setExpandedTests(prev => [...prev, uiId]);
    setLoadingLogs(uiId);

    try {
      // 🔥 Pass the testResultId (not specId) to fetch logs correctly
      const data = await getTestSteps(testResultId, title);

      if (data) {
        setBuildDetails((prev: any) => {
          if (!prev || !prev.results) return prev;
          
          // 🔥 Find and update the correct test entry
          const updatedResults = prev.results.map((spec: any) => {
            if (!spec.tests) return spec;
            
            return {
              ...spec,
              tests: spec.tests.map((t: any) => {
                if (t.title !== title) return t;

                // 🔥 Populate logs from fetched data
                return {
                  ...t,
                  // Primary log sources
                  logs: data.logs || [],
                  stdout_logs: data.stdout_logs || data.logs || [],
                  stderr_logs: data.stderr_logs || [],
                  // Nested in test_entry
                  test_entry: {
                    ...(t.test_entry || {}),
                    stdout_logs: data.stdout_logs || data.logs || [],
                    stderr_logs: data.stderr_logs || [],
                    logs: data.logs || []
                  },
                  // Steps
                  steps: data.steps || [],
                  // Error info
                  error: data.error || null,
                  // Mark as having details loaded
                  has_details: true
                };
              })
            };
          });
          
          return { ...prev, results: updatedResults };
        });
      }
    } catch (error) {
      console.error('Error fetching test steps:', error);
    } finally {
      // 🔥 Always clear loading state when done
      setLoadingLogs(null);
    }
  };

  // 🔥 FIXED: Use the improved normalizer
  const normalizedTests = useMemo(() => {
    const results = normalizePlaywrightResults(buildDetails?.results || []);
    return results;
  }, [buildDetails]);

  // 🔥 FIXED: Stats calculation with normalized status
  const currentStats = useMemo(() => {
    const s = { total: 0, passed: 0, failed: 0, running: 0 };
    
    normalizedTests.forEach((t: any) => {
      s.total++;
      // 🔥 Status is already normalized to lowercase by normalizePlaywrightResults
      const status = t.status || 'running';
      
      if (status === 'running') s.running++;
      else if (status === 'passed') s.passed++;
      else if (status === 'failed') s.failed++;
      else s.failed++; // Unknown status counts as failed
    });
    
    console.log('📊 STATS:', s);
    return s;
  }, [normalizedTests]);

  const analysis = useMemo(() => {
    if (trendData.length < 2) return { historicalRate: 0, currentRate: 0, diff: 0, isImprovement: true };
    const historical = trendData.slice(0, -1);
    let hP = 0, hT = 0;
    historical.forEach(b => { hP += b.passed; hT += b.total; });
    const hRate = hT > 0 ? (hP / hT) * 100 : 0;
    const cRate = currentStats.total > 0 ? (currentStats.passed / currentStats.total) * 100 : 0;
    const diff = cRate - hRate;
    return { historicalRate: Math.round(hRate), currentRate: Math.round(cRate), diff: parseFloat(diff.toFixed(1)), isImprovement: diff >= 0 };
  }, [trendData, currentStats]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#09090b]"><Loader2 className="animate-spin text-indigo-500 w-10 h-10" /></div>;

  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-300 font-sans">
      <aside className="w-80 border-r border-white/5 bg-[#0b0b0d] overflow-y-auto shrink-0 custom-scrollbar">
        <div className="p-6 border-b border-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Run History</div>
        {builds.map(b => (
          <button key={b.id} onClick={() => setSelectedBuildId(b.id)} className={cn("w-full text-left p-5 border-b border-white/5 transition-all relative group", selectedBuildId === b.id ? "bg-emerald-600/10 border-r-2 border-r-emerald-500" : "hover:bg-white/5")}>
            <div className="flex justify-between items-center mb-1"><span className="font-black text-white text-sm uppercase">Build #{b.id}</span><StatusBadge status={b.status} /></div>
            <p className="text-[10px] text-zinc-500 uppercase">{new Date(b.createdAt).toLocaleDateString()}</p>
          </button>
        ))}
      </aside>

      <main className="flex-1 overflow-y-auto p-10 space-y-12 bg-[#09090b] custom-scrollbar">
        <header className="flex flex-col gap-10">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">Command Center</h1>
              <div className="flex items-center gap-3">
                <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold", analysis.isImprovement ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500")}>
                  {analysis.isImprovement ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {Math.abs(analysis.diff)}% {analysis.isImprovement ? 'Improvement' : 'Regression'}
                </div>
                <span className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest">baseline ({analysis.historicalRate}%)</span>
              </div>
            </div>
            <button onClick={() => setIsShared(!isShared)} className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400 text-[10px] font-bold hover:bg-indigo-500/20 transition-all flex items-center gap-2">
              {isShared ? <Unlock size={14} /> : <Lock size={14} />} {isShared ? 'Shared' : 'Private'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Total Scenarios" value={currentStats.total} sub="In this build" icon={<Shield className="text-emerald-500" />} />
            <StatCard title="Passed" value={currentStats.passed} sub="Successful" icon={<CheckCircle2 className="text-emerald-400" />} />
            <StatCard title="Active Workers" value={currentStats.running} sub="TiDB Live" icon={<Activity className="text-indigo-500" />} pulse={currentStats.running > 0} />
            <StatCard title="Health Score" value={`${analysis.currentRate}%`} sub="Stability" icon={<Zap className="text-orange-500" />} trend={analysis.diff} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2 bg-[#0c0c0e] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl">
              <h2 className="text-sm font-black text-white uppercase mb-6 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-500" /> Execution Trend</h2>
              <div className="h-[250px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs><linearGradient id="grad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.2} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#52525b', fontSize: 10 }} dy={10} />
                    <Tooltip contentStyle={{ backgroundColor: '#0c0c0e', border: '1px solid #ffffff10', borderRadius: '1rem' }} />
                    <Area type="monotone" dataKey="passed" stroke="#10b981" strokeWidth={3} fill="url(#grad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-[#0c0c0e] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl flex flex-col items-center min-w-0">
              <div className="w-full flex items-center gap-2 mb-6"><PieChartIcon className="w-4 h-4 text-indigo-500" /><h2 className="text-sm font-black text-white uppercase tracking-widest">Distribution</h2></div>
              <div className="flex-1 w-full min-h-[200px] relative flex items-center justify-center min-w-0">
                <div className="absolute flex flex-col items-center justify-center pointer-events-none pb-4"><span className="text-3xl font-black text-white">{currentStats.total}</span><span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Tests</span></div>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={[
                        { name: 'FAIL', value: currentStats.failed, color: '#ef4444' }, 
                        { name: 'PASS', value: currentStats.passed, color: '#10b981' }, 
                        { name: 'LIVE', value: currentStats.running, color: '#6366f1' }
                      ].filter(d => d.value > 0)} 
                      cx="50%" 
                      cy="50%" 
                      innerRadius={60} 
                      outerRadius={80} 
                      paddingAngle={8} 
                      dataKey="value" 
                      stroke="none"
                    >
                      {[
                        { name: 'FAIL', value: currentStats.failed, color: '#ef4444' }, 
                        { name: 'PASS', value: currentStats.passed, color: '#10b981' }, 
                        { name: 'LIVE', value: currentStats.running, color: '#6366f1' }
                      ].filter(d => d.value > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend iconType="circle" />
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
              <input value={projectSearch} onChange={e => setProjectSearch(e.target.value)} placeholder="Filter browser..." className="bg-transparent border-none outline-none text-sm py-3 w-full" />
            </div>
          </div>
        </header>

        <div className="space-y-16 pb-20">
          {Object.entries(normalizedTests.reduce((acc: any, t: any) => {
            // 🔥 Filter uses lowercase status (already normalized)
            if ((filterStatus === 'all' || t.status === filterStatus) && 
                t.project.toLowerCase().includes(projectSearch.toLowerCase())) {
              if (!acc[t.project]) acc[t.project] = [];
              acc[t.project].push(t);
            }
            return acc;
          }, {})).map(([project, tests]: any) => (
            <div key={project} className="bg-[#0c0c0e] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
              <div className="px-8 py-6 border-b border-white/5 flex justify-between bg-white/[0.01] items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                    <Cpu className="w-6 h-6 text-emerald-500" />
                  </div>
                  <span className="text-xl font-black text-white tracking-tight uppercase">{project}</span>
                </div>
                <ProjectLevelStats tests={tests} />
              </div>
              <div className="divide-y divide-white/5">
                {tests.map((t: any) => {
                  // 🔥 Use unique_key for UI ID
                  const uiId = t.unique_key || `${t.id}-${t.project}-${t.title}`;
                  return (
                    <div key={uiId} className="relative group">
                      <TestRow
                        test={t}
                        masterMap={masterMap}
                        isExpanded={expandedTests.includes(uiId)}
                        isLoadingLogs={loadingLogs === uiId}
                        onToggle={() => toggleTestLogs(uiId, t.id, t.title)}
                      />
                    </div>
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
    <div className="bg-[#0c0c0e] border border-white/5 p-8 rounded-[2rem] shadow-xl relative overflow-hidden group">
      <div className="flex justify-between items-start mb-6">
        <div className="p-3 bg-white/5 rounded-2xl group-hover:scale-110 transition-transform">{icon}</div>
        {pulse && <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping" />}
        {trend !== undefined && <div className={cn("px-2 py-1 rounded-lg text-[9px] font-black", trend >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500")}>{trend >= 0 ? "+" : ""}{trend}%</div>}
      </div>
      <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">{title}</h3>
      <div className="text-4xl font-black text-white tracking-tighter mt-1 tabular-nums">{value}</div>
      <p className="text-[10px] text-zinc-600 font-bold mt-2 uppercase">{sub}</p>
    </div>
  );
}