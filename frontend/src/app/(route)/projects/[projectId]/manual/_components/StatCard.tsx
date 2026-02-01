import { cn } from "@/lib/utils";

export function StatCard({ title, value, icon, color }: any) {
  const accents: any = { 
    indigo: 'border-t-indigo-500', 
    emerald: 'border-t-emerald-500', 
    amber: 'border-t-amber-500', 
    zinc: 'border-t-muted' 
  };
  return (
    <div className={cn("bg-card border border-border border-t-2 p-8 shadow-sm rounded-sm group hover:bg-muted/5 transition-all duration-300", accents[color])}>
      <div className="mb-4 text-muted group-hover:text-foreground transition-colors">{icon}</div>
      <h3 className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">{title}</h3>
      <div className="text-4xl font-bold text-foreground tracking-tighter font-mono">{value}</div>
    </div>
  );
}