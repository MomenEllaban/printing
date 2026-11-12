"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Crown,
  Eye,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  PenTool,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { DocumentModal } from "../shared/document-modal";
import { GUIDE_THEME } from "../shared/guide-theme";
import { SENIOR_FOLDER_DOCS } from "../guide-data";
import type { DocumentItem } from "../guide-types";

export function Scene07SeniorFolder() {
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [activeDocIndex, setActiveDocIndex] = useState<number>(0);

  const currentDoc = SENIOR_FOLDER_DOCS[activeDocIndex];

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className={cn(GUIDE_THEME.card, "p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-amber-500/20")}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md", GUIDE_THEME.workflow1.badge)}>
              Floor Governance Dossier
            </span>
            <span className={GUIDE_THEME.muted}>Senior Proctor Portfolio</span>
          </div>
          <h3 className="text-base font-bold text-white">
            Inside the Senior Proctor Folder: 5 Mandatory Operational Instruments
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Supervisory administrative package carried by the Senior Proctor for floor management, proctor muster, and incident oversight.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-mono font-bold shrink-0">
          <Crown className="size-4" />
          <span>Supervises Floor 01 Rooms</span>
        </div>
      </div>

      {/* Main Interactive Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 7 Columns: 3D Folder & Document Presentation */}
        <div className="lg:col-span-7 flex flex-col justify-between p-6 rounded-2xl bg-[#090D16] border border-slate-800/80 min-h-[420px] shadow-2xl relative">
          {/* 3D Senior Folder Visual */}
          <div className="relative p-6 rounded-2xl bg-[#0F1626] border-2 border-amber-400/50 shadow-2xl overflow-hidden">
            {/* Top Bar with Gold Crest */}
            <div className="flex items-center justify-between pb-3 border-b border-amber-400/20">
              <div className="flex items-center gap-2">
                <Crown className="size-5 text-amber-400" />
                <span className="text-xs font-mono font-bold tracking-widest text-amber-300 uppercase">
                  EST SENIOR PROCTOR DOSSIER
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/25">
                DOC 0{activeDocIndex + 1} OF 05
              </span>
            </div>

            {/* Active Document Card Preview */}
            <div className="my-5 p-5 rounded-xl bg-[#090D16]/90 border border-amber-400/30 relative group">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400/90 font-bold">
                    Active Inspected Document
                  </span>
                  <h4 className="text-base font-extrabold text-white">
                    {currentDoc.title}
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-md mt-1">
                    {currentDoc.description}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-400/30 shrink-0">
                  <FileText className="size-5" />
                </div>
              </div>

              {/* Sample Document Snippet */}
              <div className="mt-4 p-3 rounded-lg bg-[#0F1626]/80 border border-slate-800/80 font-mono text-[11px] text-slate-300 space-y-1.5">
                <div className="text-amber-400 font-bold">Document Content Highlights:</div>
                {currentDoc.fields.slice(0, 3).map((f) => (
                  <div key={f} className="flex items-center gap-2">
                    <span className="text-amber-400">•</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>

              {/* Open Inspection Button */}
              <div className="mt-4 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Sparkles className="size-3 text-amber-400" />
                  <span>Official printable template specification</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedDoc(currentDoc)}
                  className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5 transform-gpu will-change-transform"
                >
                  <Eye className="size-3.5" />
                  <span>Inspect Full Document</span>
                </button>
              </div>
            </div>

            {/* Folder Flap / Spine Detail */}
            <div className="text-center text-[10px] text-amber-400/60 font-mono tracking-wider">
              ★ OFFICIAL EST EXAMINATION BOARD • CONFIDENTIAL OPERATIONAL PACKET ★
            </div>
          </div>

          {/* Quick Scrubber Indicator */}
          <div className="mt-4 flex items-center justify-center gap-2">
            {SENIOR_FOLDER_DOCS.map((doc, idx) => (
              <button
                key={doc.id}
                type="button"
                onClick={() => setActiveDocIndex(idx)}
                className={cn(
                  "h-2 rounded-full transition-all cursor-pointer",
                  activeDocIndex === idx ? "w-8 bg-amber-400" : "w-2 bg-slate-800 hover:bg-slate-700",
                )}
                title={doc.title}
              />
            ))}
          </div>
        </div>

        {/* Right 5 Columns: Interactive List of the 5 Documents */}
        <div className={cn(GUIDE_THEME.card, "lg:col-span-5 p-6 flex flex-col justify-between space-y-4")}>
          <div className="space-y-2.5">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              Select Document to Inspect
            </h4>

            {SENIOR_FOLDER_DOCS.map((doc, idx) => {
              const isSelected = activeDocIndex === idx;
              return (
                <div
                  key={doc.id}
                  onClick={() => setActiveDocIndex(idx)}
                  className={cn(
                    "p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between transform-gpu will-change-transform",
                    isSelected
                      ? "bg-amber-500/10 border-amber-500/50 shadow-sm ring-1 ring-amber-500/30"
                      : "bg-[#090D16]/60 border-slate-800/80 hover:border-amber-400/40 hover:bg-[#0B101B]",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "size-7 rounded-lg flex items-center justify-center font-bold font-mono text-xs",
                        isSelected
                          ? "bg-amber-500 text-slate-950 font-black"
                          : "bg-slate-800/80 text-slate-400",
                      )}
                    >
                      0{idx + 1}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-white">
                        {doc.title}
                      </div>
                      <div className="text-[10px] text-slate-400 line-clamp-1">
                        {doc.description}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveDocIndex(idx);
                      setSelectedDoc(doc);
                    }}
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
                    title="Inspect document modal"
                  >
                    <Eye className="size-4" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Operational Role of Senior Proctor */}
          <div className="p-3.5 rounded-xl bg-[#090D16]/80 border border-slate-800/80 text-xs text-slate-300 space-y-1">
            <div className="font-bold text-white flex items-center gap-1.5">
              <Crown className="size-3.5 text-amber-400" />
              <span>Floor Governance Authority</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              The Senior Proctor administers proctor shifts, monitors quiet corridors, safely stores student mobile devices in anti-static custody pouches, and reports any irregularities directly to the Head of Center.
            </p>
          </div>
        </div>
      </div>

      {/* Document Inspection Modal */}
      <DocumentModal
        isOpen={Boolean(selectedDoc)}
        onClose={() => setSelectedDoc(null)}
        document={selectedDoc}
      />
    </div>
  );
}
