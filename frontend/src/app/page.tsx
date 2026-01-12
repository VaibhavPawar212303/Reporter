"use client";

import React, { useState } from "react";
import { Bot, TestTube, FileCode, Bug, Settings, MessageSquare, PenTool, PlayCircle, Book, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

// --- Components ---
import ArchitectView from "@/app/_components/ArchitectView";
import ChatView from "@/app/_components/ChatView";
import CreateTestCase from "./(route)/testcases/page";
import CypressDashboard from "@/app/(route)/cypress/dashboard/page";
import TestCaseManager from "./(route)/test-cases/page";
import PlaywrightDashboard from "./(route)/playwright/dashboard/page";
import Overview from "./_components/Overview";

type ViewState = "overview"|"chat" | "architect" | "testcases" | "cypress" | "playwright" | "test-cases";

export default function Home() {
  const [activeView, setActiveView] = useState<ViewState>("test-cases");

  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-300 font-sans text-sm antialiased overflow-hidden">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-16 lg:w-64 bg-black/40 border-r border-white/5 flex flex-col shrink-0 transition-all duration-300">
        <div className="h-16 flex items-center px-6 gap-3 border-b border-white/5">
          <Bot className="w-6 h-6 text-indigo-500" />
          <h1 className="font-bold text-white tracking-tighter hidden lg:block text-lg">QA Suite</h1>
        </div>

        <nav className="p-4 space-y-2 flex-1 overflow-y-auto custom-scrollbar">
          <div className="text-[10px] uppercase font-black text-zinc-600 tracking-[0.2em] mb-4 hidden lg:block">Automation</div>
          <NavItem icon={<LayoutDashboard className="w-4 h-4" />}label="Executive Overview"isActive={activeView === "overview"}onClick={() => setActiveView("overview")}/>
          <NavItem icon={<PlayCircle />} label="Playwright" active={activeView === "playwright"} onClick={() => setActiveView("playwright")} />
          <NavItem icon={<PlayCircle />} label="Cypress" active={activeView === "cypress"} onClick={() => setActiveView("cypress")} />
          <NavItem icon={<MessageSquare />} label="AI Chat" active={activeView === "chat"} onClick={() => setActiveView("chat")} />
          <NavItem icon={<FileCode />} label="AI Architect" active={activeView === "architect"} onClick={() => setActiveView("architect")} />

          <div className="h-px bg-white/5 my-6" />

          <div className="text-[10px] uppercase font-black text-zinc-600 tracking-[0.2em] mb-4 hidden lg:block">Manual</div>
          <NavItem icon={<Book />} label="Test Cases" active={activeView === "test-cases"} onClick={() => setActiveView("test-cases")} />
          <NavItem icon={<PenTool />} label="Test Builder" active={activeView === "testcases"} onClick={() => setActiveView("testcases")} />
          <NavItem icon={<TestTube />} label="Test Runner" />
          <NavItem icon={<Bug />} label="Self-Healing" />
        </nav>

        <div className="p-4 border-t border-white/5">
          <button className="flex items-center gap-3 p-2 text-zinc-500 hover:text-white transition-colors w-full">
            <Settings className="w-4 h-4" />
            <span className="hidden lg:block font-bold text-xs uppercase tracking-widest">Settings</span>
          </button>
        </div>
      </aside>

      {/* MAIN VIEW AREA */}
      <main className="flex-1 min-w-0 bg-[#09090b] overflow-y-auto custom-scrollbar">
        <div className="min-h-full flex flex-col">
          {activeView === "overview" && <Overview />}
          {activeView === "chat" && <ChatView />}
          {activeView === "architect" && <ArchitectView socket={null} />}
          {activeView === "testcases" && <CreateTestCase />}
          {activeView === "test-cases" && <TestCaseManager />} 
          {activeView === "cypress" && <CypressDashboard />}
          {activeView === "playwright" && <PlaywrightDashboard />}
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: any) {
  return (
    <button onClick={onClick} className={cn(
      "flex items-center gap-3 px-3 py-3 rounded-xl w-full transition-all group",
      active ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-lg" : "text-zinc-500 hover:bg-white/5"
    )}>
      {React.cloneElement(icon, { className: cn("w-5 h-5", active ? "text-indigo-400" : "text-zinc-500 group-hover:text-zinc-300") })}
      <span className="hidden lg:block font-bold tracking-tight">{label}</span>
    </button>
  );
}