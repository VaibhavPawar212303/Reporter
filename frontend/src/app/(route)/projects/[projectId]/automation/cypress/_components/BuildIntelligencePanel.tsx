'use client';
import React, { useState, useRef, useCallback, useEffect } from "react";
import { Sparkles, BrainCircuit, AlertTriangle, Terminal, Activity, CheckCircle2, Loader2, RefreshCw, AlertCircle, Play, Radio, Zap, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface BuildData {
    environment?: string;
    results?: Array<{
        tests: Array<{
            title: string;
            status: string;
            error?: { message?: string } | string;
        }>;
    }>;
}

interface Report {
    summary: string;
    rootCause: string;
    recommendation: string;
    hotspots: string[];
}

interface BuildIntelligencePanelProps {
    buildId: string | number;
    buildData: BuildData;
}

const CONFIG = {
    API_URL: "https://ancient-remains-calibration-forget.trycloudflare.com",
    API_KEY: "pk_live_3c827b877ba64352a4f956fe331a21efN",
    MODEL_NAME: "Phi3.5:latest"
};

export function BuildIntelligencePanel({ buildId, buildData }: BuildIntelligencePanelProps) {
    const [loading, setLoading] = useState(false);
    const [streaming, setStreaming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [report, setReport] = useState<Report | null>(null);
    const [streamText, setStreamText] = useState<string>("");
    const [tokensReceived, setTokensReceived] = useState(0);
    const abortControllerRef = useRef<AbortController | null>(null);

    const parseAndSetReport = useCallback((aiText: string, failures: any[]) => {
        const summaryMatch = aiText.match(/SUMMARY:\s*([\s\S]*?)(?=ROOT_CAUSE:|$)/i);
        const rootCauseMatch = aiText.match(/ROOT_CAUSE:\s*([\s\S]*?)(?=RECOMMENDATION:|$)/i);
        const recommendationMatch = aiText.match(/RECOMMENDATION:\s*([\s\S]*?)$/i);

        setReport({
            summary: summaryMatch?.[1]?.trim() || "Analysis complete. See details below.",
            rootCause: rootCauseMatch?.[1]?.trim() || aiText,
            recommendation: recommendationMatch?.[1]?.trim() || "Review the test failures and check environment configuration.",
            hotspots: failures.map((f: any) => f.spec).slice(0, 5)
        });
    }, []);

    const generateReport = async () => {
        if (!buildData) return;
        if (abortControllerRef.current) abortControllerRef.current.abort();

        setLoading(true);
        setStreaming(false);
        setError(null);
        setStreamText("");
        setReport(null);
        setTokensReceived(0);

        try {
            const failures = buildData.results
                ?.flatMap((res) => res.tests)
                ?.filter((t) => t.status === 'failed')
                ?.map((t) => ({
                    spec: t.title,
                    error: typeof t.error === 'object' ? t.error?.message : t.error
                })) || [];

            if (failures.length === 0) {
                setReport({
                    summary: "All tests passed! No failures detected.",
                    rootCause: "N/A - No failures to analyze",
                    recommendation: "Continue monitoring for regressions.",
                    hotspots: []
                });
                setLoading(false);
                return;
            }

            const promptText = `Analyze Cypress Build #${buildId}. Env: ${buildData.environment || 'N/A'}. Failed: ${failures.length}. Details: ${JSON.stringify(failures.slice(0, 10))}. Format: SUMMARY:, ROOT_CAUSE:, RECOMMENDATION:`.trim();

            abortControllerRef.current = new AbortController();
            const response = await fetch(`${CONFIG.API_URL}/cypress`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-api-key": CONFIG.API_KEY },
                body: JSON.stringify({ prompt: promptText, stream: true }),
                signal: abortControllerRef.current.signal
            });

            if (!response.ok) throw new Error(`API Error: ${response.status}`);

            const contentType = response.headers.get('content-type');
            if (contentType?.includes('text/event-stream')) {
                setLoading(false);
                setStreaming(true);
                const reader = response.body?.getReader();
                const decoder = new TextDecoder();
                let fullText = "";
                let tokenCount = 0;
                if (!reader) throw new Error("No response body");

                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        const chunk = decoder.decode(value, { stream: true });
                        const lines = chunk.split('\n');
                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                try {
                                    const jsonStr = line.slice(6).trim();
                                    const data = JSON.parse(jsonStr);
                                    if (data.token) {
                                        fullText += data.token;
                                        tokenCount++;
                                        setStreamText(fullText);
                                        setTokensReceived(tokenCount);
                                    }
                                    if (data.done || data.type === 'complete') {
                                        parseAndSetReport(fullText, failures);
                                        setStreaming(false);
                                    }
                                } catch (e) {}
                            }
                        }
                    }
                } finally { reader.releaseLock(); }
            } else {
                const data = await response.json();
                parseAndSetReport(data.analysis || data.response, failures);
                setLoading(false);
            }
        } catch (err: any) {
            if (err.name !== 'AbortError') setError(err.message);
            setLoading(false);
            setStreaming(false);
        }
    };

    const cancelStream = () => {
        if (abortControllerRef.current) abortControllerRef.current.abort();
        setLoading(false);
        setStreaming(false);
    };

    return (
        <div className="bg-card border border-border rounded-none overflow-hidden shadow-sm font-mono mb-6 transition-colors duration-300">
            {/* Toolbar */}
            <div className="px-6 py-3 border-b border-border bg-muted/5 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <BrainCircuit className="w-4 h-4 text-indigo-500" />
                    <span className="text-[10px] font-black text-foreground uppercase tracking-[0.2em]">
                        Build Intelligence Insights
                    </span>
                    {streaming && (
                        <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-500 uppercase animate-pulse">
                            <Radio size={10} /> Live
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    {(loading || streaming) && (
                        <button onClick={cancelStream} className="text-[9px] font-bold text-rose-500 hover:text-rose-400 flex items-center gap-2 uppercase">
                            <X size={10} /> Cancel
                        </button>
                    )}
                    {report && !loading && !streaming && (
                        <button onClick={generateReport} className="text-[9px] font-bold text-muted hover:text-foreground flex items-center gap-2 uppercase transition-colors">
                            <RefreshCw size={10} /> Re-Analyze
                        </button>
                    )}
                </div>
            </div>

            <div className="p-6 min-h-[180px] flex flex-col justify-center">
                {/* LOADING STATE */}
                {loading && !streaming && (
                    <div className="flex flex-col items-center justify-center space-y-4 py-8">
                        <Loader2 className="animate-spin text-indigo-500 w-8 h-8" />
                        <p className="text-[9px] uppercase font-black tracking-widest animate-pulse text-muted">
                            Connecting to LLM Gateway...
                        </p>
                    </div>
                )}

                {/* STREAMING STATE */}
                {streaming && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <div className="flex h-2 w-2 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </div>
                                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Streaming Trace</span>
                            </div>
                            <div className="text-[9px] text-muted font-bold uppercase">{tokensReceived} Tokens</div>
                        </div>

                        <div className="p-4 bg-background border border-border min-h-[150px] max-h-[300px] overflow-y-auto custom-scrollbar">
                            <pre className="text-[12px] text-foreground/80 whitespace-pre-wrap font-mono leading-relaxed">
                                {streamText}
                                <span className="inline-block w-2 h-4 bg-indigo-500 animate-pulse ml-1"></span>
                            </pre>
                        </div>
                    </div>
                )}

                {/* ERROR STATE */}
                {error && !loading && !streaming && (
                    <div className="flex flex-col items-center justify-center text-rose-500 gap-3 border border-rose-500/20 bg-rose-500/5 p-8">
                        <AlertCircle size={24} />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-center">{error}</span>
                        <button onClick={generateReport} className="px-4 py-2 bg-rose-500/10 border border-rose-500/20 text-[10px] font-bold uppercase hover:bg-rose-500/20 transition-all">
                            Retry Analysis
                        </button>
                    </div>
                )}

                {/* REPORT COMPLETE STATE */}
                {report && !loading && !streaming && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500">
                        <div className="lg:col-span-5 space-y-6">
                            <section className="space-y-2">
                                <h4 className="text-[9px] font-bold text-muted uppercase tracking-widest flex items-center gap-2">
                                    <Activity size={12} className="text-indigo-500" /> Executive Summary
                                </h4>
                                <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 text-[12px] text-foreground/80 leading-relaxed border-l-2 border-l-indigo-500">
                                    {report.summary}
                                </div>
                            </section>

                            {report.hotspots?.length > 0 && (
                                <section className="space-y-2">
                                    <h4 className="text-[9px] font-bold text-muted uppercase tracking-widest flex items-center gap-2">
                                        <AlertTriangle size={12} className="text-rose-500" /> Failure Hotspots
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {report.hotspots.map((h, idx) => (
                                            <span key={idx} className="text-[10px] font-bold text-muted bg-muted/10 px-2 py-1 border border-border truncate max-w-[200px]">
                                                {h}
                                            </span>
                                        ))}
                                    </div>
                                </section>
                            )}
                        </div>

                        <div className="lg:col-span-7 space-y-6">
                            <section className="space-y-2">
                                <h4 className="text-[9px] font-bold text-muted uppercase tracking-widest flex items-center gap-2">
                                    <Terminal size={12} /> Technical Root Cause
                                </h4>
                                <div className="p-4 bg-muted/5 border border-border text-[12px] text-muted leading-relaxed border-l-2 border-l-muted max-h-40 overflow-y-auto custom-scrollbar">
                                    {report.rootCause}
                                </div>
                            </section>

                            <div className="bg-emerald-500/5 p-4 border border-emerald-500/20 border-l-2 border-l-emerald-500 flex items-start gap-4">
                                <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-500 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-500 uppercase mb-1">Recommended Fix</p>
                                    <p className="text-xs text-foreground font-bold leading-relaxed">{report.recommendation}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* INITIAL STATE */}
                {!loading && !streaming && !report && !error && (
                    <div className="flex flex-col items-center justify-center py-12 space-y-6 animate-in fade-in zoom-in-95 duration-500">
                        <div className="relative">
                            <BrainCircuit size={48} className="text-muted/40" />
                            <Sparkles size={20} className="absolute -top-1 -right-1 text-indigo-500 animate-pulse" />
                        </div>
                        <div className="text-center space-y-1">
                            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-foreground">Heuristic Build Analysis</p>
                            <p className="text-[10px] text-muted font-bold uppercase tracking-tight">Generate AI insights for regression failures</p>
                        </div>
                        <button onClick={generateReport} className="flex items-center gap-3 px-8 py-3 bg-indigo-600 hover:opacity-90 text-white border border-indigo-400/50 shadow-xl transition-all group">
                            <Play size={12} fill="currentColor" className="group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Execute Intelligence Pipeline</span>
                        </button>
                        <p className="text-[9px] text-muted uppercase tracking-wider">Powered by Local LLM • {CONFIG.MODEL_NAME}</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default BuildIntelligencePanel;