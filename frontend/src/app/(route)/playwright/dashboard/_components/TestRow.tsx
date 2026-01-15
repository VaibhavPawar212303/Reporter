import React from "react";
import { 
  CheckCircle2, XCircle, Loader2, ChevronDown, ChevronRight, 
  Video, ExternalLink, AlertTriangle, Terminal, Cpu, HardDrive, Layers, ListTree,
  Monitor
} from "lucide-react";
import { LogTerminal } from "./LogTerminal";
import { cn } from "@/lib/utils";

export function TestRow({ test, isExpanded, onToggle }: any) {
  const [stepsExpanded, setStepsExpanded] = React.useState(false);
  const videoUrl = test.attachments?.paths?.video || test.video_url;
  const screenshotUrl = test.attachments?.paths?.screenshot;
  const hasLogs = (test.stdout_logs?.length || 0) + (test.stderr_logs?.length || 0) > 0;

  return (
    <div className={cn("transition-all border-b border-white/5", isExpanded ? "bg-white/[0.02]" : "hover:bg-white/[0.01]")}>
      <button onClick={onToggle} className="w-full flex items-center justify-between px-8 py-6 text-left group">
        <div className="flex items-center gap-6">
          {test.status === 'running' ? <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" /> : 
           test.status === 'passed' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
          
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[8px] font-black bg-white/10 text-zinc-500 px-1.5 py-0.5 rounded tracking-widest uppercase">Run {test.run_number}</span>
              {test.isFlaky && (
                <span className="flex items-center gap-1 text-[8px] font-black bg-yellow-500/10 text-yellow-500 px-1.5 py-0.5 rounded border border-yellow-500/20 uppercase tracking-widest">
                  <AlertTriangle className="w-2 h-2" /> Flaky
                </span>
              )}
              {hasLogs && (
                <span className="flex items-center gap-1 text-[8px] font-black bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded border border-emerald-500/20 uppercase tracking-widest">
                  <Terminal className="w-2 h-2" /> Logs
                </span>
              )}
              <span className="text-[9px] font-mono text-zinc-600 uppercase ml-1 opacity-50">{test.specFile?.split(/[\\/]/).pop()}</span>
            </div>
            <span className={cn("text-[15px] font-bold tracking-tight", test.status === 'running' ? "text-indigo-400 animate-pulse" : "text-zinc-200")}>
              {test.title}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-[10px] font-mono text-zinc-600 uppercase">{test.duration_seconds || test.duration}s</span>
          {isExpanded ? <ChevronDown className="w-5 h-5 text-zinc-700" /> : <ChevronRight className="w-5 h-5 text-zinc-700 group-hover:text-zinc-500" />}
        </div>
      </button>

      {isExpanded && (
        <div className="px-8 pb-10 pt-2 space-y-10 animate-in fade-in slide-in-from-top-2 duration-300">
          
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 ml-12">
             <MetaBox icon={<Cpu />} label="Worker" value={test.worker_id} />
             <MetaBox icon={<Layers />} label="Parallel Index" value={test.parallel_index} />
             <MetaBox icon={<HardDrive />} label="OS" value={test.metadata?.os || 'unknown'} />
             <MetaBox icon={<Monitor />} label="Browser" value={test.metadata?.browser || test.project} />
          </div>

          {/* 🔥 NEW: Live Logs Terminal - Now appears FIRST for better visibility */}
          {hasLogs && <LogTerminal test={test} />}

          {/* Execution Steps Timeline - Collapsible */}
          {test.steps?.length > 0 && (
            <div className="ml-12 space-y-4">
               <button
                 onClick={() => setStepsExpanded(!stepsExpanded)}
                 className="flex items-center gap-2 text-zinc-500 uppercase text-[10px] font-black tracking-widest hover:text-zinc-400 transition-colors"
               >
                 {stepsExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                 <ListTree className="w-4 h-4" /> Execution Steps ({test.steps.length})
               </button>
               
               {stepsExpanded && (
                 <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    {test.steps.map((step: any, sIdx: number) => (
                      <StepItem key={sIdx} step={step} depth={0} />
                    ))}
                 </div>
               )}
            </div>
          )}

          {/* Video / Screenshot Evidence */}
          {(videoUrl || screenshotUrl) && (
            <div className="ml-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
                {videoUrl && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-black uppercase tracking-widest"><Video className="w-4 h-4" /> Video Recording</div>
                            <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:text-indigo-400 transition-colors"><ExternalLink className="w-3 h-3" /></a>
                        </div>
                        <video controls preload="metadata" className="w-full rounded-3xl border border-white/10 bg-black shadow-2xl aspect-video">
                            <source src={videoUrl} type="video/webm" />
                        </video>
                    </div>
                )}
                {screenshotUrl && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-black uppercase tracking-widest px-1"><Monitor className="w-4 h-4" /> Failure Screenshot</div>
                        <img 
                          src={screenshotUrl} 
                          alt="Test failure screenshot"
                          className="w-full rounded-3xl border border-white/10 bg-black shadow-2xl aspect-video object-cover cursor-zoom-in" 
                          onClick={() => window.open(screenshotUrl, '_blank')} 
                        />
                    </div>
                )}
            </div>
          )}

          {/* Error Trace */}
          {test.status === 'failed' && test.error && (
            <div className="ml-12 space-y-3">
              <div className="flex items-center gap-2 text-red-500/50 text-[10px] font-black uppercase tracking-widest px-1"><Terminal className="w-4 h-4" /> Stack Trace</div>
              <div className="p-6 bg-red-500/[0.02] border border-red-500/10 rounded-3xl">
                <pre className="text-red-400/80 font-mono text-[11px] whitespace-pre-wrap leading-relaxed overflow-x-auto">
                  {test.error.message || test.error}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Recursive Step Item Component for nested steps
function StepItem({ step, depth }: { step: any; depth: number }) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const hasNestedSteps = step.steps && step.steps.length > 0;

  return (
    <div className={cn("transition-all", depth > 0 && "ml-6")}>
      <div 
        className={cn(
          "flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-xl group/step transition-all",
          hasNestedSteps && "cursor-pointer hover:bg-white/[0.04]"
        )}
        onClick={() => hasNestedSteps && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          {hasNestedSteps && (
            isExpanded ? 
              <ChevronDown className="w-3 h-3 text-zinc-600" /> : 
              <ChevronRight className="w-3 h-3 text-zinc-600" />
          )}
          {step.status === 'passed' ? 
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/50" /> : 
            <XCircle className="w-3.5 h-3.5 text-red-500/50" />
          }
          <div className="flex flex-col">
            <span className="text-xs font-medium text-zinc-400 group-hover/step:text-zinc-200">
              {step.title}
            </span>
            {step.error && (
              <span className="text-[10px] text-red-500/70 mt-1">
                {step.error.substring(0, 100)}...
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-mono text-zinc-600">{step.duration_ms}ms</span>
          {step.category && (
            <span className="text-[8px] font-black bg-white/5 text-zinc-700 px-1.5 py-0.5 rounded uppercase">
              {step.category}
            </span>
          )}
        </div>
      </div>
      
      {/* Nested Steps */}
      {isExpanded && hasNestedSteps && (
        <div className="mt-2 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
          {step.steps.map((nestedStep: any, idx: number) => (
            <StepItem key={idx} step={nestedStep} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function MetaBox({ icon, label, value }: any) {
    return (
        <div className="bg-white/5 border border-white/5 p-3 rounded-2xl flex items-center gap-3 hover:bg-white/[0.07] transition-all">
            <div className="text-zinc-500">{React.cloneElement(icon, { size: 14 })}</div>
            <div>
                <p className="text-[8px] font-black text-zinc-600 uppercase leading-none mb-1">{label}</p>
                <p className="text-xs font-bold text-zinc-300 uppercase">{value}</p>
            </div>
        </div>
    )
}