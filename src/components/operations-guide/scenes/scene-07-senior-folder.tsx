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
import { DocumentModal } from "../shared/document-modal";
import { SENIOR_FOLDER_DOCS } from "../guide-data";
import type { DocumentItem } from "../guide-types";

export function Scene07SeniorFolder() {
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [activeDocIndex, setActiveDocIndex] = useState<number>(0);

  const currentDoc = SENIOR_FOLDER_DOCS[activeDocIndex];

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-surface border border-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              Folder Deep Dive
            </span>
            <span className="text-xs text-muted">Senior Proctor Materials</span>
          </div>
          <h3 className="text-base font-bold text-foreground mt-1">
            Inside the Senior Proctor Folder
          </h3>
          <p className="text-xs text-muted mt-0.5">
            Detailed examination of the 5 mandatory administrative documents carried by the Senior Proctor for floor governance.
          </p>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-bold text-amber-500">
          <Crown className="size-4" />
          <span>Assigned Rooms: 04 (Floor 01)</span>
        </div>
      </div>

      {/* Main Interactive Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 7 Columns: 3D Folder & Document Presentation */}
        <div className="lg:col-span-7 flex flex-col justify-between p-6 rounded-2xl bg-gradient-to-b from-surface via-surface-strong/30 to-surface border border-border min-h-[420px]">
          {/* 3D Senior Folder Visual */}
          <div className="relative p-6 rounded-2xl bg-slate-900 border-2 border-amber-400/60 shadow-2xl overflow-hidden">
            {/* Top Bar with Gold Crest */}
            <div className="flex items-center justify-between pb-3 border-b border-amber-400/30">
              <div className="flex items-center gap-2">
                <Crown className="size-5 text-amber-400" />
                <span className="text-xs font-mono font-bold tracking-widest text-amber-300 uppercase">
                  EST SENIOR PROCTOR DOSSIER
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                DOC 0{activeDocIndex + 1} OF 05
              </span>
            </div>

            {/* Active Document Card Preview */}
            <div className="my-5 p-5 rounded-xl bg-slate-950/80 border border-amber-400/40 relative group">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400/80">
                    Active Document In Hand
                  </span>
                  <h4 className="text-base font-extrabold text-white">
                    {currentDoc.title}
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-md">
                    {currentDoc.description}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-400/30">
                  <FileText className="size-6" />
                </div>
              </div>

              {/* Sample Document Snippet */}
              <div className="mt-4 p-3 rounded-lg bg-slate-900/90 border border-border/40 font-mono text-[11px] text-slate-300 space-y-1">
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
                  <span>Click to view official printable template</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedDoc(currentDoc)}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Eye className="size-3.5" />
                  <span>Inspect Document Full Size</span>
                </button>
              </div>
            </div>

            {/* Folder Flap / Spine Detail */}
            <div className="text-center text-[10px] text-amber-300/60 font-mono">
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
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  activeDocIndex === idx ? "w-8 bg-amber-400" : "w-2 bg-border hover:bg-muted"
                }`}
                title={doc.title}
              />
            ))}
          </div>
        </div>

        {/* Right 5 Columns: Interactive List of the 5 Documents */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-3">
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-foreground uppercase tracking-wider text-muted">
              Select Document to Inspect
            </h4>

            {SENIOR_FOLDER_DOCS.map((doc, idx) => {
              const isSelected = activeDocIndex === idx;
              return (
                <div
                  key={doc.id}
                  onClick={() => setActiveDocIndex(idx)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? "bg-amber-500/10 border-amber-500/50 shadow-xs ring-1 ring-amber-500/30"
                      : "bg-surface border-border hover:border-amber-400/40"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`size-7 rounded-lg flex items-center justify-center font-bold font-mono text-xs ${
                        isSelected
                          ? "bg-amber-500 text-slate-950 font-black"
                          : "bg-surface-strong text-muted"
                      }`}
                    >
                      0{idx + 1}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-foreground">
                        {doc.title}
                      </div>
                      <div className="text-[10px] text-muted line-clamp-1">
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
                    className="p-1.5 rounded-lg hover:bg-surface-strong text-muted hover:text-amber-500 transition-colors"
                    title="Inspect document modal"
                  >
                    <Eye className="size-4" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Operational Role of Senior Proctor */}
          <div className="p-3 rounded-xl bg-surface border border-border text-xs text-muted space-y-1">
            <div className="font-bold text-foreground flex items-center gap-1.5">
              <Crown className="size-3.5 text-amber-500" />
              <span>Floor Governance Authority</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              The Senior Proctor uses this folder to administer proctor shifts, monitor quiet corridors, safely store all student smartphones in dedicated anti-static pouches, and report any irregularities directly to the Head of Center.
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
