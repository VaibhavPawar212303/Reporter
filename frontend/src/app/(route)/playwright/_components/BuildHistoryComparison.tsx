'use client';

import React, { useState, useEffect, useMemo } from "react";
import { useTheme } from "next-themes";
import {
    getBuildDetails,
    getProjectBuildHistory
} from "@/lib/actions";
import {
    FileCode,
    ArrowUpRight,
    ArrowDownRight,
    Gauge,
    BarChart3
} from "lucide-react";
import {
    ComposedChart,
    Bar,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from "recharts";
import { cn } from "@/lib/utils";

export function BuildHistoryComparison({ projectId }: { projectId: number }) {
    const { theme } = useTheme();
    const isDark = theme === "dark";

    const [depth, setDepth] = useState(5);
    const [comparisonData, setComparisonData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [focusedTestKey, setFocusedTestKey] = useState<string | null>(null);

    /* ----------------------------- data sync ----------------------------- */
    useEffect(() => {
        async function syncMatrix() {
            if (!projectId) return;
            setLoading(true);
            try {
                const history = await getProjectBuildHistory(projectId);
                if (history.success && history.builds.length > 0) {
                    const window = history.builds.slice(0, depth);
                    const detailed = await Promise.all(
                        window.map((b: any) => getBuildDetails(b.id))
                    );
                    const valid = detailed.filter(Boolean);
                    setComparisonData(valid);
                    //@ts-ignore
                    if (!focusedTestKey && valid[0]?.results?.[0]?.tests?.[0]) {
                        //@ts-ignore
                        const first = valid[0].results[0];
                        setFocusedTestKey(`${first.specFile}::${first.tests[0].title}`);
                    }
                }
            } finally {
                setLoading(false);
            }
        }
        syncMatrix();
    }, [projectId, depth]);

    /* ---------------------------- matrix build ---------------------------- */
    const testMatrix = useMemo(() => {
        const matrix = new Map<string, any>();

        comparisonData.forEach((build, buildIdx) => {
            build?.results?.forEach((spec: any) => {
                const tests = typeof spec.tests === "string"
                    ? JSON.parse(spec.tests)
                    : spec.tests;

                tests?.forEach((t: any) => {
                    const key = `${spec.specFile}::${t.title}`;
                    if (!matrix.has(key)) {
                        matrix.set(key, {
                            title: t.title,
                            spec: spec.specFile.split("/").pop(),
                            runs: new Array(depth).fill(null)
                        });
                    }
                    matrix.get(key).runs[buildIdx] = t;
                });
            });
        });

        return Array.from(matrix.values()).sort((a, b) =>
            a.spec.localeCompare(b.spec)
        );
    }, [comparisonData, depth]);

    /* ---------------------------- chart data ----------------------------- */
    const graphData = useMemo(() => {
        if (!focusedTestKey) return [];
        const entry = testMatrix.find(t =>
            `${t.spec}::${t.title}` === focusedTestKey
        );
        if (!entry) return [];

        return entry.runs.map((run: any, i: number) => ({
            name: comparisonData[i]?.id ? `#${comparisonData[i].id}` : "N/A",
            latency: run?.duration_ms ?? 0,
            color: ["passed", "success"].includes(run?.status?.toLowerCase())
                ? "#10b981"
                : "#e11d48"
        })).reverse();
    }, [focusedTestKey, testMatrix, comparisonData]);

    /* ---------------------------- chart colors ---------------------------- */
    const gridColor = isDark ? "#27272a" : "#e4e4e7";
    const axisColor = isDark ? "#71717a" : "#52525b";
    const lineColor = isDark ? "#ffffff" : "#09090b";

    return (
        <div className="bg-background border border-border font-mono shadow-2xl overflow-hidden mt-8 uppercase">

            {/* TOOLBAR */}
            <div className="px-6 py-4 border-b border-border bg-card flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <Gauge size={14} className="text-foreground" />
                    <span className="text-[10px] font-black tracking-[0.2em] text-foreground">
                        Cross_Build_Registry_Sync
                    </span>
                </div>

                <div className="flex items-center gap-4">
                    <span className="text-[9px] font-black tracking-widest text-muted-foreground">
                        Depth_Window:
                    </span>
                    <div className="flex bg-muted border border-border p-0.5">
                        {[1, 2, 3, 4, 5].map(v => (
                            <button
                                key={v}
                                onClick={() => setDepth(v)}
                                className={cn(
                                    "w-8 py-1 text-[10px] font-black border transition-all",
                                    depth === v
                                        ? "bg-foreground text-background border-foreground"
                                        : "text-muted-foreground border-transparent hover:text-foreground"
                                )}
                            >
                                {v}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* CHART */}
            <div className="grid grid-cols-1 lg:grid-cols-12 border-b border-border">
                <div className="lg:col-span-4 p-8 bg-muted/30 border-r border-border">
                    <p className="text-[9px] font-black tracking-widest text-muted-foreground">
                        Target_Node
                    </p>
                    <h3 className="text-[13px] font-black text-foreground truncate mt-1">
                        {focusedTestKey?.split("::")[1] || "PENDING_SELECTION"}
                    </h3>
                </div>

                <div className="lg:col-span-8 h-[250px] p-8 bg-background">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={graphData}>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                vertical={false}
                                stroke={gridColor}
                            />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: axisColor, fontSize: 10 }}
                            />
                            <YAxis hide />
                            <Tooltip
                                content={({ active, payload }) => {
                                    if (!active || !payload?.length) return null;
                                    return (
                                        <div className="bg-background border border-border p-3 shadow-xl">
                                            <div className="text-[11px] font-black text-foreground">
                                                {payload[0].value} ms
                                            </div>
                                        </div>
                                    );
                                }}
                            />
                            <Bar dataKey="latency" barSize={30}>

                                {graphData.map(
                                    //@ts-ignore
                                    (e, i) => (
                                        <Cell key={i} fill={e.color} fillOpacity={0.4} />
                                    ))}
                            </Bar>
                            <Line
                                type="monotone"
                                dataKey="latency"
                                stroke={lineColor}
                                strokeWidth={2}
                                dot={{ r: 4, stroke: lineColor, fill: "transparent" }}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* MATRIX */}
            <div className="relative overflow-x-auto">
                {loading && (
                    <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur flex items-center justify-center text-[11px] font-black tracking-widest text-foreground animate-pulse">
                        established_data_handshake...
                    </div>
                )}

                <table className="w-full border-collapse">
                    <tbody>
                        {testMatrix.map((item, idx) => {
                            const focused = focusedTestKey === `${item.spec}::${item.title}`;
                            return (
                                <tr
                                    key={idx}
                                    onClick={() =>
                                        setFocusedTestKey(`${item.spec}::${item.title}`)
                                    }
                                    className={cn(
                                        "cursor-pointer border-l-4 transition-colors",
                                        focused
                                            ? "border-l-foreground bg-muted"
                                            : "border-l-transparent hover:bg-muted/50"
                                    )}
                                >
                                    <td className="p-6 border-r border-border sticky left-0 bg-background">
                                        <span className="text-[12px] font-black text-foreground truncate block">
                                            {item.title}
                                        </span>
                                        <span className="text-[8px] text-muted-foreground flex items-center gap-1">
                                            <FileCode size={10} /> {item.spec}
                                        </span>
                                    </td>

                                    {item.runs.map((test: any, i: number) => (
                                        <td key={i} className="p-6 text-center border-r border-border">
                                            {test ? (
                                                <div className="flex flex-col items-center gap-2">
                                                    <span className="text-[11px] font-black text-foreground">
                                                        {(test.duration_ms / 1000).toFixed(2)}s
                                                    </span>
                                                    {item.runs[i + 1] && (
                                                        <DeltaBadge
                                                            curr={test.duration_ms}
                                                            prev={item.runs[i + 1].duration_ms}
                                                        />
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="opacity-10 text-[8px]">VOID</span>
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/* ----------------------------- delta badge ----------------------------- */
function DeltaBadge({ curr, prev }: { curr: number; prev: number }) {
    const diff = curr - prev;
    const pct = Math.abs(Math.round((diff / prev) * 100));
    if (pct < 2) {
        return (
            <span className="text-[7px] font-black tracking-widest text-muted-foreground">
                STABLE
            </span>
        );
    }

    const up = diff > 0;
    return (
        <div
            className={cn(
                "flex items-center gap-0.5 text-[8px] font-black px-1.5 py-0.5 border",
                up
                    ? "text-rose-500 border-rose-500/20 bg-rose-500/5"
                    : "text-emerald-500 border-emerald-500/20 bg-emerald-500/5"
            )}
        >
            {up ? <ArrowUpRight size={8} /> : <ArrowDownRight size={8} />}
            {pct}%
        </div>
    );
}
