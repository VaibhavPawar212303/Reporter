'use client';

import React, { useMemo, useEffect, useState } from "react";
import { Target, Activity, ListTree, BarChart3, ShieldCheck, Zap, Cpu, Timer, Layers, AlertCircle, AlertOctagon } from "lucide-react";
import { Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area, BarChart } from 'recharts';
import { cn } from "@/lib/utils";

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

  const safeBuildId = useMemo(() => {
    if (!buildId) return 'LOCAL_ENV';
    return String(buildId).slice(0, 8);
  }, [buildId]);

  const tcRegistry = useMemo(() => {
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
      
      // Improved logic: if individual steps don't have status, 
      // but the test failed, we treat the last step as the failed one.
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

  if (!tcRegistry || tcRegistry.total === 0) return null;
  
  const activeData = selectedId ? tcRegistry.items.find(x => x[0] === selectedId)?.[1] : null;
  const passPercentage = Math.round((tcRegistry.passed / tcRegistry.total) * 100);

  return (
    <div className="bg-black border border-zinc-900 rounded-none font-mono shadow-2xl overflow-hidden mb-8 select-none animate-in fade-in duration-500 uppercase">
      
      <div className="h-1.5 w-full bg-zinc-900 flex">
        <div className="h-full bg-emerald-500 transition-all duration-1000 shadow-[0_0_15px_#10b981]" style={{ width: `${passPercentage}%` }} />
        <div className="h-full bg-rose-600 transition-all duration-1000 shadow-[0_0_15px_#e11d48]" style={{ width: `${100 - passPercentage}%` }} />
      </div>

      <div className="px-6 py-4 border-b border-zinc-900 bg-zinc-950 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/20"><Cpu size={16} className="text-emerald-500" /></div>
          <div>
            <span className="text-[10px] font-black text-white uppercase tracking-[0.3em] block leading-none">System_Validation_Core</span>
            <span className="text-[8px] text-zinc-600 font-bold mt-1 block tracking-tighter">ID_REF: {safeBuildId}</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
            <div className="text-right">
                <span className="text-[8px] font-bold text-zinc-500 block text-[7px] tracking-widest">STABILITY_SCORE</span>
                <span className={cn("text-sm font-black tracking-tighter", passPercentage > 80 ? "text-emerald-500" : "text-rose-500")}>{passPercentage}%</span>
            </div>
            <div className="h-8 w-px bg-zinc-900" />
            <div className="flex items-center gap-2 text-[10px] font-black text-zinc-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                SYNC_ACTIVE
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-zinc-900 border-b border-zinc-900">
        <div className="lg:col-span-5 grid grid-cols-4 divide-x divide-zinc-900 bg-zinc-950/20">
           <MiniStat label="Tests" value={tcRegistry.total} color="text-white" />
           <MiniStat label="Passed" value={tcRegistry.passed} color="text-emerald-500" />
           <MiniStat label="Failed" value={tcRegistry.failed} color="text-rose-500" />
           <MiniStat label="TotalSteps" value={tcRegistry.totalSteps} color="text-sky-500" />
        </div>

        <div className="lg:col-span-7 p-4 bg-black relative">
            <div className="text-[8px] font-black text-zinc-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Activity size={10} /> Node_Matrix_Mapping
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto custom-scrollbar pr-2">
                {tcRegistry.items.map(([id, data]) => (
                    <button
                      key={id}
                      onClick={() => setSelectedId(id)}
                      className={cn(
                        "px-2 py-1 border text-[9px] font-black transition-all",
                        selectedId === id ? "border-white bg-white text-black scale-105 z-10" :
                        data.status === 'passed' ? "border-emerald-900/30 bg-emerald-500/5 text-emerald-600 hover:border-emerald-500" : 
                        "border-rose-900/40 bg-rose-950/20 text-rose-500 animate-pulse hover:border-rose-500"
                      )}
                    >
                        {id}
                    </button>
                ))}
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:divide-x divide-zinc-900 lg:grid-cols-12">
          
          <div className="lg:col-span-7 flex flex-col bg-black h-[700px]">
            <div className="px-4 py-3 border-b border-zinc-900 bg-zinc-950/50 flex justify-between items-center">
                <div className="flex items-center gap-2 text-zinc-500">
                    <ListTree size={12} />
                    <span className="text-[9px] font-black uppercase tracking-tighter">Deep_Step_Analysis: {selectedId}</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar bg-[linear-gradient(to_right,#111_1px,transparent_1px),linear-gradient(to_bottom,#111_1px,transparent_1px)] bg-[size:24px_24px]">
                {activeData ? (
                <div className="divide-y divide-zinc-900/50">
                    <div className="p-5 bg-zinc-950/90 backdrop-blur-md sticky top-0 z-10 border-b border-zinc-900">
                        <p className="text-[8px] text-emerald-500 font-black mb-1 tracking-widest">SCENARIO</p>
                        <p className="text-[12px] text-white font-black leading-tight">{activeData.title}</p>
                    </div>

                    {activeData.steps.map((step: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-4 p-4 hover:bg-emerald-500/[0.03] transition-colors group">
                        <div className="w-6 shrink-0 text-left text-[9px] font-black text-zinc-800 group-hover:text-zinc-700 tabular-nums pt-1">{String(idx + 1).padStart(2, '0')}</div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{step.command}</span>
                                <span className="text-[8px] font-bold text-zinc-700 tabular-nums bg-zinc-900 px-1">{step.duration}</span>
                            </div>
                            <p className="text-[11px] text-zinc-500 font-mono break-all leading-relaxed bg-black/40 p-1 border-l border-zinc-800">{cleanAnsi(step.arguments)}</p>
                        </div>
                        <div className={cn("mt-2 w-1.5 h-1.5 rotate-45 border border-black", step.status === 'failed' ? "bg-rose-500 shadow-[0_0_8px_#e11d48]" : "bg-zinc-800 group-hover:bg-emerald-500 transition-colors")} />
                    </div>
                    ))}
                </div>
                ) : <div className="h-full flex flex-col items-center justify-center opacity-20 text-[10px] font-black tracking-widest">SELECT_NODE_FOR_INSPECTION</div>}
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col bg-zinc-950/30 overflow-y-auto custom-scrollbar">
            
            {/* 1. FAULT OCCURRENCE (The requested graph) */}
            <div className="p-6 border-b border-zinc-900">
                <div className="flex items-center gap-2 mb-4">
                    <AlertOctagon size={14} className="text-rose-500" />
                    <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Fault_Occurrence_Matrix</span>
                </div>
                <div className="h-[150px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={graphData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#18181b" />
                            <XAxis dataKey="id" hide />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#4c0519', fontSize: 8}} />
                            <Tooltip contentStyle={{backgroundColor: '#000', border: '1px solid #4c0519'}} cursor={{fill: '#e11d4805'}} />
                            <Bar dataKey="failedSteps" minPointSize={2}>
                                {graphData.map((entry, index) => (
                                    <Cell key={index} fill={entry.failedSteps > 0 ? '#e11d48' : '#333'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 2. FAULT DENSITY */}
            <div className="p-6 border-b border-zinc-900">
                <div className="flex items-center gap-2 mb-4">
                    <AlertCircle size={14} className="text-rose-500 opacity-50" />
                    <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Step_Health_Ratio</span>
                </div>
                <div className="h-[150px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={graphData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#18181b" />
                            <XAxis dataKey="id" hide />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#27272a', fontSize: 8}} />
                            <Bar dataKey="passedSteps" stackId="a" fill="#10b981" fillOpacity={0.6} minPointSize={1} />
                            <Bar dataKey="failedSteps" stackId="a" fill="#e11d48" minPointSize={1} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 3. STEP COMPLEXITY */}
            <div className="p-6 border-b border-zinc-900">
                <div className="flex items-center gap-2 mb-4">
                    <Layers size={14} className="text-sky-500" />
                    <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Complexity_Flow</span>
                </div>
                <div className="h-[150px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={graphData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#18181b" />
                            <XAxis dataKey="id" hide />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#27272a', fontSize: 8}} />
                            <Bar dataKey="steps" minPointSize={2}>
                                {graphData.map((entry, index) => (
                                    <Cell key={index} fill={selectedId === entry.id ? '#0ea5e9' : '#333'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 4. LATENCY PROFILE */}
            <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Timer size={14} className="text-emerald-500" />
                    <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Latency_Profile</span>
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
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#18181b" />
                            <XAxis dataKey="id" hide />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#27272a', fontSize: 8}} />
                            <Area type="monotone" dataKey="duration" stroke="#10b981" fillOpacity={1} fill="url(#colorDur)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-px bg-zinc-900 border-t border-zinc-900 mt-auto">
                <div className="bg-black p-4">
                    <span className="text-[7px] font-black text-zinc-600 tracking-widest uppercase block mb-1">Avg_Complexity</span>
                    <span className="text-lg font-black text-white leading-none">{(tcRegistry.totalSteps / tcRegistry.total).toFixed(1)} <span className="text-[9px] text-zinc-700">S/TC</span></span>
                </div>
                <div className="bg-black p-4">
                    <span className="text-[7px] font-black text-zinc-600 tracking-widest uppercase block mb-1">Fault_Ratio</span>
                    <span className="text-lg font-black text-rose-500 leading-none">{((graphData.reduce((a, b) => a + b.failedSteps, 0) / Math.max(1, tcRegistry.totalSteps)) * 100).toFixed(1)}%</span>
                </div>
            </div>

          </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }: any) {
  return (
    <div className="p-4 flex flex-col items-center justify-center gap-1 group hover:bg-white/[0.02] transition-all cursor-default text-center">
      <span className="text-[7px] font-black text-zinc-600 uppercase tracking-widest group-hover:text-zinc-400">{label}</span>
      <span className={cn("text-xl font-black tabular-nums tracking-tighter leading-none", color)}>{value}</span>
    </div>
  )
}