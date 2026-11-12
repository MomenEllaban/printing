"use client";

import { useState } from "react";
import {
  DoorClosed,
  Eye,
  FileSpreadsheet,
  Users,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { DocumentModal } from "../shared/document-modal";
import { GUIDE_THEME } from "../shared/guide-theme";
import { ROOM_FOLDER_DOCS } from "../guide-data";
import type { DocumentItem } from "../guide-types";

export function Scene08RoomFolders() {
  const [selectedRoom, setSelectedRoom] = useState<string>("Room 101");
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [activeDocIndex, setActiveDocIndex] = useState<number>(0);

  const roomsList = [
    { id: "Room 101", rosterNote: "Dynamic Manifest Allocation", proctors: 2, status: "Active" },
    { id: "Room 102", rosterNote: "Dynamic Manifest Allocation", proctors: 2, status: "Active" },
    { id: "Room 103", rosterNote: "Dynamic Manifest Allocation", proctors: 2, status: "Active" },
    { id: "Room 104", rosterNote: "Dynamic Manifest Allocation", proctors: 2, status: "Active" },
  ];

  const currentDoc = ROOM_FOLDER_DOCS[activeDocIndex];

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className={cn(GUIDE_THEME.card, "p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-blue-500/20")}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md", GUIDE_THEME.workflow2.badge)}>
              Classroom Level Operations
            </span>
            <span className={GUIDE_THEME.muted}>Room Folder Structure</span>
          </div>
          <h3 className="text-base font-bold text-white">
            Inside the Examination Room Folder: 5 Standardized Testing Instruments
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Every testing classroom receives a dedicated folder containing the 5 essential classroom administration forms.
          </p>
        </div>

        {/* Room Switcher Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#090D16]/80 border border-slate-800">
          {roomsList.map((rm) => (
            <button
              key={rm.id}
              type="button"
              onClick={() => setSelectedRoom(rm.id)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 transform-gpu will-change-transform",
                selectedRoom === rm.id
                  ? "bg-blue-600 text-white shadow-md shadow-blue-900/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60",
              )}
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
        <div className="lg:col-span-7 flex flex-col justify-between p-6 rounded-2xl bg-[#090D16] border border-slate-800/80 min-h-[420px] shadow-2xl relative">
          {/* 3D Room Folder Presentation */}
          <div className="p-6 rounded-2xl bg-[#0F1626] border-2 border-blue-400/50 shadow-2xl overflow-hidden relative">
            {/* Top Bar with Room Badge */}
            <div className="flex items-center justify-between pb-3 border-b border-blue-400/20">
              <div className="flex items-center gap-2">
                <div className="size-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                  ✓
                </div>
                <span className="text-xs font-mono font-bold tracking-widest text-blue-300 uppercase">
                  {selectedRoom} • OFFICIAL ROOM DOSSIER
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/25">
                DYNAMIC ROSTER MANIFEST
              </span>
            </div>

            {/* Active Document Card Preview */}
            <div className="my-5 p-5 rounded-xl bg-[#090D16]/90 border border-blue-400/30 relative">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400/90 font-bold">
                    Form #{activeDocIndex + 1} of 05
                  </span>
                  <h4 className="text-base font-extrabold text-white">
                    {currentDoc.title}
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-md mt-1">
                    {currentDoc.description}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-400/30 shrink-0">
                  <FileSpreadsheet className="size-5" />
                </div>
              </div>

              {/* Sample Document Highlights */}
              <div className="mt-4 p-3 rounded-lg bg-[#0F1626]/80 border border-slate-800/80 font-mono text-[11px] text-slate-300 space-y-1.5">
                <div className="text-blue-400 font-bold">Standard Document Columns:</div>
                {currentDoc.fields.map((f) => (
                  <div key={f} className="flex items-center gap-2">
                    <span className="text-blue-400">•</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>

              {/* Action Button */}
              <div className="mt-4 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Sparkles className="size-3 text-blue-400" />
                  <span>Verified against official EST examination regulations</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedDoc(currentDoc)}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5 transform-gpu will-change-transform"
                >
                  <Eye className="size-3.5" />
                  <span>Inspect Document Full Size</span>
                </button>
              </div>
            </div>

            {/* Folder Spine */}
            <div className="text-center text-[10px] text-blue-400/60 font-mono tracking-wider">
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
                className={cn(
                  "h-2 rounded-full transition-all cursor-pointer",
                  activeDocIndex === idx ? "w-8 bg-blue-400" : "w-2 bg-slate-800 hover:bg-slate-700",
                )}
                title={doc.title}
              />
            ))}
          </div>
        </div>

        {/* Right 5 Columns: Document Selection List */}
        <div className={cn(GUIDE_THEME.card, "lg:col-span-5 p-6 flex flex-col justify-between space-y-4")}>
          <div className="space-y-2.5">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              Room 5-Document Sequence
            </h4>

            {ROOM_FOLDER_DOCS.map((doc, idx) => {
              const isSelected = activeDocIndex === idx;
              return (
                <div
                  key={doc.id}
                  onClick={() => setActiveDocIndex(idx)}
                  className={cn(
                    "p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between transform-gpu will-change-transform",
                    isSelected
                      ? "bg-blue-500/10 border-blue-500/50 shadow-sm ring-1 ring-blue-500/30"
                      : "bg-[#090D16]/60 border-slate-800/80 hover:border-blue-400/40 hover:bg-[#0B101B]",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "size-7 rounded-lg flex items-center justify-center font-bold font-mono text-xs",
                        isSelected
                          ? "bg-blue-600 text-white font-black"
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
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-blue-400 transition-colors cursor-pointer"
                    title="Inspect document modal"
                  >
                    <Eye className="size-4" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Operational Guidance */}
          <div className="p-3.5 rounded-xl bg-[#090D16]/80 border border-slate-800/80 text-xs text-slate-300 space-y-1">
            <div className="font-bold text-white flex items-center gap-1.5">
              <Users className="size-3.5 text-blue-400" />
              <span>Room Proctor Execution</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
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
