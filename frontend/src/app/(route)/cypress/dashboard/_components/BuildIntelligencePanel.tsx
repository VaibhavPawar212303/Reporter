'use client';
import React, { useState, useRef, useCallback } from "react";
import { Sparkles, BrainCircuit, AlertTriangle, Terminal, Activity, CheckCircle2, Loader2, RefreshCw, AlertCircle, Play, Radio, Zap } from "lucide-react";

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

// Configuration - Update these values
const CONFIG = {
    API_URL: "https://ancient-remains-calibration-forget.trycloudflare.com", // Update with your tunnel URL
    API_KEY: "pk_live_3c827b877ba64352a4f956fe331a21efN",              // Update with your API key
    MODEL_NAME: "Phi3.5:latest"                               // Display name
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
        // More robust parsing
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

        // Cancel any existing stream
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

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

            const promptText = `
Analyze Cypress Build #${buildId}.
Environment: ${buildData.environment || 'N/A'}
Failed Tests: ${failures.length}

Failure Details:
${JSON.stringify(failures.slice(0, 10), null, 2)}

Provide analysis in this exact format:
SUMMARY: [2-3 sentence summary of the failures]
ROOT_CAUSE: [Technical explanation of what caused the failures]
RECOMMENDATION: [Specific actionable steps to fix the issues]
      `.trim();

            abortControllerRef.current = new AbortController();

            const response = await fetch(`${CONFIG.API_URL}/cypress`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": CONFIG.API_KEY
                },
                body: JSON.stringify({ prompt: promptText, stream: true }),
                signal: abortControllerRef.current.signal
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || errData.message || `API Error: ${response.status}`);
            }

            const contentType = response.headers.get('content-type');

            if (contentType?.includes('text/event-stream')) {
                // Handle streaming response
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
                                    if (!jsonStr) continue;

                                    const data = JSON.parse(jsonStr);

                                    if (data.type === 'start') {
                                        console.log('Stream started, model:', data.model);
                                    }

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

                                    if (data.error) {
                                        throw new Error(data.error);
                                    }
                                } catch (parseErr) {
                                    // Skip invalid JSON lines silently
                                }
                            }
                        }
                    }
                } finally {
                    reader.releaseLock();
                }

                // If stream ended without explicit done signal
                if (fullText && streaming) {
                    parseAndSetReport(fullText, failures);
                    setStreaming(false);
                }

            } else {
                // Handle non-streaming JSON response
                const data = await response.json();
                const aiText = data.analysis || data.response || data.text || JSON.stringify(data);
                parseAndSetReport(aiText, failures);
                setLoading(false);
            }

        } catch (err: any) {
            if (err.name === 'AbortError') {
                console.log('Stream aborted by user');
                setStreaming(false);
                setLoading(false);
                return;
            }
            console.error("Intelligence Pipeline Error:", err);
            setError(err.message || "Failed to connect to Intelligence Pipeline");
            setLoading(false);
            setStreaming(false);
        }
    };

    const cancelStream = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setLoading(false);
        setStreaming(false);
    };

    return (
        <div className="bg-[#111114] border border-zinc-800 rounded-none overflow-hidden shadow-sm font-mono mb-6">
            {/* Toolbar */}
            <div className="px-6 py-3 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <BrainCircuit className="w-4 h-4 text-indigo-500" />
                    <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">
                        Build Intelligence Insights
                    </span>
                    {streaming && (
                        <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-500 uppercase animate-pulse">
                            <Radio size={10} className="animate-pulse" /> Live
                        </span>
                    )}
                </div>

                {/* Controls */}
                <div className="flex items-center gap-3">
                    {(loading || streaming) && (
                        <button
                            onClick={cancelStream}
                            className="text-[9px] font-bold text-rose-500 hover:text-rose-400 flex items-center gap-2 uppercase transition-colors"
                        >
                            Cancel
                        </button>
                    )}
                    {report && !loading && !streaming && (
                        <button
                            onClick={generateReport}
                            className="text-[9px] font-bold text-zinc-500 hover:text-white flex items-center gap-2 uppercase transition-colors"
                        >
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
                        <p className="text-[9px] uppercase font-black tracking-widest animate-pulse text-zinc-400">
                            Connecting to LLM Gateway...
                        </p>
                    </div>
                )}

                {/* STREAMING STATE */}
                {streaming && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">
                                    Streaming Response
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-[9px] text-zinc-500">
                                <Zap size={10} className="text-amber-500" />
                                <span>{tokensReceived} tokens</span>
                            </div>
                        </div>

                        <div className="p-4 bg-black/60 border border-zinc-800 min-h-[150px] max-h-[300px] overflow-y-auto custom-scrollbar">
                            <pre className="text-[12px] text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed">
                                {streamText}
                                <span className="inline-block w-2 h-4 bg-indigo-500 animate-pulse ml-1"></span>
                            </pre>
                        </div>

                        <div className="flex items-center justify-between text-[9px] text-zinc-600">
                            <span>{streamText.length} characters received</span>
                            <span className="flex items-center gap-1">
                                <Activity size={10} className="text-indigo-500" />
                                {CONFIG.MODEL_NAME}
                            </span>
                        </div>
                    </div>
                )}

                {/* ERROR STATE */}
                {error && !loading && !streaming && (
                    <div className="flex flex-col items-center justify-center text-rose-500 gap-3 border border-rose-500/20 bg-rose-500/5 p-8">
                        <AlertCircle size={24} />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-center max-w-md">
                            {error}
                        </span>
                        <button
                            onClick={generateReport}
                            className="px-4 py-2 bg-rose-500/10 border border-rose-500/20 text-[10px] font-bold uppercase hover:bg-rose-500/20 transition-all"
                        >
                            Retry Analysis
                        </button>
                    </div>
                )}

                {/* REPORT COMPLETE STATE */}
                {report && !loading && !streaming && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500">
                        {/* Left Column */}
                        <div className="lg:col-span-5 space-y-6">
                            <section className="space-y-2">
                                <h4 className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                    <Activity size={12} className="text-indigo-400" /> Executive Summary
                                </h4>
                                <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 text-[12px] text-zinc-300 leading-relaxed border-l-2 border-l-indigo-500">
                                    {report.summary}
                                </div>
                            </section>

                            {report.hotspots?.length > 0 && (
                                <section className="space-y-2">
                                    <h4 className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                        <AlertTriangle size={12} className="text-rose-500" /> Failure Hotspots
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {report.hotspots.map((h, idx) => (
                                            <span
                                                key={`${h}-${idx}`}
                                                className="text-[10px] font-bold text-zinc-400 bg-zinc-900 px-2 py-1 border border-zinc-800 truncate max-w-[200px]"
                                                title={h}
                                            >
                                                {h}
                                            </span>
                                        ))}
                                    </div>
                                </section>
                            )}
                        </div>

                        {/* Right Column */}
                        <div className="lg:col-span-7 space-y-6">
                            <section className="space-y-2">
                                <h4 className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                    <Terminal size={12} className="text-zinc-400" /> Technical Root Cause
                                </h4>
                                <div className="p-4 bg-black/40 border border-zinc-800 text-[12px] text-zinc-400 leading-relaxed border-l-2 border-l-zinc-700 max-h-40 overflow-y-auto custom-scrollbar">
                                    {report.rootCause}
                                </div>
                            </section>

                            <div className="bg-emerald-500/5 p-4 border border-emerald-500/20 border-l-2 border-l-emerald-500 flex items-start gap-4">
                                <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-[10px] font-black text-emerald-500 uppercase mb-1">Recommended Fix</p>
                                    <p className="text-xs text-zinc-200 font-bold leading-relaxed">{report.recommendation}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* INITIAL STATE */}
                {!loading && !streaming && !report && !error && (
                    <div className="flex flex-col items-center justify-center py-12 space-y-6 animate-in fade-in zoom-in-95 duration-500">
                        <div className="relative">
                            <BrainCircuit size={48} className="text-zinc-800" />
                            <Sparkles size={20} className="absolute -top-1 -right-1 text-indigo-500 animate-pulse" />
                        </div>
                        <div className="text-center space-y-1">
                            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-zinc-300">
                                Heuristic Build Analysis
                            </p>
                            <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-tight">
                                Generate AI insights for regression failures and hotspots
                            </p>
                        </div>
                        <button
                            onClick={generateReport}
                            className="flex items-center gap-3 px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400/50 shadow-[0_0_20px_rgba(79,70,229,0.2)] transition-all group"
                        >
                            <Play size={12} fill="currentColor" className="group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Execute Intelligence Pipeline</span>
                        </button>
                        <p className="text-[9px] text-zinc-700 uppercase tracking-wider">
                            Powered by {CONFIG.MODEL_NAME} • Local LLM
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default BuildIntelligencePanel;