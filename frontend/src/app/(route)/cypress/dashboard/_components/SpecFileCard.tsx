import { FileCode, Video, ExternalLink, PlayCircle } from "lucide-react";
import { TestRow } from "./TestRow";

export function SpecFileCard({ projectName, data, masterMap, expandedTests, toggleTest }: any) {
  return (
    <div className="bg-[#0c0c0e] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
      <div className="px-8 py-6 border-b border-white/5 bg-white/[0.01] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20"><FileCode className="w-6 h-6 text-indigo-500" /></div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Spec File</span>
            <span className="text-xl font-black text-white tracking-tight">{projectName.split(/[\\/]/).pop()}</span>
          </div>
        </div>
      </div>

      <div className="divide-y divide-white/5">
        {data.tests.map((test: any, idx: number) => {
          const testId = `${test.specId}-${test.project}-${test.title}`;
          return (
            <TestRow 
              key={testId} test={test} masterMap={masterMap} 
              isExpanded={expandedTests.includes(testId)} 
              onToggle={() => toggleTest(testId)} 
            />
          );
        })}
      </div>

      {data.video && (
        <div className="p-10 bg-black/40 border-t border-white/5">
          <div className="flex items-center justify-between mb-8 px-4">
            <div className="flex items-center gap-3 text-zinc-400">
              <Video className="w-5 h-5 text-indigo-500" />
              <h3 className="text-xs font-black uppercase tracking-widest">Execution Evidence</h3>
            </div>
            <a href={`/api/automation/video?id=${data.video.split('/').pop()}`} target="_blank" className="text-[9px] font-black text-indigo-500 hover:text-indigo-300 transition-colors uppercase flex items-center gap-1">
              <ExternalLink className="w-3.5 h-3.5" /> Full Stream
            </a>
          </div>
          <video key={data.video} controls preload="none" playsInline className="max-w-4xl mx-auto w-full rounded-[2rem] border border-white/10 bg-black shadow-2xl aspect-video">
            <source src={`/api/automation/video?id=${data.video.split('/').pop()}`} type="video/webm" />
          </video>
        </div>
      )}
    </div>
  );
}