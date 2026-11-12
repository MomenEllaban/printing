"use client";

import { X, FileText, ShieldAlert, CheckCircle2, Copy } from "lucide-react";
import type { DocumentItem } from "../guide-types";
import { GUIDE_THEME } from "./guide-theme";

export function DocumentModal({
  doc,
  document,
  isOpen,
  onClose,
}: {
  doc?: DocumentItem | null;
  document?: DocumentItem | null;
  isOpen?: boolean;
  onClose: () => void;
}) {
  const targetDoc = doc ?? document ?? null;
  if (!targetDoc) return null;
  if (isOpen !== undefined && !isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-700/80 bg-[#0F1626] shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh] ring-1 ring-white/10">
        {/* Header */}
        <div className="flex items-center justify-between p-4 px-5 border-b border-slate-800 bg-[#090D16]/90">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/25">
              <FileText className="size-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-white">{targetDoc.title}</h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                  {targetDoc.code}
                </span>
              </div>
              <p className="text-xs text-slate-400 capitalize">{targetDoc.category} Document Specification</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs sm:text-sm">
          {/* Description */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Purpose & Operational Function
            </h4>
            <p className="text-slate-300 leading-relaxed bg-[#090D16]/80 p-4 rounded-xl border border-slate-800/80">
              {targetDoc.description}
            </p>
          </div>

          {/* Copies Note */}
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/25 text-blue-300 text-xs">
            <Copy className="size-4 shrink-0 text-blue-400 mt-0.5" />
            <div>
              <span className="font-bold text-white">Required Copies:</span> {targetDoc.copiesNote}
            </div>
          </div>

          {/* Mandatory Fields */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Mandatory Data Fields On Document
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {targetDoc.fields.map((field, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2.5 rounded-lg bg-[#090D16]/80 border border-slate-800 text-slate-200 text-xs"
                >
                  <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
                  <span>{field}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sample Representative Record Card */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Representative Sample Record
            </h4>
            <div className="rounded-xl border border-dashed border-slate-700/80 p-4 bg-[#090D16]/90 font-mono text-xs space-y-2 text-slate-300">
              {Object.entries(targetDoc.sampleData).map(([key, value]) => (
                <div key={key} className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/80 pb-1.5">
                  <span className="text-slate-500 uppercase text-[11px] font-semibold">{key.replace(/([A-Z])/g, " $1")}:</span>
                  <span className="font-bold text-slate-200">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Security Note if present */}
          {targetDoc.securityNote && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs">
              <ShieldAlert className="size-4 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <span className="font-bold text-amber-200">Security Protocol:</span> {targetDoc.securityNote}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
