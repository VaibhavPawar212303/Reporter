'use client';

import { cn } from "@/lib/utils";

export function FilterButton({ active, label, count, onClick, color }: any) {
  const colorClasses: any = {
    // Success State
    green: active 
      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border-emerald-500/30' 
      : 'text-muted border-transparent hover:bg-emerald-500/5 hover:text-emerald-600 dark:hover:text-emerald-500',
    
    // Failed State
    red: active 
      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-500 border-rose-500/30' 
      : 'text-muted border-transparent hover:bg-rose-500/5 hover:text-rose-600 dark:hover:text-rose-500',
    
    // Running/Active State
    indigo: active 
      ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30' 
      : 'text-muted border-transparent hover:bg-indigo-500/5 hover:text-indigo-600 dark:hover:text-indigo-400',
    
    // Total/Registry State (The high-contrast toggle)
    zinc: active 
      ? 'bg-foreground text-background border-foreground shadow-lg' 
      : 'text-muted border-transparent hover:bg-muted/10 hover:text-foreground'
  };

  return (
    <button 
      onClick={onClick} 
      className={cn(
        "px-4 py-2 rounded-xl border text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-3 whitespace-nowrap shadow-sm duration-300",
        colorClasses[color]
      )}
    >
      {label}
      <span className={cn(
        "px-1.5 py-0.5 rounded-md text-[10px] font-mono transition-colors",
        active 
          ? (color === 'zinc' ? "bg-background/20" : "bg-foreground/10") 
          : "bg-muted/10"
      )}>
        {count}
      </span>
    </button>
  );
}