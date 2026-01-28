'use client';

import React, { useMemo, useState } from "react";
import {
    Server, Cpu, Activity, Terminal, Timer, Search,
    ChevronRight, Clock, Filter, TrendingDown,
    Shield, Zap, Bug
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

/**
 * Professional Duration Formatter
 * Corrects "734m" into "12h 14m 13s"
 */
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

        buildData.results?.forEach((spec: any) => {
            const tests = Array.isArray(spec.tests) ? spec.tests : [];
            tests.forEach((t: any) => {
                const status = t.status?.toLowerCase();
                const runNum = Number(t.run_number) || 1;
                const ms = Number(t.duration_ms) || 0;

                s.total++;
                s.durationSum += ms; // Cumulative sum of all tests

                const isPassed = ['passed', 'success', 'expected'].includes(status);
                const isFailed = ['failed', 'error', 'fail'].includes(status);

                if (isPassed) {
                    if (runNum > 1) s.flaky++;
                    else s.passed++;
                } else if (isFailed) {
                    s.failed++;
                }

                if (ms > slowest.duration) {
                    slowest = {
                        title: t.title,
                        duration: ms,
                        display: formatDuration(ms),
                        spec: spec.specFile?.split('/').pop() || 'Unknown'
                    };
                }
            });
        });

        const flattened = buildData.results?.flatMap((spec: any) => {
            const tests = Array.isArray(spec.tests) ? spec.tests : [];
            //@ts-ignore
            return tests.map(t => ({
                ...t,
                ms: Number(t.duration_ms) || 0,
                displayTime: formatDuration(Number(t.duration_ms) || 0),
                isP: ['passed', 'success', 'expected'].includes(t.status?.toLowerCase()) && (t.run_number || 1) === 1,
                specName: spec.specFile?.split('/').pop()
            }));
        }).sort((a: any, b: any) => b.ms - a.ms);

        return {
            stats: s,
            allTests: flattened,
            slowestTest: slowest,
            avgTime: s.total > 0 ? (s.durationSum / s.total) : 0
        };
    }, [buildData]);

    const { stats, allTests, slowestTest, avgTime } = analysis;
    const stabilityIndex = stats.total > 0 ? Math.round(((stats.passed + stats.flaky) / stats.total) * 100) : 0;
    const flakyRate = stats.total > 0 ? Math.round((stats.flaky / stats.total) * 100) : 0;

    const stabilityChartData = [
        { name: 'Stable', value: stats.passed, color: '#10b981' },
        { name: 'Flaky', value: stats.flaky, color: '#f59e0b' },
        { name: 'Failed', value: stats.failed, color: '#e11d48' },
    ].filter(d => d.value > 0);

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
                color: t.isP ? '#10b981' : '#e11d48',
                fullData: t
            }));
    }, [allTests, search, filter]);

    return (
        <div className="bg-black border border-zinc-900 rounded-none font-mono shadow-2xl overflow-hidden selection:bg-emerald-500/30">

            {/* HEADER */}
            <div className="px-6 py-3 border-b border-zinc-800 bg-zinc-950 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <Terminal size={14} className="text-emerald-500" />
                    <span className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Build_Intelligence_Protocol</span>
                </div>
                <StatusBadge status={buildData.status} />
            </div>

            {/* KPI STRIP */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[1px] bg-zinc-900 border-b border-zinc-800">
                <KPIStat label="Automation Coverage" value="75%" sub="Regression Fact" icon={<Shield size={14} />} color="emerald" />
                <KPIStat label="Test Pass Rate" value={`${stabilityIndex}%`} sub={`Flakiness: ${flakyRate}%`} icon={<Zap size={14} />} color="white" />
                <KPIStat label="Automation Growth" value="+12.5%" sub="W/W Velocity" icon={<Activity size={14} />} color="white" />
                <KPIStat label="Defect Detection" value="94%" sub="Feature Quality" icon={<Bug size={14} />} color="rose" />
            </div>

            {/* ANALYTICS GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-zinc-900 border-b border-zinc-800 bg-zinc-950/10">

                {/* STABILITY DONUT */}
                <div className="lg:col-span-4 p-6 flex items-center gap-8 bg-emerald-500/[0.02]">
                    <div className="w-28 h-28 relative shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={stabilityChartData} innerRadius={35} outerRadius={46} paddingAngle={4} dataKey="value" stroke="none">
                                    {stabilityChartData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className={cn("text-xl font-black tabular-nums text-white leading-none", stabilityIndex < 50 ? "text-rose-500" : "text-emerald-500")}>{stabilityIndex}%</span>
                            <span className="text-[7px] text-zinc-600 font-bold uppercase mt-1 tracking-tighter">Stability</span>
                        </div>
                    </div>
                    <div className="flex flex-col justify-center space-y-3 flex-1 overflow-hidden">
                        <LegendItem label="Full_Pass" value={stats.passed + stats.flaky} color="bg-emerald-500" />
                        <LegendItem label="Failed" value={stats.failed} color="bg-rose-500" />
                    </div>
                </div>

                {/* MIDDLE SPECS: TIME FOCUS */}
                <div className="lg:col-span-5 p-8">
                    <div className="grid grid-cols-2 gap-y-10 gap-x-12">
                        <SpecItem label="Avg_Exec_Time" value={formatDuration(avgTime)} color="text-white" />
                        <SpecItem label="Pipeline_Duration" value={formatDuration(stats.durationSum)} color="text-white" />

                        <div className="space-y-1 border-l-2 border-rose-500/30 pl-4 bg-rose-500/[0.02] py-2 col-span-2">
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

                {/* COUNTERS (RIGHT) */}
                <div className="lg:col-span-3 p-8 flex flex-col justify-center space-y-4 bg-zinc-950/20">
                    <DataRow label="TOTAL_REGISTRY" count={stats.total} color="text-white" />
                    <DataRow label="FULL_PASS_TOTAL" count={stats.passed + stats.flaky} color="text-emerald-500" border />
                    <DataRow label="FAILURE_TOTAL" count={stats.failed} color={stats.failed > 0 ? "text-rose-500" : "text-zinc-700"} />
                </div>
            </div>

            {/* PERFORMANCE BAR CHART */}
            <div className="p-8 bg-black">
                <div className="flex items-center justify-between mb-8 border-b border-zinc-900 pb-4">
                    <p className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                        <Activity size={14} className="text-emerald-500" /> Performance_Execution_Flow
                    </p>
                    <div className="flex bg-zinc-900 border border-zinc-800 p-0.5">
                        <FilterBtn active={filter === 'all'} label="FULL" onClick={() => setFilter('all')} />
                        <FilterBtn active={filter === 'failed'} label="FAILURES" onClick={() => setFilter('failed')} />
                    </div>
                </div>

                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={performanceChartData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#111111" />
                            <XAxis dataKey="name" hide />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#3f3f46', fontSize: 10, fontWeight: 900 }} />
                            <Tooltip
                                cursor={{ fill: '#ffffff05' }}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const d = payload[0].payload.fullData;
                                        return (
                                            <div className="bg-black border border-zinc-800 p-4 shadow-2xl font-mono min-w-[220px]">
                                                <p className="text-[11px] font-bold text-white uppercase leading-relaxed mb-3">{d.title}</p>
                                                <div className="flex justify-between items-center text-[10px] mt-1 border-t border-zinc-900 pt-2"><span className="text-zinc-500 uppercase">Latency</span><span className="text-white font-black tabular-nums">{d.displayTime}</span></div>
                                                <div className="flex justify-between items-center text-[10px] mt-1"><span className="text-zinc-500 uppercase">Status</span><span className={cn("font-black uppercase", d.isP ? "text-emerald-500" : "text-rose-500")}>{d.status}</span></div>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Bar dataKey="duration">

                                {performanceChartData.map(
                                    //@ts-ignore
                                    (entry, index) => <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.9} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}

/* --- Internal Helpers (Maintain UI) --- */
function KPIStat({ label, value, sub, icon, color }: any) {
    const textColors: any = { emerald: 'text-emerald-500', rose: 'text-rose-500', white: 'text-white' };
    return (
        <div className="bg-black p-6 hover:bg-zinc-900 transition-all group">
            <div className="flex justify-between items-center mb-4">
                <div className="text-zinc-700 group-hover:text-white transition-colors">{icon}</div>
                <div className="w-1.5 h-1.5 bg-zinc-800 rotate-45 group-hover:bg-white transition-colors" />
            </div>
            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">{label}</p>
            <p className={cn("text-3xl font-black tabular-nums tracking-tighter", textColors[color])}>{value}</p>
            <p className="text-[8px] text-zinc-700 font-bold mt-3 uppercase tracking-tighter italic border-l border-zinc-800 pl-2">{sub}</p>
        </div>
    );
}

function LegendItem({ label, value, color }: any) {
    return (
        <div className="flex items-center justify-between border-b border-zinc-900 pb-1">
            <div className="flex items-center gap-2">
                <div className={cn("w-1 h-3", color)} />
                <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">{label}</span>
            </div>
            <span className="text-[10px] font-bold text-white tabular-nums">{value}</span>
        </div>
    );
}

function SpecItem({ label, value, color }: any) {
    return (
        <div className="space-y-1">
            <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">{label}</span>
            <p className={cn("text-xs font-bold uppercase tabular-nums", color)}>{value}</p>
        </div>
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