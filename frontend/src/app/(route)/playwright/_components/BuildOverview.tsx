'use client';

import React, { useMemo, useState } from "react";
import {
    Server, Cpu, Activity, Terminal, Timer, Search,
    ChevronRight, FileCode, Clock, Filter,
    TrendingDown, Shield, Zap, Bug, Layers, ListTree
} from "lucide-react";
import {
    BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie
} from 'recharts';
import { cn } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";

const cleanAnsi = (text: any): string => {
    if (!text || typeof text !== 'string') return String(text || '');
    return text.replace(/[\u001b\x1b]\[[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '').trim();
};

const formatDuration = (ms: number) => {
    if (ms <= 0) return "0s";
    if (ms < 1000) return `${ms}ms`;
    let totalSeconds = Math.floor(ms / 1000);
    let hours = Math.floor(totalSeconds / 3600);
    let minutes = Math.floor((totalSeconds % 3600) / 60);
    let seconds = totalSeconds % 60;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
};

export function BuildOverview({ buildId, buildData }: { buildId: any, buildData: any }) {
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all");

    if (!buildData) return null;

    const analysis = useMemo(() => {
        const s = { total: 0, passed: 0, failed: 0, flaky: 0, running: 0, durationSum: 0 };
        let slowest = { title: 'N/A', duration: 0, display: '0s', spec: 'N/A' };
        const uniqueProjects = new Set();

        const flattened = buildData.results?.flatMap((spec: any) => {
            const tests = Array.isArray(spec.tests) ? spec.tests : [];
            return tests.map((t: any, idx: number) => {
                const status = t.status?.toLowerCase();
                const runNum = Number(t.run_number) || 1;
                const ms = Number(t.duration_ms) || 0;

                s.total++;
                s.durationSum += ms;
                if (t.project) uniqueProjects.add(t.project);

                const isPassed = ['passed', 'success', 'expected'].includes(status);
                const isFailed = ['failed', 'error', 'fail'].includes(status);

                if (isPassed) {
                    if (runNum > 1) s.flaky++;
                    else s.passed++;
                } else if (isFailed) {
                    s.failed++;
                }

                const displayTime = formatDuration(ms);
                if (ms > slowest.duration) {
                    slowest = { title: t.title, duration: ms, display: displayTime, spec: spec.specFile?.split('/').pop() || 'Unknown' };
                }

                return {
                    ...t,
                    ms,
                    displayTime,
                    stepCount: t.steps?.length || 0, // 🟢 Capture step count
                    isP: isPassed && runNum === 1,
                    isF: isFailed || runNum > 1,
                    specName: spec.specFile?.split('/').pop() || 'Root',
                };
            });
        }) || [];

        const sorted = flattened.sort((a: any, b: any) => b.ms - a.ms);

        return {
            stats: s,
            allTests: sorted,
            slowestTest: slowest,
            avgTime: s.total > 0 ? (s.durationSum / s.total) : 0,
            projectCount: uniqueProjects.size
        };
    }, [buildData]);

    const { stats, allTests, slowestTest, avgTime, projectCount } = analysis;
    const stabilityIndex = stats.total > 0 ? Math.round(((stats.passed + stats.flaky) / stats.total) * 100) : 0;

    // 1. Chart Data for Performance (Latency)
    const performanceChartData = useMemo(() => {
        return allTests
            .filter((t: any) => {
                const match = t.title?.toLowerCase().includes(search.toLowerCase()) || t.specName?.toLowerCase().includes(search.toLowerCase());
                const s = t.status?.toLowerCase();
                if (filter === 'passed') return match && ['passed', 'success', 'expected'].includes(s);
                if (filter === 'failed') return match && ['failed', 'error', 'fail'].includes(s);
                return match;
            })
            //@ts-ignore
            .map(t => ({
                name: t.title,
                duration: parseFloat((t.ms / 1000).toFixed(2)),
                steps: t.stepCount, // Pass to tooltip
                color: t.isP ? '#10b981' : '#e11d48',
                fullData: t
            }));
    }, [allTests, search, filter]);

    return (
        <div className="bg-black border border-zinc-900 rounded-none font-mono shadow-2xl overflow-hidden selection:bg-emerald-500/30 space-y-[1px] bg-zinc-900">

            {/* HEADER */}
            <div className="px-6 py-3 border-b border-zinc-800 bg-zinc-950 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <Terminal size={14} className="text-emerald-500" />
                    <span className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Build_Intelligence_Protocol</span>
                </div>
                <StatusBadge status={buildData.status} />
            </div>

            {/* KPI STRIP */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-[1px] bg-zinc-900 border-b border-zinc-800">
                <KPIStat label="Automation ROI" value="75%" sub="Regression Fact" icon={<Shield size={14} />} color="emerald" />
                <KPIStat label="Test Pass Rate" value={`${stabilityIndex}%`} sub={`Workers: ${projectCount}`} icon={<Zap size={14} />} color="white" />
                <KPIStat label="Total Volume" value={stats.total} sub="Object Registry" icon={<Activity size={14} />} color="white" />
                <KPIStat label="Pipeline Sum" value={formatDuration(stats.durationSum)} sub="Cumulative Time" icon={<Clock size={14} />} color="white" />
                <KPIStat label="Failure Points" value={stats.failed} sub="Critical Anomalies" icon={<Bug size={14} />} color="rose" />
            </div>

            {/* ANALYTICS GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-zinc-900 border-b border-zinc-800 bg-zinc-950/10">
                <div className="lg:col-span-4 p-6 flex items-center gap-8 bg-emerald-500/[0.02]">
                    <div className="w-28 h-28 relative shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={[{ n: 'S', v: stats.passed, c: '#10b981' }, { n: 'F', v: stats.flaky, c: '#f59e0b' }, { n: 'E', v: stats.failed, c: '#e11d48' }].filter(x => x.v > 0)} innerRadius={35} outerRadius={46} paddingAngle={4} dataKey="v" stroke="none">
                                    { //@ts-ignore 
                                        (entry: any, index: number) => <Cell key={index} fill={entry.c} />
                                    }
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-xl font-black text-white tabular-nums">{stabilityIndex}%</span>
                            <span className="text-[7px] text-zinc-600 font-bold uppercase mt-1">Stability</span>
                        </div>
                    </div>
                    <div className="flex flex-col justify-center space-y-3 flex-1 overflow-hidden">
                        <LegendItem label="Optimal" value={stats.passed + stats.flaky} color="bg-emerald-500" />
                        <LegendItem label="Critical" value={stats.failed} color="bg-rose-500" />
                    </div>
                </div>

                <div className="lg:col-span-8 p-8 flex items-center gap-12 bg-zinc-950/20">
                    <div className="flex-1 space-y-6">
                        <SpecItem label="Avg_Exec_Time" value={formatDuration(avgTime)} color="text-white" />
                        <SpecItem label="Global_Scope" value={`${projectCount} Active_Workers`} color="text-zinc-400" />
                    </div>
                    <div className="flex-[2] space-y-1 border-l-2 border-rose-500/30 pl-4 bg-rose-500/[0.02] py-2">
                        <div className="flex justify-between items-start pr-4">
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2 text-rose-500 mb-1 font-black uppercase tracking-widest text-[9px]">
                                    <TrendingDown size={12} className="animate-pulse" /> Bottleneck_Detected
                                </div>
                                <span className="text-[11px] font-bold text-white uppercase truncate max-w-[280px]">{slowestTest.title}</span>
                            </div>
                            <div className="text-2xl font-black text-rose-500 tabular-nums">{slowestTest.display}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* SEARCH / FILTER TOOLBAR */}
            <div className="flex bg-zinc-950 border-b border-zinc-900 p-1 gap-1">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-700" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="FILTER_REGISTRY_OBJECTS..." className="w-full bg-black border border-zinc-800 p-2.5 pl-10 text-[10px] text-white focus:border-zinc-600 outline-none uppercase" />
                </div>
                <div className="flex bg-black border border-zinc-800 px-2 gap-2 items-center">
                    <FilterBtn active={filter === 'all'} label="ALL" onClick={() => setFilter('all')} />
                    <FilterBtn active={filter === 'failed'} label="CRITICAL" onClick={() => setFilter('failed')} />
                </div>
            </div>

            {/* --- GRAPHS SECTION: PERFORMANCE VS COMPLEXITY --- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 bg-zinc-900 gap-[1px]">

                {/* GRAPH 1: PERFORMANCE (TIME) */}
                <div className="bg-black p-6 space-y-6">
                    <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
                        <p className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                            <Activity size={14} className="text-emerald-500" /> Latency_Rank (Slowest to Fastest)
                        </p>
                    </div>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={performanceChartData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#111" />
                                <XAxis dataKey="name" hide />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#333', fontSize: 10, fontWeight: 900 }} />
                                <Tooltip
                                    cursor={{ fill: '#ffffff05' }}
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const d = payload[0].payload.fullData;
                                            return (
                                                <div className="bg-black border border-zinc-800 p-4 shadow-2xl font-mono min-w-[220px]">
                                                    <p className="text-[11px] font-bold text-white uppercase leading-relaxed mb-2">{d.title}</p>
                                                    <div className="flex justify-between items-center text-[10px] mt-1 border-t border-zinc-900 pt-2 text-zinc-500 uppercase">Latency: <span className="text-white font-black">{d.displayTime}</span></div>
                                                    <div className="flex justify-between items-center text-[10px] text-zinc-500 uppercase">Steps: <span className="text-white font-black">{d.stepCount}</span></div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Bar dataKey="duration">
                                    {performanceChartData.map(
                                        //@ts-ignore
                                        (entry, index) => <Cell key={index} fill={entry.color} fillOpacity={0.9} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* GRAPH 2: COMPLEXITY (STEPS) */}
                <div className="bg-black p-6 space-y-6 border-l border-zinc-800">
                    <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
                        <p className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                            <ListTree size={14} className="text-indigo-400" /> Complexity_Distribution (Steps per Test)
                        </p>
                    </div>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={performanceChartData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#111" />
                                <XAxis dataKey="name" hide />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#333', fontSize: 10, fontWeight: 900 }} />
                                <Tooltip cursor={{ fill: '#ffffff05' }} contentStyle={{ background: '#000', border: '1px solid #333' }} />
                                <Bar dataKey="steps" fill="#3f3f46" radius={[2, 2, 0, 0]}>
                                    {performanceChartData.map(
                                        //@ts-ignore
                                        (entry, index) => (
                                            <Cell
                                                key={index}
                                                fill={entry.color} // Using the same color logic to link performance to complexity
                                                fillOpacity={0.6}
                                            />
                                        ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* --- Internal Helpers (Maintain Style) --- */
function KPIStat({ label, value, sub, icon, color }: any) {
    const textColors: any = { emerald: 'text-emerald-500', rose: 'text-rose-500', white: 'text-white' };
    return (
        <div className="bg-black p-6 hover:bg-zinc-900 transition-all group">
            <div className="flex justify-between items-center mb-4">
                <div className="text-zinc-700 group-hover:text-white transition-colors">{icon}</div>
                <div className="w-1 h-1 bg-zinc-800 rotate-45 group-hover:bg-white transition-colors" />
            </div>
            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">{label}</p>
            <p className={cn("text-2xl font-black tabular-nums tracking-tighter", textColors[color])}>{value}</p>
            <p className="text-[8px] text-zinc-700 font-bold mt-3 uppercase tracking-tighter italic border-l border-zinc-800 pl-2">{sub}</p>
        </div>
    );
}

function LegendItem({ label, value, color }: any) {
    return (
        <div className="flex items-center justify-between border-b border-zinc-900 pb-1">
            <div className="flex items-center gap-2"><div className={cn("w-1 h-3", color)} /><span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">{label}</span></div>
            <span className="text-[10px] font-bold text-white tabular-nums">{value}</span>
        </div>
    );
}

function SpecItem({ label, value, color }: any) {
    return (
        <div className="space-y-1"><span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">{label}</span><p className={cn("text-xs font-bold uppercase tabular-nums", color)}>{value}</p></div>
    );
}

function DataRow({ label, count, color, border }: any) {
    return (
        <div className={cn("flex justify-between items-end pb-1", border ? "border-b border-zinc-800" : "")}>
            <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest leading-none">{label}</span>
            <span className={cn("text-xl font-black tabular-nums leading-none tracking-tighter", color)}>{count}</span>
        </div>
    );
}

function FilterBtn({ active, label, onClick }: any) {
    return (
        <button onClick={onClick} className={cn("px-3 py-1 text-[8px] font-black uppercase tracking-tighter transition-all", active ? "bg-white text-black" : "text-zinc-500 hover:text-zinc-300")}>{label}</button>
    );
}