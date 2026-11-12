"use client";

import { useState } from "react";
import {
  Tag,
  BookOpen,
  Calendar,
  Clock,
  Accessibility,
  Barcode,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { GUIDE_THEME } from "../shared/guide-theme";
import { SUBJECT_SAMPLES } from "../guide-data";
import type { SubjectItem } from "../guide-types";

export function Scene12SubjectStickers() {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("math-1");
  const [isAssnRoom, setIsAssnRoom] = useState<boolean>(false);

  const activeSubject: SubjectItem =
    SUBJECT_SAMPLES.find((s: SubjectItem) => s.id === selectedSubjectId) || SUBJECT_SAMPLES[0];

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className={cn(GUIDE_THEME.card, "p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-indigo-500/20")}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md", GUIDE_THEME.workflow2.badge)}>
              Session Automation
            </span>
            <span className={GUIDE_THEME.muted}>Subject-Based Labeling</span>
          </div>
          <h3 className="text-base font-bold text-white">
            Dynamic Subject Sticker Generation
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Stickers dynamically adapt layout, color codes, timing, and security codes based on the chosen EST subject.
          </p>
        </div>

        {/* Toggle Ordinary vs ASSN */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#090D16]/80 border border-slate-800 text-xs shrink-0">
          <span className="text-slate-400 font-semibold px-2 font-mono text-[11px]">Room Type:</span>
          <button
            type="button"
            onClick={() => setIsAssnRoom(false)}
            className={cn(
              "px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer transform-gpu will-change-transform",
              !isAssnRoom
                ? "bg-blue-600 text-white shadow-md shadow-blue-900/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60",
            )}
          >
            Standard Room
          </button>
          <button
            type="button"
            onClick={() => setIsAssnRoom(true)}
            className={cn(
              "px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 transform-gpu will-change-transform",
              isAssnRoom
                ? "bg-purple-600 text-white shadow-md shadow-purple-900/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60",
            )}
          >
            <Accessibility className="size-3.5" />
            <span>ASSN Accommodated</span>
          </button>
        </div>
      </div>

      {/* Subject Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {SUBJECT_SAMPLES.map((sub: SubjectItem) => {
          const isSelected = selectedSubjectId === sub.id;
          return (
            <button
              key={sub.id}
              type="button"
              onClick={() => setSelectedSubjectId(sub.id)}
              className={cn(
                "px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-2 border transform-gpu will-change-transform",
                isSelected
                  ? "bg-[#0E1626] text-white border-blue-400 shadow-md ring-1 ring-blue-400/40 scale-102"
                  : "bg-[#0B101B]/80 text-slate-400 border-slate-800/80 hover:border-slate-700 hover:text-white hover:bg-[#0F1626]",
              )}
            >
              <span
                className={cn(
                  "size-2.5 rounded-full",
                  sub.color.includes("blue")
                    ? "bg-blue-500"
                    : sub.color.includes("emerald")
                    ? "bg-emerald-500"
                    : sub.color.includes("purple") || sub.color.includes("violet")
                    ? "bg-purple-500"
                    : sub.color.includes("amber")
                    ? "bg-amber-500"
                    : "bg-rose-500",
                )}
              />
              <span>{sub.name}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#090D16] text-slate-400 border border-slate-800">
                {sub.exam}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Interactive Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 7 Columns: Live Sticker Rendering */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center p-6 rounded-2xl bg-[#090D16] border border-slate-800/80 min-h-[400px] shadow-2xl relative">
          {/* Sticker Preview Box */}
          <div className="w-full max-w-md rounded-2xl bg-[#F8FAFC] text-slate-900 shadow-2xl border-4 border-slate-300 p-5 space-y-3 relative overflow-hidden">
            {/* Header Color Banner */}
            <div
              className={cn(
                "-mx-5 -mt-5 p-3 px-5 text-white flex items-center justify-between",
                activeSubject.color === "blue" && "bg-blue-600",
                activeSubject.color === "emerald" && "bg-emerald-600",
                activeSubject.color === "purple" && "bg-purple-600",
                activeSubject.color === "amber" && "bg-amber-600",
                activeSubject.color === "rose" && "bg-rose-600",
              )}
            >
              <div className="flex items-center gap-2">
                <span className="font-black text-sm tracking-wider uppercase">
                  {activeSubject.exam} • {activeSubject.name.toUpperCase()}
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-black/20 text-white">
                {activeSubject.code}
              </span>
            </div>

            {/* ASSN Banner if toggled */}
            {isAssnRoom && (
              <div className="p-2.5 rounded-lg bg-purple-100 border border-purple-300 text-purple-900 flex items-center justify-between text-xs font-bold animate-in fade-in duration-200">
                <div className="flex items-center gap-1.5">
                  <Accessibility className="size-4 text-purple-700" />
                  <span>SPECIAL NEEDS / ASSN ROOM</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-purple-700 text-white text-[10px] font-mono font-bold">
                  +25% EXTRA TIME
                </span>
              </div>
            )}

            {/* Room & Center Info Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs pt-1">
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-mono">Examination Center</span>
                <span className="font-extrabold text-slate-900">Al Ryada University</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-mono">Location &amp; Building</span>
                <span className="font-extrabold text-slate-900">Damietta • Building A</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-mono">Assigned Classroom</span>
                <span className="font-extrabold text-slate-900 text-sm">
                  {isAssnRoom ? "Room 105 (ASSN)" : "Room 101"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-mono">Candidate Headcount</span>
                <span className="font-black text-emerald-700 text-sm">
                  {isAssnRoom ? "Verified Manifest Roster" : "Dynamic Manifest Count"}
                </span>
              </div>
            </div>

            {/* Timing & Security Line */}
            <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200 grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-500 block text-[9px] uppercase font-mono">Testing Duration</span>
                <span className="font-bold text-slate-800">
                  {isAssnRoom ? "75 Minutes (Extended)" : `${activeSubject.timeMinutes} Minutes`}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px] uppercase font-mono">Material Package Code</span>
                <span className="font-mono font-bold text-slate-800">
                  SEC-{activeSubject.code}-8842
                </span>
              </div>
            </div>

            {/* Footer Barcode */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <div className="font-mono text-[10px] tracking-widest text-slate-600">
                |||| ||||| || |||||| ||||| |||
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-800">
                EST-{activeSubject.code}-{isAssnRoom ? "ASSN-ROOM" : "ALLOC"}
              </span>
            </div>
          </div>
        </div>

        {/* Right 5 Columns: Subject Specifications */}
        <div className={cn(GUIDE_THEME.card, "lg:col-span-5 p-6 flex flex-col justify-between space-y-4")}>
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              Subject Print Logic
            </h4>

            {/* EST 1 vs EST 2 Rule */}
            <div className="p-3.5 rounded-xl bg-[#090D16]/60 border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">
                  Exam Tier: {activeSubject.exam}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20">
                  {activeSubject.exam === "EST 1" ? "Mandatory Core" : "Specialized Elective"}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {activeSubject.exam === "EST 1"
                  ? "EST 1 represents the standard general assessment comprising Literacy and Mathematics 1 sessions, administered to all enrolled candidates."
                  : "EST 2 comprises subject-specific tests (Math 2, Biology, Physics, Chemistry). Different students take different subject combinations within the same building."}
              </p>
            </div>

            {/* Color-Coding Standard */}
            <div className="p-3.5 rounded-xl bg-[#090D16]/60 border border-slate-800/80 space-y-2">
              <div className="text-xs font-bold text-white">
                Color-Coded Visual Indexing
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Every subject is assigned a strict primary color to ensure warehouse packers and room proctors never mix up subjects during booklet distribution.
              </p>
            </div>
          </div>

          {/* Logistics Note */}
          <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200">
            <div className="flex items-center gap-1.5 font-bold mb-1 text-blue-300">
              <Sparkles className="size-3.5" />
              <span>Automated Sorting System</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              The printing engine batches and groups all room stickers by subject before grouping by floor, ensuring single-pass sorting on packaging tables.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
