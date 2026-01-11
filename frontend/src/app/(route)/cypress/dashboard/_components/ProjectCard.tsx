import { Cpu, Video, ExternalLink, PlayCircle } from "lucide-react";
import { TestRow } from "./TestRow";

export function ProjectCard({ projectName, data, masterMap, expandedTests, toggleTest }: any) {
  return (
    <div className="bg-[#0c0c0e] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
      <div className="px-8 py-6 border-b border-white/5 bg-white/[0.01] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
            <Cpu className="w-6 h-6 text-indigo-500" />
          </div>
          <span className="text-xl font-black text-white tracking-tight">{projectName}</span>
        </div>
      </div>

      {/* List of Automated Tests */}
      <div className="divide-y divide-white/5">
        {data.tests.map((test: any, idx: number) => (
          <TestRow 
            key={`${test.specId}-${idx}`} 
            test={test} 
            projectName={projectName}
            masterMap={masterMap}
            isExpanded={expandedTests.includes(`${test.specId}-${projectName}-${test.title}`)}
            onToggle={() => toggleTest(`${test.specId}-${projectName}-${test.title}`)}
          />
        ))}
      </div>

      {/* 🔥 COMMON VIDEO SECTION (Using Direct Litterbox Links) */}
      <div className="p-10 bg-black/40 border-t border-white/5">
        <div className="flex items-center justify-between mb-8 px-4">
          <div className="flex items-center gap-3">
            <Video className="w-5 h-5 text-indigo-500" />
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Project Execution Recording</h3>
          </div>
          {data.video && (
             <a href={data.video} target="_blank" className="flex items-center gap-1 text-[10px] font-black text-indigo-500 hover:text-indigo-300 transition-colors uppercase tracking-tighter">
               <ExternalLink className="w-3.5 h-3.5" /> Open Direct
             </a>
          )}
        </div>

        {data.video ? (
          <div className="max-w-4xl mx-auto rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 bg-black">
            <video 
                key={data.video} 
                controls 
                preload="metadata" 
                playsInline 
                className="w-full aspect-video"
            >
              <source src={data.video} type="video/webm" />
              Your browser does not support the video tag.
            </video>
          </div>
        ) : (
          <div className="aspect-video max-w-4xl mx-auto bg-white/[0.02] border border-dashed border-white/10 rounded-[2.5rem] flex flex-col items-center justify-center gap-3">
            <PlayCircle className="w-12 h-12 text-zinc-800" />
            <span className="text-[10px] font-bold text-zinc-700 uppercase tracking-[0.2em]">No Recording Available</span>
          </div>
        )}
      </div>
    </div>
  );
}