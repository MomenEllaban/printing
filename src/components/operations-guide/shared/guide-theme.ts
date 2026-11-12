/**
 * Shared styling constants and theme tokens for the EST Operations Guide.
 * Designed for executive presentation, screen recording, and maximum visual comfort.
 * High-contrast, calm dark navy / obsidian aesthetic with zero glare or eye strain.
 */

export const GUIDE_THEME = {
  // Canvas Base
  canvas: "bg-[#090D16] text-slate-100 selection:bg-blue-600/30 selection:text-white",

  // Master Containers & Cards
  card: "rounded-2xl bg-[#111827]/90 backdrop-blur-xl border border-slate-800/80 shadow-xl shadow-black/20",
  cardHover: "hover:border-slate-700 hover:bg-[#151D30]/90 transition-all duration-200",
  cardSoft: "rounded-xl bg-[#0F1626]/70 border border-slate-800/60",
  cardInner: "rounded-xl bg-[#090D16]/80 border border-slate-800/80",

  // Accent & Workflow Tones
  workflow1: {
    badge: "bg-amber-500/10 text-amber-400 border border-amber-500/25",
    border: "border-amber-500/40",
    glow: "shadow-amber-500/10",
    text: "text-amber-400",
    bgSoft: "bg-amber-500/5",
  },
  workflow2: {
    badge: "bg-blue-500/10 text-blue-400 border border-blue-500/25",
    border: "border-blue-500/40",
    glow: "shadow-blue-500/10",
    text: "text-blue-400",
    bgSoft: "bg-blue-500/5",
  },
  master: {
    badge: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25",
    border: "border-emerald-500/40",
    glow: "shadow-emerald-500/10",
    text: "text-emerald-400",
    bgSoft: "bg-emerald-500/5",
  },

  // Typography
  title: "text-white font-extrabold tracking-tight",
  subtitle: "text-slate-300 text-sm",
  body: "text-slate-400 text-xs leading-relaxed",
  muted: "text-slate-500 text-[11px] font-mono",
  label: "text-[10px] font-bold uppercase tracking-wider text-slate-400",

  // Interactive Buttons
  btnPrimary:
    "px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]",
  btnSecondary:
    "px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]",
  btnGhost:
    "p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent hover:border-slate-700 transition-colors cursor-pointer",
};

