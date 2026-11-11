"use client";

import { useState } from "react";
import {
  Tag,
  BookOpen,
  Calendar,
  Clock,
  CheckCircle2,
  Accessibility,
  Barcode,
  Sparkles,
} from "lucide-react";
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-surface border border-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              Session Automation
            </span>
            <span className="text-xs text-muted">Subject-Based Printing</span>
          </div>
          <h3 className="text-base font-bold text-foreground mt-1">
            Dynamic Subject Sticker Generation
          </h3>
          <p className="text-xs text-muted mt-0.5">
            Stickers dynamically adapt layout, color codes, timing, and security codes based on the chosen EST subject.
          </p>
        </div>

        {/* Toggle Ordinary vs ASSN */}
        <div className="flex items-center gap-2 p-1.5 rounded-xl bg-surface-strong/60 border border-border text-xs">
          <span className="text-muted font-semibold">Room Classification:</span>
          <button
            type="button"
            onClick={() => setIsAssnRoom(false)}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              !isAssnRoom ? "bg-accent text-white" : "text-muted hover:text-foreground"
            }`}
          >
            Standard Room
          </button>
          <button
            type="button"
            onClick={() => setIsAssnRoom(true)}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
              isAssnRoom ? "bg-purple-600 text-white" : "text-muted hover:text-foreground"
            }`}
          >
            <Accessibility className="size-3.5" />
            <span>ASSN Accommodated</span>
          </button>
        </div>
      </div>

      {/* Subject Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {SUBJECT_SAMPLES.map((sub: SubjectItem) => {
          const isSelected = selectedSubjectId === sub.id;
          return (
            <button
              key={sub.id}
              type="button"
              onClick={() => setSelectedSubjectId(sub.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-2 border ${
                isSelected
                  ? "bg-slate-900 text-white border-indigo-500 shadow-md ring-2 ring-indigo-500/30 scale-102"
                  : "bg-surface text-muted border-border hover:border-border/80 hover:text-foreground"
              }`}
            >
              <span
                className={`size-2.5 rounded-full ${
                  sub.color.includes("blue")
                    ? "bg-blue-500"
                    : sub.color.includes("emerald")
                    ? "bg-emerald-500"
                    : sub.color.includes("purple") || sub.color.includes("violet")
                    ? "bg-purple-500"
                    : sub.color.includes("amber")
                    ? "bg-amber-500"
                    : "bg-rose-500"
                }`}
              />
              <span>{sub.name}</span>
              <span className="text-[10px] font-mono px-1 rounded bg-surface-strong text-muted">
                {sub.exam}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Interactive Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 7 Columns: Live Sticker Rendering */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center p-6 rounded-2xl bg-gradient-to-b from-surface via-surface-strong/30 to-surface border border-border min-h-[400px]">
          {/* Sticker Preview Box */}
          <div className="w-full max-w-md rounded-2xl bg-white text-slate-900 shadow-2xl border-4 border-slate-300 p-5 space-y-3 relative overflow-hidden">
            {/* Header Color Banner */}
            <div
              className={`-mx-5 -mt-5 p-3 px-5 text-white flex items-center justify-between ${
                activeSubject.color === "blue"
                  ? "bg-blue-600"
                  : activeSubject.color === "emerald"
                  ? "bg-emerald-600"
                  : activeSubject.color === "purple"
                  ? "bg-purple-600"
                  : activeSubject.color === "amber"
                  ? "bg-amber-600"
                  : "bg-rose-600"
              }`}
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
              <div className="p-2 rounded-lg bg-purple-100 border border-purple-300 text-purple-900 flex items-center justify-between text-xs font-bold animate-in fade-in duration-200">
                <div className="flex items-center gap-1.5">
                  <Accessibility className="size-4 text-purple-700" />
                  <span>SPECIAL NEEDS / ASSN ROOM</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-purple-700 text-white text-[10px] font-mono">
                  +25% EXTRA TIME
                </span>
              </div>
            )}

            {/* Room & Center Info Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs pt-1">
              <div>
                <span className="text-[10px] text-slate-500 block">Examination Center</span>
                <span className="font-extrabold text-slate-900">Al Ryada University</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Location / Building</span>
                <span className="font-extrabold text-slate-900">Damietta • Building A</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Assigned Classroom</span>
                <span className="font-extrabold text-slate-900 text-sm">
                  {isAssnRoom ? "Room 105 (ASSN)" : "Room 101"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Candidate Headcount</span>
                <span className="font-black text-emerald-700 text-sm">
                  {isAssnRoom ? "04 Candidates" : `${activeSubject.ordinaryCandidates} Candidates`}
                </span>
              </div>
            </div>

            {/* Timing & Security Line */}
            <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200 grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-500 block text-[9px]">Testing Duration</span>
                <span className="font-bold text-slate-800">
                  {isAssnRoom ? "75 Minutes (Extended)" : `${activeSubject.timeMinutes} Minutes`}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px]">Material Package Code</span>
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
                EST-{activeSubject.code}-{isAssnRoom ? "ASSN-04" : activeSubject.ordinaryCandidates}
              </span>
            </div>
          </div>
        </div>

        {/* Right 5 Columns: Subject Specifications */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-foreground uppercase tracking-wider text-muted">
              Subject Print Logic
            </h4>

            {/* EST 1 vs EST 2 Rule */}
            <div className="p-3.5 rounded-xl bg-surface border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">
                  Exam Tier: {activeSubject.exam}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-bold">
                  {activeSubject.exam === "EST 1" ? "Mandatory Core" : "Specialized Elective"}
                </span>
              </div>
              <p className="text-[11px] text-muted leading-relaxed">
                {activeSubject.exam === "EST 1"
                  ? "EST 1 represents the standard general assessment comprising Literacy and Mathematics 1 sessions, administered to all enrolled students."
                  : "EST 2 comprises subject-specific tests (Math 2, Biology, Physics, Chemistry). Different students take different subject combinations within the same building."}
              </p>
            </div>

            {/* Color-Coding Standard */}
            <div className="p-3.5 rounded-xl bg-surface border border-border space-y-2">
              <div className="text-xs font-bold text-foreground">
                Color-Coded Visual Indexing
              </div>
              <p className="text-[11px] text-muted leading-relaxed">
                Every subject is assigned a strict primary color to ensure warehouse packers and room proctors never mix up subjects during booklet distribution.
              </p>
            </div>
          </div>

          {/* Logistics Note */}
          <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-950 dark:text-indigo-200">
            <div className="flex items-center gap-1.5 font-bold mb-1">
              <Sparkles className="size-3.5 text-indigo-500" />
              <span>Automated Sorting System</span>
            </div>
            <p className="text-[11px] text-muted leading-relaxed">
              The printing engine batches and groups all room stickers by subject before grouping by floor, ensuring single-pass sorting on the packaging tables.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
