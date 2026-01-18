'use client';

import React from "react";
import { 
  CheckCircle2, XCircle, Loader2, ChevronDown, ChevronRight, 
  Video, ExternalLink, AlertTriangle, Terminal, Cpu, HardDrive, 
  Layers, ListTree, Monitor 
} from "lucide-react";
import { LogTerminal } from "./LogTerminal";
import { cn } from "@/lib/utils";

const formatDisplayLabel = (text: any): string => {
  if (!text) return '';
  if (typeof text !== 'string') return String(text);
  return text.replace(/[\u001b\x1b]\[[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '').trim();
};

function MetaBox({ icon, label, value }: any) {
  return (
    <div className="bg-white/5 border border-white/5 p-3 rounded-2xl flex items-center gap-3 hover:bg-white/[0.07] transition-all">
      <div className="text-zinc-500">{React.cloneElement(icon, { size: 14 })}</div>
      <div>
        <p className="text-[8px] font-black text-zinc-600 uppercase leading-none mb-1">{label}</p>
        <p className="text-xs font-bold text-zinc-300 uppercase truncate max-w-[120px]">{value || '---'}</p>
      </div>
    </div>
  );
}

function StepItem({ step, depth }: { step: any; depth: number }) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const hasNestedSteps = step.steps && step.steps.length > 0;
  
  const stepLabel = formatDisplayLabel(step.title || step.name || step.command || 'Execution Step');
  const isFailed = step.status?.toLowerCase() === 'failed' || step.status === 'FAILED';

  return (
    <div className={cn("transition-all", depth > 0 && "ml-6 border-l border-white/5 pl-2")}>
      <div 
        className={cn(
          "flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-xl group/step transition-all mb-1.5",
          hasNestedSteps && "cursor-pointer hover:bg-white/[0.04]",
          isFailed && "border-rose-500/20 bg-rose-500/[0.02]"
        )}
        onClick={() => hasNestedSteps && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          {hasNestedSteps && (
            isExpanded ? <ChevronDown size={12} className="text-zinc-600" /> : <ChevronRight size={12} className="text-zinc-600" />
          )}
          {step.status?.toLowerCase() === 'passed' ? 
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/40 shrink-0" /> : 
            <XCircle className="w-3.5 h-3.5 text-rose-500/50 shrink-0" />
          }
          <div className="flex flex-col truncate">
            <span className={cn("text-xs font-medium truncate", isFailed ? "text-rose-400" : "text-zinc-400")}>
              {stepLabel}
            </span>
            {step.error && (
              <span className="text-[9px] text-rose-500/60 font-mono mt-0.5 break-all line-clamp-1">
                {formatDisplayLabel(step.error)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-4">
          <span className="text-[9px] font-mono text-zinc-700">{step.duration_ms || step.duration || 0}ms</span>
          {step.category && (
            <span className="text-[7px] font-black bg-white/5 text-zinc-800 px-1.5 py-0.5 rounded uppercase tracking-tighter">
              {step.category}
            </span>
          )}
        </div>
      </div>
      {isExpanded && hasNestedSteps && (
        <div className="animate-in fade-in slide-in-from-top-1 duration-200">
          {step.steps.map((nested: any, idx: number) => <StepItem key={idx} step={nested} depth={depth + 1} />)}
        </div>
      )}
    </div>
  );
}

export function TestRow({ test, isExpanded, onToggle }: any) {
  const [stepsExpanded, setStepsExpanded] = React.useState(false);
  const videoUrl = test?.video_url || test?.attachments?.paths?.video;
  const screenshotUrl = test?.attachments?.paths?.screenshot;
  
  // FIXED: Check all possible log sources
  const hasLogs = !!(
    (test?.logs && Array.isArray(test.logs) && test.logs.length > 0) ||
    (test?.logs && typeof test.logs === 'string' && test.logs.trim().length > 0) ||
    (test?.stdout_logs && Array.isArray(test.stdout_logs) && test.stdout_logs.length > 0) ||
    (test?.test_entry?.stdout_logs && Array.isArray(test.test_entry.stdout_logs) && test.test_entry.stdout_logs.length > 0)
  );

  return (
    <div className={cn("transition-all border-b border-white/5", isExpanded ? "bg-white/[0.02]" : "hover:bg-white/[0.01]")}>
      <button onClick={onToggle} className="w-full flex items-center justify-between px-8 py-6 text-left group">
        <div className="flex items-center gap-6">
          {test?.status === 'running' ? <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" /> : 
           test?.status === 'passed' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <XCircle className="w-5 h-5 text-rose-500" />}
          
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[8px] font-black bg-white/10 text-zinc-500 px-1.5 py-0.5 rounded tracking-widest uppercase">Run {test?.run_number || 1}</span>
              {test?.status === 'running' && (
                <span className="flex items-center gap-1 text-[8px] font-black bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/20 uppercase tracking-widest animate-pulse">
                   Active Stream
                </span>
              )}
              {hasLogs && (
                <span className="flex items-center gap-1 text-[8px] font-black bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded border border-emerald-500/20 uppercase tracking-widest">
                  <Terminal size={10} /> Logs Available
                </span>
              )}
              <span className="text-[9px] font-mono text-zinc-600 uppercase ml-1 opacity-50 truncate max-w-[200px]">
                {test?.specFile}
              </span>
            </div>
            <span className={cn("text-[15px] font-bold tracking-tight", test?.status === 'running' ? "text-indigo-400" : "text-zinc-200")}>
              {formatDisplayLabel(test?.title)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-mono text-zinc-600 uppercase">{test?.duration || '0ms'}</span>
          {isExpanded ? <ChevronDown className="w-5 h-5 text-zinc-700" /> : <ChevronRight className="w-5 h-5 text-zinc-700 group-hover:text-zinc-500" />}
        </div>
      </button>

      {isExpanded && (
        <div className="px-8 pb-10 pt-2 space-y-10 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 ml-12">
             <MetaBox icon={<Cpu />} label="Worker" value={test?.worker_id} />
             <MetaBox icon={<Layers />} label="Project" value={test?.project} />
             <MetaBox icon={<HardDrive />} label="Platform" value={test?.os} />
             <MetaBox icon={<Monitor />} label="Browser" value={test?.browser} />
          </div>

          {/* Console Logs Terminal - MOVED FIRST */}
          {hasLogs && <LogTerminal test={test} />}

          {/* Steps Timeline */}
          {test?.steps?.length > 0 && (
            <div className="ml-12 space-y-4">
               <button onClick={() => setStepsExpanded(!stepsExpanded)} className="flex items-center gap-2 text-zinc-500 uppercase text-[10px] font-black tracking-widest hover:text-zinc-400">
                 {stepsExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                 <ListTree size={14} /> Execution Timeline ({test.steps.length})
               </button>
               {stepsExpanded && (
                 <div className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                    {test.steps.map((s: any, idx: number) => <StepItem key={idx} step={s} depth={0} />)}
                 </div>
               )}
            </div>
          )}

          {/* Media Evidence */}
          {(videoUrl || screenshotUrl) && (
            <div className="ml-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
                {videoUrl && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between px-1 text-zinc-500 font-black text-[10px] uppercase tracking-widest">
                           <div className="flex items-center gap-2"><Video size={16} /> Recording</div>
                           <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-400 transition-colors"><ExternalLink size={12} /></a>
                        </div>
                        <video controls className="w-full rounded-3xl border border-white/10 bg-black shadow-2xl aspect-video">
                            <source src={videoUrl} type="video/webm" />
                        </video>
                    </div>
                )}
                {screenshotUrl && (
                    <div className="space-y-3">
                        <div className="text-zinc-500 font-black text-[10px] uppercase tracking-widest px-1 flex items-center gap-2">
                           <Monitor size={16} /> Failure Trace
                        </div>
                        <img src={screenshotUrl} alt="Failure" className="w-full rounded-3xl border border-white/10 bg-black shadow-2xl aspect-video object-cover cursor-zoom-in" onClick={() => window.open(screenshotUrl, '_blank')} />
                    </div>
                )}
            </div>
          )}

          {/* Final Error Trace */}
          {test?.error && (
            <div className="ml-12 space-y-3">
              <div className="flex items-center gap-2 text-rose-500/50 text-[10px] font-black uppercase tracking-widest px-1"><Terminal size={16} /> Final Error</div>
              <div className="p-6 bg-rose-500/[0.03] border border-rose-500/10 rounded-[2rem]">
                <pre className="text-rose-400 font-mono text-[11px] whitespace-pre-wrap leading-relaxed overflow-x-auto">
                  {formatDisplayLabel(test.error.message || test.error)}
                </pre>
                {test.error.stack && (
                  <pre className="mt-4 pt-4 border-t border-rose-500/10 text-zinc-600 font-mono text-[10px] whitespace-pre-wrap leading-relaxed">
                    {formatDisplayLabel(test.error.stack)}
                  </pre>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}