'use client';

import React, { useMemo, useState, useEffect } from "react";
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
import { BuildHistoryComparison } from "./BuildHistoryComparison";
import { useTheme } from "next-themes";

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

export function BuildOverview({ buildId, buildData, historyData = [] }: { buildId: any, buildData: any, historyData?: any[] }) {
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all");
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    const isDark = theme === 'dark';
    const gridColor = isDark ? "#27272a" : "#e4e4e7";
    const tooltipBg = isDark ? "#000000" : "#ffffff";

    const analysis = useMemo(() => {
        if (!buildData) return null;
        const s = { total: 0, passed: 0, failed: 0, flaky: 0, running: 0, durationSum: 0 };
        let slowest = { title: 'N/A', duration: 0, display: '0s', spec: 'N/A' };
        const uniqueProjects = new Set();

        const flattened = buildData.results?.flatMap((spec: any) => {
            const tests = Array.isArray(spec.tests) ? spec.tests : [];
            return tests.map((t: any) => {
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
                    stepCount: t.steps?.length || 0,
                    isP: isPassed && runNum === 1,
                    isF: isFailed || runNum > 1,
                    specName: spec.specFile?.split('/').pop() || 'Root',
                };
            });
        }) || [];

        return {
            stats: s,
            allTests: flattened.sort((a: any, b: any) => b.ms - a.ms),
            slowestTest: slowest,
            avgTime: s.total > 0 ? (s.durationSum / s.total) : 0,
            projectCount: uniqueProjects.size
        };
    }, [buildData]);

    const performanceChartData = useMemo(() => {
        if (!analysis) return [];
        return analysis.allTests
            .filter((t: any) => {
                const match = t.title?.toLowerCase().includes(search.toLowerCase()) || t.specName?.toLowerCase().includes(search.toLowerCase());
                const s = t.status?.toLowerCase();
                if (filter === 'passed') return match && ['passed', 'success', 'expected'].includes(s);
                if (filter === 'failed') return match && ['failed', 'error', 'fail'].includes(s);
                return match;
            })//@ts-ignore
            .map(t => ({
                name: t.title,
                duration: parseFloat((t.ms / 1000).toFixed(2)),
                steps: t.stepCount,
                color: t.isP ? '#10b981' : '#e11d48',
                fullData: t
            }));
    }, [analysis, search, filter]);

    if (!buildData || !analysis || !mounted) return null;

    const { stats, slowestTest, avgTime, projectCount } = analysis;
    const stabilityIndex = stats.total > 0 ? Math.round(((stats.passed + stats.flaky) / stats.total) * 100) : 0;

    return (
        <div className="space-y-6 transition-colors duration-300">
            <div className="bg-background border border-border rounded-none font-mono shadow-2xl overflow-hidden selection:bg-emerald-500/30">

                {/* HEADER */}
                <div className="px-6 py-3 border-b border-border bg-card/50 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Terminal size={14} className="text-emerald-600 dark:text-emerald-500" />
                        <span className="text-[10px] font-black text-foreground uppercase tracking-[0.3em]">Build_Intelligence_Protocol</span>
                    </div>
                    <StatusBadge status={buildData.status} />
                </div>

                {/* KPI STRIP */}
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-px bg-border border-b border-border">
                    <KPIStat label="Automation ROI" value="75%" sub="Regression Fact" icon={<Shield size={14} />} color="emerald" />
                    <KPIStat label="Test Pass Rate" value={`${stabilityIndex}%`} sub={`Workers: ${projectCount}`} icon={<Zap size={14} />} color="foreground" />
                    <KPIStat label="Total Volume" value={stats.total} sub="Object Registry" icon={<Activity size={14} />} color="foreground" />
                    <KPIStat label="Pipeline Sum" value={formatDuration(stats.durationSum)} sub="Cumulative Time" icon={<Clock size={14} />} color="foreground" />
                    <KPIStat label="Failure Points" value={stats.failed} sub="Critical Anomalies" icon={<Bug size={14} />} color="rose" />
                </div>

                {/* ANALYTICS GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-border border-b border-border">
                    <div className="lg:col-span-4 p-6 flex items-center gap-8 bg-emerald-500/[0.03]">
                        <div className="w-28 h-28 relative shrink-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={[
                                            { n: 'S', v: stats.passed, c: '#10b990' },
                                            { n: 'F', v: stats.flaky, c: '#f59e0b' },
                                            { n: 'E', v: stats.failed, c: '#e11d48' }
                                        ].filter(x => x.v > 0)}
                                        innerRadius={35} outerRadius={46} paddingAngle={4} dataKey="v" stroke="none"
                                    >
                                        {//@ts-ignore
                                            (entry: any, index: number) => <Cell key={index} fill={entry.c} />}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-xl font-black tabular-nums text-foreground leading-none">{stabilityIndex}%</span>
                                <span className="text-[7px] text-muted font-bold uppercase mt-1">Stability</span>
                            </div>
                        </div>
                        <div className="flex flex-col justify-center space-y-3 flex-1 overflow-hidden">
                            <LegendItem label="Optimal" value={stats.passed + stats.flaky} color="bg-emerald-500" />
                            <LegendItem label="Critical" value={stats.failed} color="bg-rose-500" />
                        </div>
                    </div>

                    <div className="lg:col-span-8 p-8 flex flex-col md:flex-row items-center gap-12 bg-card/20">
                        <div className="flex-1 w-full space-y-6">
                            <SpecItem label="Avg_Exec_Time" value={formatDuration(avgTime)} color="text-foreground" />
                            <SpecItem label="Global_Scope" value={`${projectCount} Active_Workers`} color="text-muted" />
                        </div>
                        <div className="flex-[2] w-full space-y-1 border-l-2 border-rose-500/30 pl-4 bg-rose-500/[0.03] py-2">
                            <div className="flex justify-between items-start pr-4">
                                <div className="flex flex-col overflow-hidden">
                                    <div className="flex items-center gap-2 text-rose-600 dark:text-rose-500 mb-1 font-black uppercase tracking-widest text-[9px]">
                                        <TrendingDown size={12} className="animate-pulse" /> Bottleneck_Detected
                                    </div>
                                    <span className="text-[11px] font-bold text-foreground uppercase truncate max-w-[280px]">{slowestTest.title}</span>
                                </div>
                                <div className="text-2xl font-black text-rose-600 dark:text-rose-500 tabular-nums">{slowestTest.display}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* SEARCH / FILTER TOOLBAR */}
                <div className="flex flex-col sm:flex-row bg-card border-b border-border p-1 gap-1">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="FILTER_REGISTRY_OBJECTS..."
                            className="w-full bg-background border border-border p-2.5 pl-10 text-[10px] text-foreground focus:border-muted outline-none uppercase placeholder:text-muted/50"
                        />
                    </div>
                    <div className="flex bg-background border border-border px-2 gap-2 items-center">
                        <FilterBtn active={filter === 'all'} label="ALL" onClick={() => setFilter('all')} />
                        <FilterBtn active={filter === 'failed'} label="CRITICAL" onClick={() => setFilter('failed')} />
                    </div>
                </div>

                {/* GRAPHS SECTION */}
                <div className="grid grid-cols-1 lg:grid-cols-2 bg-border gap-px">
                    <div className="bg-background p-6 space-y-6">
                        <p className="text-[10px] font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                            <Activity size={14} className="text-emerald-600 dark:text-emerald-500" /> Latency_Rank
                        </p>
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={performanceChartData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                                    <XAxis dataKey="name" hide />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 10, fontWeight: 900 }} />
                                    <Tooltip
                                        cursor={{ fill: 'var(--muted)', opacity: 0.1 }}
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const d = payload[0].payload.fullData;
                                                return (
                                                    <div className="bg-background border border-border p-4 shadow-2xl font-mono min-w-[220px]">
                                                        <p className="text-[11px] font-bold text-foreground uppercase leading-relaxed mb-2">{d.title}</p>
                                                        <div className="flex justify-between items-center text-[10px] mt-1 border-t border-border pt-2 text-muted uppercase">Latency: <span className="text-foreground font-black">{d.displayTime}</span></div>
                                                        <div className="flex justify-between items-center text-[10px] text-muted uppercase">Steps: <span className="text-foreground font-black">{d.stepCount}</span></div>
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

                    <div className="bg-background p-6 space-y-6">
                        <p className="text-[10px] font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                            <ListTree size={14} className="text-indigo-600 dark:text-indigo-400" /> Complexity_Distribution
                        </p>
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={performanceChartData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                                    <XAxis dataKey="name" hide />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 10, fontWeight: 900 }} />
                                    <Bar dataKey="steps" fill="#3f3f46" radius={[2, 2, 0, 0]}>
                                        {performanceChartData.map(
                                            //@ts-ignore
                                            (entry, index) => <Cell key={index} fill={entry.color} fillOpacity={0.6} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <BuildHistoryComparison projectId={buildData.projectId}
                    //@ts-ignore
                    builds={historyData} />
            </section>
        </div>
    );
}

function KPIStat({ label, value, sub, icon, color }: any) {
    const textColors: any = {
        emerald: 'text-emerald-600 dark:text-emerald-500',
        rose: 'text-rose-600 dark:text-rose-500',
        foreground: 'text-foreground'
    };
    return (
        <div className="bg-background p-6 hover:bg-card transition-all group">
            <div className="flex justify-between items-center mb-4">
                <div className="text-muted group-hover:text-foreground transition-colors">{icon}</div>
                <div className="w-1 h-1 bg-border rotate-45 group-hover:bg-foreground transition-colors" />
            </div>
            <p className="text-[9px] font-black text-muted uppercase tracking-widest mb-1">{label}</p>
            <p className={cn("text-2xl font-black tabular-nums tracking-tighter leading-none", textColors[color])}>{value}</p>
            <p className="text-[8px] text-muted font-bold mt-3 uppercase tracking-tighter border-l border-border pl-2">{sub}</p>
        </div>
    );
}

function LegendItem({ label, value, color }: any) {
    return (
        <div className="flex items-center justify-between border-b border-border pb-1">
            <div className="flex items-center gap-2">
                <div className={cn("w-1 h-3", color)} />
                <span className="text-[8px] font-black text-muted uppercase tracking-widest">{label}</span>
            </div>
            <span className="text-[10px] font-bold text-foreground tabular-nums">{value}</span>
        </div>
    );
}

function SpecItem({ label, value, color }: any) {
    return (
        <div className="space-y-1">
            <span className="text-[9px] font-black text-muted uppercase tracking-widest">{label}</span>
            <p className={cn("text-xs font-bold uppercase tabular-nums", color)}>{value}</p>
        </div>
    );
}

function FilterBtn({ active, label, onClick }: any) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "px-3 py-1 text-[8px] font-black uppercase tracking-tighter transition-all",
                active ? "bg-foreground text-background" : "text-muted hover:text-foreground"
            )}
        >
            {label}
        </button>
    );
}