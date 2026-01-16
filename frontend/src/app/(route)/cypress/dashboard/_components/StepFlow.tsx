import React from "react";
import { Check, Circle, ExternalLink, MousePointer2, Type, Layout, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export function StepFlow({ steps }: { steps: any[] }) {
  if (!steps || steps.length === 0) return null;

  const translate = (step: any) => {
    const args = JSON.parse(step.arguments || "[]");
    const primary = args[0] || "";
    switch(step.command) {
      case 'visit': return { label: `Navigate to ${primary}`, icon: <ExternalLink className="w-3 h-3"/> };
      case 'click': return { label: `Interaction: Click`, icon: <MousePointer2 className="w-3 h-3"/> };
      case 'type': return { label: `Input: "${primary}"`, icon: <Type className="w-3 h-3"/> };
      case 'xpath': 
      case 'get': return { label: `Locate: ${primary}`, icon: <Layout className="w-3 h-3"/> };
      case 'log': return { label: primary, icon: <Info className="w-3 h-3"/> };
      default: return { label: `${step.command} ${primary}`, icon: <Circle className="w-3 h-3"/> };
    }
  };

  return (
    <div className="relative">
        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest border-l-2 border-zinc-700 pl-3 mb-6">Test Execution Flow</p>
        
        {/* Timeline Path */}
        <div className="absolute left-[19px] top-10 bottom-2 w-px bg-zinc-800" />

        <div className="space-y-6">
            {steps.map((step, i) => {
                const config = translate(step);
                const isLog = step.command === 'log';
                const isFail = step.status === 'failed';

                return (
                    <div key={i} className="relative flex gap-6 group">
                        {/* Flow Node */}
                        <div className={cn(
                            "relative z-10 w-10 h-10 rounded-full flex items-center justify-center border shrink-0 transition-transform group-hover:scale-110",
                            isLog ? "bg-indigo-600 border-indigo-400 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]" : 
                            isFail ? "bg-rose-500 border-rose-400 text-white" : "bg-zinc-900 border-zinc-700 text-zinc-500"
                        )}>
                            {step.status === 'passed' && !isLog ? <Check className="w-4 h-4 text-emerald-500" /> : config.icon}
                        </div>

                        <div className="flex-1 pt-2">
                            <div className="flex items-center justify-between">
                                <p className={cn(
                                    "text-sm tracking-tight transition-colors",
                                    isLog ? "font-black text-indigo-400 uppercase tracking-wider" : "text-zinc-300 font-medium",
                                    isFail && "text-rose-400"
                                )}>
                                    {config.label}
                                </p>
                                <span className="text-[9px] font-mono text-zinc-600 tabular-nums">{step.duration}</span>
                            </div>

                            {/* Technical Meta (Hidden by default, shown on hover) */}
                            {!isLog && (
                                <div className="mt-1 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <span className="text-[8px] font-black uppercase text-zinc-500 bg-zinc-800 px-1 rounded">{step.command}</span>
                                    <span className="text-[9px] font-mono text-zinc-700 truncate max-w-sm">{step.arguments}</span>
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