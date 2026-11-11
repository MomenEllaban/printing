"use client";

import { useState } from "react";
import {
  DoorClosed,
  Eye,
  FileSpreadsheet,
  FileText,
  Sparkles,
  Users,
  CheckCircle2,
  FolderOpen,
} from "lucide-react";
import { DocumentModal } from "../shared/document-modal";
import { ROOM_FOLDER_DOCS } from "../guide-data";
import type { DocumentItem } from "../guide-types";

export function Scene08RoomFolders() {
  const [selectedRoom, setSelectedRoom] = useState<string>("Room 101");
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [activeDocIndex, setActiveDocIndex] = useState<number>(0);

  const roomsList = [
    { id: "Room 101", candidates: 25, proctors: 2, status: "Active" },
    { id: "Room 102", candidates: 25, proctors: 2, status: "Active" },
    { id: "Room 103", candidates: 25, proctors: 2, status: "Active" },
    { id: "Room 104", candidates: 25, proctors: 2, status: "Active" },
  ];

  const currentDoc = ROOM_FOLDER_DOCS[activeDocIndex];

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-surface border border-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Classroom Level
            </span>
            <span className="text-xs text-muted">Room Folders</span>
          </div>
          <h3 className="text-base font-bold text-foreground mt-1">
            Inside the Examination Room Folder
          </h3>
          <p className="text-xs text-muted mt-0.5">
            Every testing classroom receives a dedicated folder containing the 5 essential classroom administration forms.
          </p>
        </div>

        {/* Room Switcher Pills */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-surface-strong/60 border border-border">
          {roomsList.map((rm) => (
            <button
              key={rm.id}
              type="button"
              onClick={() => setSelectedRoom(rm.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedRoom === rm.id
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-surface text-muted hover:text-foreground"
              }`}
            >
              <DoorClosed className="size-3.5" />
              <span>{rm.id}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Interactive Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 7 Columns: Room Folder Graphic & Active Document */}
        <div className="lg:col-span-7 flex flex-col justify-between p-6 rounded-2xl bg-gradient-to-b from-surface via-surface-strong/30 to-surface border border-border min-h-[420px]">
          {/* 3D Room Folder Presentation */}
          <div className="p-6 rounded-2xl bg-slate-900 border-2 border-emerald-400/60 shadow-2xl overflow-hidden relative">
            {/* Top Bar with Room Badge */}
            <div className="flex items-center justify-between pb-3 border-b border-emerald-400/30">
              <div className="flex items-center gap-2">
                <div className="size-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                  ✓
                </div>
                <span className="text-xs font-mono font-bold tracking-widest text-emerald-300 uppercase">
                  {selectedRoom} • OFFICIAL ROOM DOSSIER
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                25 REGISTERED CANDIDATES
              </span>
            </div>

            {/* Active Document Card Preview */}
            <div className="my-5 p-5 rounded-xl bg-slate-950/80 border border-emerald-400/40 relative">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400/80">
                    Form #{activeDocIndex + 1} of 05
                  </span>
                  <h4 className="text-base font-extrabold text-white">
                    {currentDoc.title}
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-md">
                    {currentDoc.description}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/30">
                  <FileSpreadsheet className="size-6" />
                </div>
              </div>

              {/* Sample Document Highlights */}
              <div className="mt-4 p-3 rounded-lg bg-slate-900/90 border border-border/40 font-mono text-[11px] text-slate-300 space-y-1">
                <div className="text-emerald-400 font-bold">Standard Document Columns:</div>
                {currentDoc.fields.map((f) => (
                  <div key={f} className="flex items-center gap-2">
                    <span className="text-emerald-400">•</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>

              {/* Action Button */}
              <div className="mt-4 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Sparkles className="size-3 text-emerald-400" />
                  <span>Verified against official EST room rules</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedDoc(currentDoc)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Eye className="size-3.5" />
                  <span>Inspect Document Full Size</span>
                </button>
              </div>
            </div>

            {/* Folder Spine */}
            <div className="text-center text-[10px] text-emerald-300/60 font-mono">
              ROOM PACKET • TO BE RETURNED TO SENIOR PROCTOR IMMEDIATELY AFTER EXAM CONCLUSION
            </div>
          </div>

          {/* Quick Pagination Dots */}
          <div className="mt-4 flex items-center justify-center gap-2">
            {ROOM_FOLDER_DOCS.map((doc, idx) => (
              <button
                key={doc.id}
                type="button"
                onClick={() => setActiveDocIndex(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  activeDocIndex === idx ? "w-8 bg-emerald-400" : "w-2 bg-border hover:bg-muted"
                }`}
                title={doc.title}
              />
            ))}
          </div>
        </div>

        {/* Right 5 Columns: Document Selection List */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-3">
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-foreground uppercase tracking-wider text-muted">
              Room 5-Document Sequence
            </h4>

            {ROOM_FOLDER_DOCS.map((doc, idx) => {
              const isSelected = activeDocIndex === idx;
              return (
                <div
                  key={doc.id}
                  onClick={() => setActiveDocIndex(idx)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? "bg-emerald-500/10 border-emerald-500/50 shadow-xs ring-1 ring-emerald-500/30"
                      : "bg-surface border-border hover:border-emerald-400/40"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`size-7 rounded-lg flex items-center justify-center font-bold font-mono text-xs ${
                        isSelected
                          ? "bg-emerald-500 text-slate-950 font-black"
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
                    className="p-1.5 rounded-lg hover:bg-surface-strong text-muted hover:text-emerald-500 transition-colors"
                  >
                    <Eye className="size-4" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Operational Guidance */}
          <div className="p-3 rounded-xl bg-surface border border-border text-xs text-muted space-y-1">
            <div className="font-bold text-foreground flex items-center gap-1.5">
              <Users className="size-3.5 text-emerald-500" />
              <span>Room Proctor Execution</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Two proctors per room verify student photographic identity, match seat numbers with the Student Register, collect and seal phones in the envelope, and record exact timestamps for booklet distribution and collection.
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
