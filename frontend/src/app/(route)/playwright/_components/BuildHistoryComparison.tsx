'use client';

import React, { useState, useEffect, useMemo } from "react";
import {
    getBuildDetails,
    getProjectBuildHistory
} from "@/lib/actions";
import {
    Loader2, Terminal, FileCode, History,
    ArrowUpRight, ArrowDownRight, LineChart as ChartIcon,
    Zap, Gauge, BarChart3
} from "lucide-react";
import {
    ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Cell
} from 'recharts';
import { cn } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";

export function BuildHistoryComparison({ projectId }: { projectId: number }) {
    const [depth, setDepth] = useState(5);
    const [comparisonData, setComparisonData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [focusedTestKey, setFocusedTestKey] = useState<string | null>(null);

    useEffect(() => {
        async function syncMatrix() {
            if (!projectId) return;
            setLoading(true);
            try {
                const historyResponse = await getProjectBuildHistory(projectId);
                if (historyResponse.success && historyResponse.builds.length > 0) {
                    const window = historyResponse.builds.slice(0, depth);
                    const detailedBuilds = await Promise.all(
                        window.map(async (b: any) => await getBuildDetails(b.id))
                    );
                    const validData = detailedBuilds.filter(b => b !== null);
                    setComparisonData(validData);
                    //@ts-ignore
                    if (!focusedTestKey && validData[0]?.results?.[0]?.tests?.[0]) {
                        //@ts-ignore
                        const first = validData[0].results[0];
                        setFocusedTestKey(`${first.specFile}::${first.tests[0].title}`);
                    }
                }
            } catch (error) { console.error(error); } finally { setLoading(false); }
        }
        syncMatrix();
    }, [projectId, depth]);

    const testMatrix = useMemo(() => {
        const matrix = new Map<string, any>();
        comparisonData.forEach((build, buildIdx) => {
            build?.results?.forEach((spec: any) => {
                const tests = typeof spec.tests === 'string' ? JSON.parse(spec.tests) : spec.tests;
                if (Array.isArray(tests)) {
                    tests.forEach((t: any) => {
                        const key = `${spec.specFile}::${t.title}`;
                        if (!matrix.has(key)) {
                            matrix.set(key, { title: t.title, spec: spec.specFile.split('/').pop(), runs: new Array(depth).fill(null) });
                        }
                        matrix.get(key).runs[buildIdx] = t;
                    });
                }
            });
        });
        return Array.from(matrix.values()).sort((a, b) => a.spec.localeCompare(b.spec));
    }, [comparisonData, depth]);

    // 1. COMPOSED GRAPH DATA (Bar + Curve)
    const focusedGraphData = useMemo(() => {
        if (!focusedTestKey) return [];
        const testEntry = testMatrix.find(t => `${t.spec}::${t.title}`.includes(focusedTestKey.split('::').pop() || ''));
        if (!testEntry) return [];

        return testEntry.runs.map((run: any, idx: number) => ({
            name: comparisonData[idx]?.id ? `#${comparisonData[idx].id}` : 'N/A',
            latency: run ? run.duration_ms : 0,
            color: ['passed', 'success'].includes(run?.status?.toLowerCase()) ? '#10b981' : '#e11d48'
        })).reverse();
    }, [focusedTestKey, testMatrix, comparisonData]);

    return (
        <div className="bg-black border border-zinc-900 rounded-none font-mono shadow-2xl overflow-hidden mt-8 select-none uppercase">

            {/* TOOLBAR */}
            <div className="px-6 py-4 border-b border-zinc-900 bg-zinc-950 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <Gauge size={14} className="text-white" />
                    <span className="text-[10px] font-black text-white tracking-[0.2em]">Cross_Build_Registry_Sync</span>
                </div>

                <div className="flex items-center gap-4">
                    <span className="text-[9px] font-black text-zinc-600 tracking-widest">Depth_Window:</span>
                    <div className="flex bg-zinc-900 border border-zinc-800 p-0.5">
                        {[1, 2, 3, 4, 5].map((v) => (
                            <button key={v} onClick={() => setDepth(v)}
                                className={cn("w-8 py-1 text-[10px] font-black transition-all border",
                                    depth === v ? "bg-white text-black border-white" : "text-zinc-600 border-transparent hover:text-zinc-300"
                                )}
                            > {v} </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* 2. COMPOSED PERFORMANCE ANALYZER (BAR + CURVE) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 border-b border-zinc-900 bg-zinc-950/10">
                <div className="lg:col-span-4 p-8 bg-zinc-950/40 border-r border-zinc-900">
                    <div className="space-y-1 mb-10">
                        <p className="text-[9px] font-black text-zinc-600 tracking-widest uppercase">Target_Node</p>
                        <h3 className="text-[13px] font-black text-white truncate max-w-full leading-relaxed">
                            {focusedTestKey?.split('::')[1] || 'PENDING_SELECTION'}
                        </h3>
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between items-end border-b border-zinc-800 pb-2">
                            <span className="text-[9px] font-black text-zinc-600">Delta_Sync</span>
                            <div className="flex items-center gap-2">
                                <BarChart3 size={12} className="text-zinc-500" />
                                <span className="text-xl font-black text-white tabular-nums tracking-tighter">ACTIVE</span>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-emerald-500 rotate-45" /><span className="text-[8px] font-bold text-zinc-500">Stable</span></div>
                            <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-rose-500 rotate-45" /><span className="text-[8px] font-bold text-zinc-500">Regress</span></div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-8 h-[250px] p-8 bg-black relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={focusedGraphData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#111" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#333', fontSize: 10 }} dy={10} />
                            <YAxis hide domain={['auto', 'auto']} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '0px' }}
                                itemStyle={{ fontSize: '11px', textTransform: 'uppercase' }}
                            />
                            {/* Performance Bars */}
                            <Bar dataKey="latency" barSize={30}>
                                {focusedGraphData.map(
                                    //@ts-ignore
                                    (entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.4} />
                                    ))}
                            </Bar>
                            {/* Improvement Curve */}
                            <Line type="monotone" dataKey="latency" stroke="#FFFFFF" strokeWidth={2} dot={{ fill: '#000', stroke: '#FFF', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 3. PERFORMANCE MATRIX */}
            <div className="relative overflow-x-auto custom-scrollbar">
                {loading && <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center font-black text-[11px] tracking-widest text-white animate-pulse">established_data_handshake...</div>}

                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-zinc-950 border-b border-zinc-900">
                            <th className="p-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest border-r border-zinc-900 sticky left-0 bg-zinc-950 z-20">Identity_Registry</th>
                            {comparisonData.map((b) => (
                                <th key={b.id} className="p-6 text-center border-r border-zinc-900 last:border-0 min-w-[150px]">
                                    <span className="text-[10px] font-black text-white tabular-nums">BUILD_#{b.id}</span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900">
                        {testMatrix.map((item, idx) => {
                            const isFocused = focusedTestKey === `${item.spec}::${item.title}`;
                            return (
                                <tr key={idx}
                                    onClick={() => setFocusedTestKey(`${item.spec}::${item.title}`)}
                                    className={cn(
                                        "transition-all group cursor-pointer border-l-4",
                                        isFocused ? "bg-zinc-900 border-l-white" : "hover:bg-zinc-950 border-l-transparent"
                                    )}
                                >
                                    <td className="p-6 border-r border-zinc-900 sticky left-0 bg-black group-hover:bg-[#0c0c0e] z-10 transition-colors">
                                        <div className="flex flex-col gap-1.5 text-left">
                                            <span className={cn("text-[12px] font-black uppercase transition-colors truncate max-w-[300px]", isFocused ? "text-white underline decoration-zinc-700 underline-offset-4" : "text-zinc-500 group-hover:text-zinc-200")}>
                                                {item.title}
                                            </span>
                                            <span className="text-[8px] text-zinc-700 font-bold flex items-center gap-1.5 tracking-tighter italic">
                                                <FileCode size={10} className="opacity-40" /> {item.spec}
                                            </span>
                                        </div>
                                    </td>

                                    {item.runs.map((test: any, runIdx: number) => (
                                        <td key={runIdx} className="p-6 border-r border-zinc-900 last:border-0 text-center">
                                            {test ? (
                                                <div className="flex flex-col items-center gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className={cn(
                                                            "w-1.5 h-1.5 rotate-45 transition-all duration-500",
                                                            ['passed', 'success'].includes(test.status?.toLowerCase())
                                                                ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                                                                : "bg-rose-500 shadow-[0_0_8px_rgba(225,29,72,0.4)]"
                                                        )} />
                                                        <span className="text-[11px] font-black text-white tabular-nums">{(test.duration_ms / 1000).toFixed(2)}s</span>
                                                    </div>
                                                    {item.runs[runIdx + 1] && <DeltaBadge curr={test.duration_ms} prev={item.runs[runIdx + 1].duration_ms} />}
                                                </div>
                                            ) : <span className="opacity-5 text-[8px] font-black italic">VOID</span>}
                                        </td>
                                    ))}
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function DeltaBadge({ curr, prev }: { curr: number, prev: number }) {
    const diff = curr - prev;
    const percent = Math.abs(Math.round((diff / prev) * 100));
    if (percent < 2) return <span className="text-[7px] text-zinc-800 font-black tracking-widest opacity-50">STABLE</span>;
    return (
        <div className={cn("flex items-center gap-0.5 text-[8px] font-black px-1.5 py-0.5 border",
            diff > 0 ? "text-rose-500 border-rose-500/20 bg-rose-500/5" : "text-emerald-500 border-emerald-500/20 bg-emerald-500/5")}>
            {diff > 0 ? <ArrowUpRight size={8} /> : <ArrowDownRight size={8} />} {percent}%
        </div>
    );
}