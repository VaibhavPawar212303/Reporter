'use client';

import React from "react";
import { 
  CheckCircle2, XCircle, Loader2, ChevronDown, ChevronRight, 
  Video, ExternalLink, Terminal, Cpu, HardDrive, 
  Layers, ListTree, Monitor 
} from "lucide-react";
import { LogTerminal } from "./LogTerminal";
import { cn } from "@/lib/utils";

const formatDisplayLabel = (text: any): string => {
  if (!text) return '';
  if (typeof text !== 'string') return String(text);
  return text.replace(/[\u001b\x1b]\[[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '').trim();
};

const checkHasLogs = (test: any): boolean => {
  if (test?.logs && Array.isArray(test.logs) && test.logs.length > 0) return true;
  if (test?.logs && typeof test.logs === 'string' && test.logs.trim().length > 0) return true;
  if (test?.stdout_logs && Array.isArray(test.stdout_logs) && test.stdout_logs.length > 0) return true;
  if (test?.stderr_logs && Array.isArray(test.stderr_logs) && test.stderr_logs.length > 0) return true;
  if (test?.test_entry?.stdout_logs && Array.isArray(test.test_entry.stdout_logs) && test.test_entry.stdout_logs.length > 0) return true;
  if (test?.test_entry?.stderr_logs && Array.isArray(test.test_entry.stderr_logs) && test.test_entry.stderr_logs.length > 0) return true;
  if (test?.test_entry?.logs && Array.isArray(test.test_entry.logs) && test.test_entry.logs.length > 0) return true;
  return false;
};

const getVideoUrl = (test: any): string | null => {
  return test?.video_url || test?.attachments?.paths?.video || test?.test_entry?.attachments?.paths?.video || null;
};

const getScreenshotUrl = (test: any): string | null => {
  return test?.screenshot_url || test?.attachments?.paths?.screenshot || test?.test_entry?.attachments?.paths?.screenshot || null;
};

const getSteps = (test: any): any[] => {
  return test?.steps || test?.test_entry?.steps || [];
};

const getError = (test: any): any => {
  return test?.error || test?.test_entry?.error || null;
};

function MetaBox({ icon, label, value }: any) {
  return (
    <div className="bg-card border border-border p-3 rounded-2xl flex items-center gap-3 hover:bg-muted/5 transition-all">
      <div className="text-muted">{React.cloneElement(icon, { size: 14 })}</div>
      <div>
        <p className="text-[8px] font-black text-muted uppercase leading-none mb-1">{label}</p>
        <p className="text-xs font-bold text-foreground uppercase truncate max-w-[120px]">{value || '---'}</p>
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
    <div className={cn("transition-all", depth > 0 && "ml-6 border-l border-border pl-2")}>
      <div 
        className={cn(
          "flex items-center justify-between p-3 bg-muted/5 border border-border rounded-xl group/step transition-all mb-1.5",
          hasNestedSteps && "cursor-pointer hover:bg-muted/10",
          isFailed && "border-rose-500/20 bg-rose-500/5"
        )}
        onClick={() => hasNestedSteps && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          {hasNestedSteps && (
            isExpanded ? <ChevronDown size={12} className="text-muted" /> : <ChevronRight size={12} className="text-muted" />
          )}
          {step.status?.toLowerCase() === 'passed' ? 
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/60 shrink-0" /> : 
            <XCircle className="w-3.5 h-3.5 text-rose-500/60 shrink-0" />
          }
          <div className="flex flex-col truncate">
            <span className={cn("text-xs font-medium truncate", isFailed ? "text-rose-600 dark:text-rose-400" : "text-foreground/70")}>
              {stepLabel}
            </span>
            {step.error && (
              <span className="text-[9px] text-rose-500/70 font-mono mt-0.5 break-all line-clamp-1">
                {formatDisplayLabel(step.error)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-4">
          <span className="text-[9px] font-mono text-muted/60">{step.duration_ms || step.duration || 0}ms</span>
          {step.category && (
            <span className="text-[7px] font-black bg-muted/10 text-muted px-1.5 py-0.5 rounded uppercase tracking-tighter">
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

export function TestRow({ test, isExpanded, onToggle, isLoadingLogs }: any) {
  const [stepsExpanded, setStepsExpanded] = React.useState(false);
  
  const videoUrl = getVideoUrl(test);
  const screenshotUrl = getScreenshotUrl(test);
  const steps = getSteps(test);
  const error = getError(test);
  const hasLogs = checkHasLogs(test);

  const workerId = test?.worker_id ?? test?.test_entry?.worker_id ?? 0;
  const project = test?.project || test?.test_entry?.project || 'unknown';
  const os = test?.os || test?.test_entry?.metadata?.os || 'unknown';
  const browser = test?.browser || test?.test_entry?.metadata?.browser || test?.project || 'unknown';
  const duration = test?.duration || test?.duration_ms || test?.test_entry?.duration_ms || 0;
  const durationDisplay = typeof duration === 'number' 
    ? (duration > 1000 ? `${(duration / 1000).toFixed(2)}s` : `${duration}ms`)
    : duration;

  return (
    <div className={cn("transition-all border-b border-border", isExpanded ? "bg-muted/5" : "hover:bg-muted/[0.02]")}>
      <button onClick={onToggle} className="w-full flex items-center justify-between px-8 py-6 text-left group">
        <div className="flex items-center gap-6">
          {test?.status === 'running' ? <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" /> : 
           test?.status === 'passed' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <XCircle className="w-5 h-5 text-rose-500" />}
          
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[8px] font-black bg-muted/20 text-muted px-1.5 py-0.5 rounded tracking-widest uppercase">
                Run {test?.run_number || 1}
              </span>
              {test?.status === 'running' && (
                <span className="flex items-center gap-1 text-[8px] font-black bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/20 uppercase tracking-widest animate-pulse">
                   Active Stream
                </span>
              )}
              {hasLogs && (
                <span className="flex items-center gap-1 text-[8px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 px-1.5 py-0.5 rounded border border-emerald-500/20 uppercase tracking-widest">
                  <Terminal size={10} /> Logs
                </span>
              )}
              {videoUrl && (
                <span className="flex items-center gap-1 text-[8px] font-black bg-purple-500/10 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded border border-purple-500/20 uppercase tracking-widest">
                  <Video size={10} /> Video
                </span>
              )}
              <span className="text-[9px] font-mono text-muted uppercase ml-1 opacity-50 truncate max-w-[200px]">
                {test?.specFile || test?.spec_file || test?.test_entry?.file?.split(/[\\/]/).pop() || ''}
              </span>
            </div>
            <span className={cn("text-[15px] font-bold tracking-tight", test?.status === 'running' ? "text-indigo-600 dark:text-indigo-400" : "text-foreground")}>
              {formatDisplayLabel(test?.title)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {isLoadingLogs && <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />}
          <span className="text-[10px] font-mono text-muted uppercase">{durationDisplay}</span>
          {isExpanded ? <ChevronDown className="w-5 h-5 text-muted" /> : <ChevronRight className="w-5 h-5 text-muted group-hover:text-foreground" />}
        </div>
      </button>

      {isExpanded && (
        <div className="px-8 pb-10 pt-2 space-y-10 animate-in fade-in slide-in-from-top-2 duration-300">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 ml-12">
             <MetaBox icon={<Cpu />} label="Worker" value={workerId} />
             <MetaBox icon={<Layers />} label="Project" value={project} />
             <MetaBox icon={<HardDrive />} label="Platform" value={os} />
             <MetaBox icon={<Monitor />} label="Browser" value={browser} />
          </div>

          {/* Console Logs Terminal */}
          {hasLogs && <LogTerminal test={test} />}

          {/* Steps Timeline */}
          {steps.length > 0 && (
            <div className="ml-12 space-y-4">
               <button onClick={() => setStepsExpanded(!stepsExpanded)} className="flex items-center gap-2 text-muted uppercase text-[10px] font-black tracking-widest hover:text-foreground">
                 {stepsExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                 <ListTree size={14} /> Execution Timeline ({steps.length})
               </button>
               {stepsExpanded && (
                 <div className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                    {steps.map((s: any, idx: number) => <StepItem key={idx} step={s} depth={0} />)}
                 </div>
               )}
            </div>
          )}

          {/* Media Evidence */}
          {(videoUrl || screenshotUrl) && (
            <div className="ml-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
                {videoUrl && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between px-1 text-muted font-black text-[10px] uppercase tracking-widest">
                           <div className="flex items-center gap-2"><Video size={16} /> Recording</div>
                           <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-500 transition-colors">
                             <ExternalLink size={12} />
                           </a>
                        </div>
                        <video controls className="w-full rounded-3xl border border-border bg-black shadow-2xl aspect-video">
                            <source src={videoUrl} type="video/webm" />
                        </video>
                    </div>
                )}
                {screenshotUrl && (
                    <div className="space-y-3">
                        <div className="text-muted font-black text-[10px] uppercase tracking-widest px-1 flex items-center gap-2">
                           <Monitor size={16} /> Failure Trace
                        </div>
                        <img 
                          src={screenshotUrl} 
                          alt="Failure" 
                          className="w-full rounded-3xl border border-border bg-black shadow-2xl aspect-video object-cover cursor-zoom-in" 
                          onClick={() => window.open(screenshotUrl, '_blank')} 
                        />
                    </div>
                )}
            </div>
          )}

          {/* Final Error Trace */}
          {error && (
            <div className="ml-12 space-y-3">
              <div className="flex items-center gap-2 text-rose-500/70 text-[10px] font-black uppercase tracking-widest px-1">
                <Terminal size={16} /> Final Error
              </div>
              <div className="p-6 bg-rose-500/5 border border-rose-500/10 rounded-[2rem]">
                <pre className="text-rose-600 dark:text-rose-400 font-mono text-[11px] whitespace-pre-wrap leading-relaxed overflow-x-auto">
                  {formatDisplayLabel(error.message || error)}
                </pre>
                {error.stack && (
                  <pre className="mt-4 pt-4 border-t border-border text-muted font-mono text-[10px] whitespace-pre-wrap leading-relaxed">
                    {formatDisplayLabel(error.stack)}
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