'use client';

import React, { useMemo, useEffect, useState } from "react";
import { Target, Activity, ListTree, BarChart3, ShieldCheck, Zap, Cpu, Timer, Layers, AlertCircle, AlertOctagon, Loader2 } from "lucide-react";
import { Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area, BarChart } from 'recharts';
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

const cleanAnsi = (t: any) => typeof t === 'string' ? t.replace(/[\u001b\x1b]\[[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '').trim() : t;

const parseToMs = (durationStr: string) => {
    if (!durationStr) return 0;
    const clean = durationStr.toLowerCase();
    if (clean.includes('ms')) return parseInt(clean.replace('ms', '')) || 0;
    if (clean.includes('s')) return parseFloat(clean.replace('s', '')) * 1000 || 0;
    return parseInt(clean) || 0;
};

export function BuildTestCaseTracker({ allTests, buildId }: { allTests: any[], buildId: any }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = theme === 'dark';
  const gridColor = isDark ? "#27272a" : "#e4e4e7";
  const tooltipBg = isDark ? "#000000" : "#ffffff";

  const safeBuildId = useMemo(() => {
    if (!buildId) return 'LOCAL_ENV';
    return String(buildId).slice(0, 8);
  }, [buildId]);

  const tcRegistry = useMemo(() => {
    if (!allTests || allTests.length === 0) return null;

    const registry: Record<string, { status: 'passed' | 'failed' | 'running', steps: any[], spec: string, title: string }> = {};
    let totalStepsCount = 0;

    allTests.forEach((test: any) => {
      const testStatus = test.status?.toLowerCase();
      const isPassed = ['passed', 'success', 'expected'].includes(testStatus);
      const isFailed = ['failed', 'error', 'fail'].includes(testStatus);

      let currentActiveId: string | null = null;

      test.steps?.forEach((step: any) => {
        const args = cleanAnsi(step.arguments);
        const match = args.match(/Running Test Case:\s*(TC\d+)/i);

        if (match) {
          currentActiveId = match[1].toUpperCase();
          //@ts-ignore
          if (!registry[currentActiveId]) {
            //@ts-ignore
            registry[currentActiveId] = {
              status: 'running',
              steps: [],
              spec: test.specFile?.split('/').pop() || 'ROOT',
              title: test.title
            };
          }
        }

        if (currentActiveId && registry[currentActiveId]) {
          registry[currentActiveId].steps.push(step);
          totalStepsCount++;
          if (registry[currentActiveId].status !== 'passed') {
            if (isPassed) registry[currentActiveId].status = 'passed';
            else if (isFailed) registry[currentActiveId].status = 'failed';
          }
        }
      });
    });

    const items = Object.entries(registry).sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }));

    return {
      total: items.length,
      passed: items.filter(([_, d]) => d.status === 'passed').length,
      failed: items.filter(([_, d]) => d.status === 'failed').length,
      totalSteps: totalStepsCount,
      items
    };
  }, [allTests]);

  const graphData = useMemo(() => {
    if (!tcRegistry) return [];
    return tcRegistry.items.map(([id, data]) => {
      const totalMs = data.steps.reduce((acc, s) => acc + parseToMs(s.duration), 0);
      const failedStepsCount = data.steps.filter(s => s.status === 'failed').length;
      const failedSteps = (failedStepsCount === 0 && data.status === 'failed') ? 1 : failedStepsCount;
      
      return {
        id,
        steps: data.steps.length,
        failedSteps: failedSteps,
        passedSteps: Math.max(0, data.steps.length - failedSteps),
        duration: parseFloat((totalMs / 1000).toFixed(2)),
        status: data.status
      };
    });
  }, [tcRegistry]);

  useEffect(() => {
    if (tcRegistry?.items.length && !selectedId) {
      setSelectedId(tcRegistry.items[0][0]);
    }
  }, [tcRegistry, selectedId]);

  if (!mounted) return null;

  // 🟢 LOADING UI: Themed Terminal Sequence
  if (!tcRegistry) {
    return (
      <div className="bg-background border border-border h-[600px] flex flex-col items-center justify-center font-mono uppercase overflow-hidden relative transition-colors duration-300">
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-10 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:40px_40px]" />
        
        <div className="relative flex flex-col items-center gap-6">
          <div className="relative">
             <div className="absolute -inset-4 border border-emerald-500/20 rounded-full animate-[spin_4s_linear_infinite]" />
             <Cpu size={48} className="text-emerald-500 animate-pulse" />
          </div>
          
          <div className="text-center space-y-2">
            <h2 className="text-xs font-black text-emerald-600 dark:text-emerald-500 tracking-[0.4em] animate-pulse">Initializing_Sync_Protocol</h2>
            <div className="flex items-center justify-center gap-4 text-[10px] text-muted font-bold">
              <span>Build_ID: {safeBuildId}</span>
              <span className="w-1 h-1 bg-border rounded-full" />
              <span className="animate-bounce">Scrubbing_Logs...</span>
            </div>
          </div>

          <div className="w-48 h-1 bg-muted/20 overflow-hidden relative border border-border">
            <div className="h-full bg-emerald-500 w-1/3 absolute animate-[loading_1.5s_infinite_ease-in-out]" />
          </div>
        </div>
        <style jsx>{` @keyframes loading { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } } `}</style>
      </div>
    );
  }

  const activeData = selectedId ? tcRegistry.items.find(x => x[0] === selectedId)?.[1] : null;
  const passPercentage = Math.round((tcRegistry.passed / tcRegistry.total) * 100);

  return (
    <div className="bg-background border border-border rounded-none font-mono shadow-2xl overflow-hidden mb-8 select-none animate-in fade-in duration-500 uppercase transition-colors duration-300">
      
      {/* 🟢 TOP PROGRESS BAR */}
      <div className="h-1.5 w-full bg-border flex">
        <div className="h-full bg-emerald-500 transition-all duration-1000 shadow-[0_0_15px_#10b981]" style={{ width: `${passPercentage}%` }} />
        <div className="h-full bg-rose-600 transition-all duration-1000 shadow-[0_0_15px_#e11d48]" style={{ width: `${100 - passPercentage}%` }} />
      </div>

      {/* HEADER */}
      <div className="px-6 py-4 border-b border-border bg-card/50 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/20"><Cpu size={16} className="text-emerald-500" /></div>
          <div>
            <span className="text-[10px] font-black text-foreground uppercase tracking-[0.3em] block leading-none">System_Validation_Core</span>
            <span className="text-[8px] text-muted font-bold mt-1 block tracking-tighter opacity-50">BUILD_REF: {safeBuildId}</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
            <div className="text-right">
                <span className="text-[8px] font-bold text-muted block text-[7px] tracking-widest leading-none mb-1">STABILITY_SCORE</span>
                <span className={cn("text-sm font-black tracking-tighter", passPercentage > 80 ? "text-emerald-600 dark:text-emerald-500" : "text-rose-600 dark:text-rose-500")}>{passPercentage}%</span>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="flex items-center gap-2 text-[10px] font-black text-muted">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                SYNC_ACTIVE
            </div>
        </div>
      </div>

      {/* 📊 KPI METRICS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-border border-b border-border">
        <div className="lg:col-span-5 grid grid-cols-4 divide-x divide-border bg-card/20">
           <MiniStat label="Tests" value={tcRegistry.total} color="text-foreground" />
           <MiniStat label="Passed" value={tcRegistry.passed} color="text-emerald-600 dark:text-emerald-500" />
           <MiniStat label="Failed" value={tcRegistry.failed} color="text-rose-600 dark:text-rose-500" />
           <MiniStat label="TotalSteps" value={tcRegistry.totalSteps} color="text-blue-600 dark:text-sky-500" />
        </div>

        <div className="lg:col-span-7 p-4 bg-background relative">
            <div className="text-[8px] font-black text-muted uppercase tracking-widest mb-3 flex items-center gap-2">
                <Activity size={10} /> Node_Matrix_Mapping
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto custom-scrollbar pr-2">
                {tcRegistry.items.map(([id, data]) => (
                    <button
                      key={id}
                      onClick={() => setSelectedId(id)}
                      className={cn(
                        "px-2 py-1 border text-[9px] font-black transition-all",
                        selectedId === id ? "border-foreground bg-foreground text-background scale-105 z-10" :
                        data.status === 'passed' ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-500 hover:border-emerald-500" : 
                        "border-rose-500/30 bg-rose-500/5 text-rose-600 dark:text-rose-500 animate-pulse hover:border-rose-500"
                      )}
                    >
                        {id}
                    </button>
                ))}
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:divide-x divide-border lg:grid-cols-12">
          
          {/* STEP AUDIT (LEFT COLUMN) */}
          <div className="lg:col-span-7 flex flex-col bg-background h-[700px]">
            <div className="px-4 py-3 border-b border-border bg-card/50 flex justify-between items-center">
                <div className="flex items-center gap-2 text-muted">
                    <ListTree size={12} />
                    <span className="text-[9px] font-black uppercase tracking-tighter">Deep_Step_Analysis: {selectedId}</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar bg-[radial-gradient(var(--border)_1px,transparent_1px)] bg-[size:24px_24px]">
                {activeData ? (
                <div className="divide-y divide-border/50">
                    <div className="p-5 bg-background/90 backdrop-blur-md sticky top-0 z-10 border-b border-border">
                        <p className="text-[8px] text-emerald-600 dark:text-emerald-500 font-black mb-1 tracking-widest">SCENARIO</p>
                        <p className="text-[12px] text-foreground font-black leading-tight tracking-tight">{activeData.title}</p>
                    </div>

                    {activeData.steps.map((step: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-4 p-4 hover:bg-card transition-colors group">
                        <div className="w-6 shrink-0 text-left text-[9px] font-black text-muted/50 group-hover:text-muted tabular-nums pt-1">{String(idx + 1).padStart(2, '0')}</div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] font-black text-muted uppercase tracking-widest">{step.command}</span>
                                <span className="text-[8px] font-bold text-muted/40 tabular-nums bg-card px-1">{step.duration}</span>
                            </div>
                            <p className="text-[11px] text-foreground/60 font-mono break-all leading-relaxed bg-card/40 p-1 border-l border-border">{cleanAnsi(step.arguments)}</p>
                        </div>
                        <div className={cn("mt-2 w-1.5 h-1.5 rotate-45 border border-border", step.status === 'failed' ? "bg-rose-500 shadow-[0_0_8px_#e11d48]" : "bg-border group-hover:bg-emerald-500 transition-colors")} />
                    </div>
                    ))}
                </div>
                ) : <div className="h-full flex flex-col items-center justify-center opacity-20 text-[10px] font-black tracking-widest text-muted">SELECT_NODE_FOR_INSPECTION</div>}
            </div>
          </div>

          {/* 🟢 DISTRIBUTED GRAPHS (RIGHT COLUMN) */}
          <div className="lg:col-span-5 flex flex-col bg-card/10 overflow-y-auto custom-scrollbar">
            
            <div className="p-6 border-b border-border">
                <div className="flex items-center gap-2 mb-4">
                    <AlertOctagon size={14} className="text-rose-500" />
                    <span className="text-[10px] font-black text-foreground uppercase tracking-[0.2em]">Fault_Occurrence_Matrix</span>
                </div>
                <div className="h-[150px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={graphData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                            <XAxis dataKey="id" hide />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: isDark ? '#52525b' : '#a1a1aa', fontSize: 8}} />
                            <Tooltip contentStyle={{backgroundColor: tooltipBg, border: `1px solid ${gridColor}`}} cursor={{fill: 'var(--muted)', opacity: 0.1}} />
                            <Bar dataKey="failedSteps" minPointSize={2}>
                                {graphData.map((entry, index) => (
                                    <Cell key={index} fill={entry.failedSteps > 0 ? '#e11d48' : gridColor} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="p-6 border-b border-border">
                <div className="flex items-center gap-2 mb-4 text-muted">
                    <AlertCircle size={14} className="opacity-50" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">Step_Health_Ratio</span>
                </div>
                <div className="h-[150px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={graphData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                            <XAxis dataKey="id" hide />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: isDark ? '#52525b' : '#a1a1aa', fontSize: 8}} />
                            <Bar dataKey="passedSteps" stackId="a" fill="#10b981" fillOpacity={0.6} minPointSize={1} />
                            <Bar dataKey="failedSteps" stackId="a" fill="#e11d48" minPointSize={1} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="p-6 border-b border-border">
                <div className="flex items-center gap-2 mb-4">
                    <Layers size={14} className="text-sky-500" />
                    <span className="text-[10px] font-black text-foreground uppercase tracking-[0.2em]">Complexity_Flow</span>
                </div>
                <div className="h-[150px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={graphData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                            <XAxis dataKey="id" hide />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: isDark ? '#52525b' : '#a1a1aa', fontSize: 8}} />
                            <Bar dataKey="steps" minPointSize={2}>
                                {graphData.map((entry, index) => (
                                    <Cell key={index} fill={selectedId === entry.id ? '#0ea5e9' : gridColor} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="p-6 border-b border-border last:border-b-0">
                <div className="flex items-center gap-2 mb-4 text-emerald-500">
                    <Timer size={14} />
                    <span className="text-[10px] font-black text-foreground uppercase tracking-[0.2em]">Latency_Profile</span>
                </div>
                <div className="h-[140px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={graphData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorDur" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                            <XAxis dataKey="id" hide />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: isDark ? '#52525b' : '#a1a1aa', fontSize: 8}} />
                            <Area type="monotone" dataKey="duration" stroke="#10b981" fillOpacity={1} fill="url(#colorDur)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-px bg-border border-t border-border mt-auto">
                <div className="bg-background p-4 text-center">
                    <span className="text-[7px] font-black text-muted tracking-widest uppercase block mb-1">Avg_Complexity</span>
                    <span className="text-lg font-black text-foreground leading-none">{(tcRegistry.totalSteps / tcRegistry.total).toFixed(1)} <span className="text-[9px] text-muted font-bold">S/TC</span></span>
                </div>
                <div className="bg-background p-4 text-center">
                    <span className="text-[7px] font-black text-muted tracking-widest uppercase block mb-1">Fault_Ratio</span>
                    <span className="text-lg font-black text-rose-600 dark:text-rose-500 leading-none">{((graphData.reduce((a, b) => a + b.failedSteps, 0) / Math.max(1, tcRegistry.totalSteps)) * 100).toFixed(1)}%</span>
                </div>
            </div>

          </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }: any) {
  return (
    <div className="p-4 flex flex-col items-center justify-center gap-1 group hover:bg-muted/10 transition-all cursor-default text-center">
      <span className="text-[7px] font-black text-muted uppercase tracking-widest group-hover:text-muted/80">{label}</span>
      <span className={cn("text-xl font-black tabular-nums tracking-tighter leading-none", color)}>{value}</span>
    </div>
  )
}