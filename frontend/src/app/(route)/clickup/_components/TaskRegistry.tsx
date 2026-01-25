"use client";
import React from 'react';
import { ExternalLink } from 'lucide-react'; // Add this line
import { cn } from "@/lib/utils";

export default function TaskRegistry({ tasks }: { tasks: any[] }) {
  return (
    <div className="bg-[#09090b] border border-zinc-800 rounded-sm overflow-hidden shadow-2xl">
      <table className="w-full text-left border-collapse">
        <thead className="bg-black text-zinc-500 text-[10px] font-black uppercase tracking-widest border-b border-zinc-800">
          <tr>
            <th className="p-4">Execution_Node</th>
            <th className="p-4">Status</th>
            <th className="p-4">Location</th>
            <th className="p-4 text-right">Reference</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-900">
          {tasks.map(t => (
            <tr key={t.id} className={cn(
              "hover:bg-white/[0.02] transition-colors group",
              t.parent ? "bg-black/20" : "bg-transparent"
            )}>
              <td className="p-4">
                <div className="flex items-center gap-3">
                  {/* Indentation for subtasks */}
                  {t.parent && <div className="ml-4 w-2 h-px bg-zinc-800" />}
                  <span className={cn(
                    "text-[11px] font-bold uppercase",
                    t.typeTag === '[BUG]' || t.typeTag === '[HOTFIX]' ? "text-rose-500" : "text-zinc-200"
                  )}>
                    {t.displayName}
                  </span>
                </div>
              </td>
              <td className="p-4">
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-sm border border-zinc-800 bg-black uppercase text-zinc-400">
                  {t.status.status}
                </span>
              </td>
              <td className="p-4">
                <p className="text-[10px] text-zinc-600 uppercase font-mono">{t.folder?.name || "ROOT"} / {t.list.name}</p>
              </td>
              <td className="p-4 text-right">
                <a href={t.url} target="_blank" className="text-zinc-700 hover:text-white transition-colors inline-block">
                  <ExternalLink size={14} />
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}