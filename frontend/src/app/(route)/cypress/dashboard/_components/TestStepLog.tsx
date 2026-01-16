'use client';

import React from "react";
import { Check, Circle, MousePointer2, Type, Layout, Info, ExternalLink, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function TestStepLog({ steps }: { steps: any[] }) {
  if (!steps || steps.length === 0) return null;

  const translate = (step: any) => {
    let args = [];
    try { args = JSON.parse(step.arguments || "[]"); } catch (e) { args = [step.arguments]; }
    const primary = args[0] || "";

    switch(step.command) {
      case 'visit': return { label: `Navigate to ${primary}`, icon: <ExternalLink className="w-3 h-3"/>, color: "text-blue-400" };
      case 'click': return { label: `Click Interaction`, icon: <MousePointer2 className="w-3 h-3"/>, color: "text-purple-400" };
      case 'type': return { label: `Input: "${primary}"`, icon: <Type className="w-3 h-3"/>, color: "text-amber-400" };
      case 'xpath': 
      case 'get': return { label: `Locate: ${primary}`, icon: <Layout className="w-3 h-3"/>, color: "text-emerald-400" };
      case 'log': return { label: primary, icon: <Info className="w-3 h-3"/>, color: "text-indigo-400" };
      default: return { label: `${step.command} ${typeof primary === 'string' ? primary : ''}`, icon: <Circle className="w-3 h-3"/>, color: "text-slate-500" };
    }
  };

  return (
    <div className="relative pl-4">
        {/* Continuous Flow Line */}
        <div className="absolute left-[31px] top-2 bottom-2 w-px bg-zinc-800" />

        <div className="space-y-8">
            {steps.map((step, i) => {
                const config = translate(step);
                const isLog = step.command === 'log';
                const isFail = step.status === 'failed';

                return (
                    <div key={i} className="relative flex gap-6 group">
                        {/* Flow Node (Icon) */}
                        <div className={cn(
                            "relative z-10 w-8 h-8 rounded-full flex items-center justify-center border shrink-0 transition-all duration-300",
                            isLog ? "bg-indigo-600 border-indigo-400 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)] scale-110" : 
                            isFail ? "bg-rose-500 border-rose-400 text-white" : 
                            "bg-zinc-900 border-zinc-700 text-zinc-500 group-hover:border-zinc-500"
                        )}>
                            {step.status === 'passed' && !isLog ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : config.icon}
                        </div>

                        {/* Step Details */}
                        <div className="flex-1 pt-1">
                            <div className="flex items-center justify-between gap-4">
                                <p className={cn(
                                    "text-sm tracking-tight transition-colors",
                                    isLog ? "font-black text-indigo-400 uppercase tracking-widest text-[11px]" : "text-zinc-300 font-medium",
                                    isFail && "text-rose-400"
                                )}>
                                    {config.label}
                                </p>
                                <span className="text-[10px] font-mono text-zinc-600 tabular-nums">{step.duration}</span>
                            </div>

                            {/* Technical Metadata (Visible on Hover) */}
                            {!isLog && (
                                <div className="mt-1.5 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <span className={cn("text-[9px] font-black uppercase px-1 rounded border bg-zinc-800 border-zinc-700", config.color)}>
                                        {step.command}
                                    </span>
                                    <span className="text-[10px] font-mono text-zinc-600 truncate max-w-sm italic">
                                        {step.arguments}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    </div>
  );
}