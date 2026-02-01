"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Cpu, PlayCircle, Database, Command, Projector, FilePlusIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-16 lg:w-64 bg-background border-r border-border flex flex-col shrink-0 z-50 transition-colors duration-300">
      <div className="h-16 flex items-center px-6 gap-3 border-b border-border bg-card/50">
        <div className="w-8 h-8 bg-indigo-600 rounded-sm flex items-center justify-center shadow-[0_0_15px_rgba(79,70,229,0.3)] font-mono">
          <Command className="w-5 h-5 text-white" />
        </div>
        <div className="hidden lg:block">
          <h1 className="font-bold text-foreground tracking-tight text-sm uppercase leading-none">QA_Console</h1>
          <p className="text-[8px] font-mono text-muted uppercase leading-none mt-1">v4.0.2-stable</p>
        </div>
      </div>

      <nav className="p-5 space-y-1 flex-1 overflow-y-auto custom-scrollbar">
        <NavItem href="/dashboard" icon={<LayoutDashboard />} label="Executive Overview" active={pathname === "/dashboard"} />
        <NavItem href="/projects" icon={<FilePlusIcon />} label="Project" active={pathname.startsWith("/project")} />
      </nav>
    </aside>
  );
}

function NavItem({ icon, label, href, active }: any) {
  return (
    <Link 
      href={href} 
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 w-full transition-all duration-200 border-l-2 relative group rounded-none",
        active 
          ? "bg-card border-l-indigo-500 text-foreground" 
          : "border-l-transparent text-muted hover:bg-muted/10 hover:text-foreground"
      )}
    >
      <div className={cn("transition-colors shrink-0", active ? "text-indigo-500" : "text-muted group-hover:text-foreground")}>
        {React.cloneElement(icon, { size: 16 })}
      </div>
      <span className={cn("hidden lg:block text-xs font-bold tracking-tight", active ? "text-foreground" : "text-inherit")}>
        {label}
      </span>
    </Link>
  );
}