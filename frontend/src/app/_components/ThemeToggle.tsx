// app/_components/ThemeToggle.tsx
'use client';
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-8 h-8" />;

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="p-2 border border-border bg-card hover:opacity-80 transition-all rounded-none mr-4"
    >
      {theme === 'dark' ? <Sun size={14} className="text-yellow-500" /> : <Moon size={14} className="text-zinc-600" />}
    </button>
  );
}