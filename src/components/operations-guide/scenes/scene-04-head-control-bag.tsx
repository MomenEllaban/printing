"use client";

import { useState } from "react";
import {
  Crown,
  FileSpreadsheet,
  FileCheck2,
  ShieldCheck,
  CheckCircle2,
  Maximize2,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { DocumentModal } from "../shared/document-modal";
import { GUIDE_THEME } from "../shared/guide-theme";
import type { DocumentItem } from "../guide-types";

const CONTROL_REGISTER_DOC: DocumentItem = {
  id: "control-register-master",
  title: "Master Building Control Register",
  code: "CTRL-REG-01",
  category: "control",
  description:
    "The central operational ledger of the entire building. Records morning chief proctor roll-call, floor-by-floor candidate totals, official box seal numbers, tamper checks, and final transmittal sign-offs.",
  copiesNote: "1 bound hard-copy ledger with archival carbon copy retained for Ministry audit",
  fields: [
    "Building ID & Center Full Legal Name",
    "Chief Proctor Full Name & National ID",
    "Outer Carton Security Seal Serial Numbers",
    "Floor-by-Floor Senior Proctor Sign-In Matrix",
    "Total Registered vs Present vs Absentee Counts",
    "Emergency Incident Log & Chief Proctor Decisions",
    "Closing Seal Verification & Dispatch Signatures",
  ],
  sampleData: {
    governorate: "Damietta",
    center: "Damietta Secondary Experimental School",
    building: "Building A (Main Academic Hall)",
    sessionDate: "Friday, December 11, 2026",
    examLevel: "EST 1 (Session 1)",
    totalFloors: "3 Floors Supervised",
    totalEnclosedRooms: "12 Examination Rooms",
    totalCandidates: "Dynamic Allocation (Parsed from Room Manifest)",
    chiefProctor: "Chief Proctor Delegation",
    securitySealNumber: "EST-DAM-99412-SEAL",
  },
  securityNote:
    "Strictly confidential. Never leaves the Chief Proctor's direct physical custody inside the Building Control Room.",
};

export function Scene04HeadControlBag() {
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);

  return (
    <div className="space-y-6">
      {/* Top Description */}
      <div className={cn(GUIDE_THEME.card, "p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-amber-500/20")}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md", GUIDE_THEME.workflow1.badge)}>
              Command Center Custody
            </span>
            <span className={GUIDE_THEME.muted}>Enclosure 02 Details</span>
          </div>
          <p className="text-sm font-bold text-white">
            Head / Control Bag: Executive Administration &amp; Custody Portfolio
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Retained exclusively by the Chief Proctor inside the Building Control Room — never distributed to testing classrooms.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-mono font-bold shrink-0">
          <Crown className="size-4" />
          <span>Chief Proctor Only</span>
        </div>
      </div>

      {/* Bag & Register Side-by-Side Presentation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 3D-Styled Bag Representation */}
        <div className="lg:col-span-6 h-[400px] rounded-2xl bg-[#090D16] border border-slate-800/80 p-6 flex flex-col justify-between items-center relative overflow-hidden shadow-2xl">
          {/* Subtle Ambient Lighting */}
          <div className="absolute top-0 w-full h-32 bg-amber-500/5 blur-3xl pointer-events-none" />

          <div className="flex items-center justify-between w-full border-b border-slate-800/80 pb-3 text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5 text-amber-400 font-bold">
              <Lock className="size-3.5" /> SECURE CONTROL CUSTODY
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800/60 text-slate-300">BAG 01 / 01</span>
          </div>

          {/* Visual Heavy-Duty Bag */}
          <div className="relative w-64 h-56 rounded-2xl bg-gradient-to-br from-[#131926] via-[#0E131F] to-[#0A0D15] border-2 border-amber-500/50 p-5 flex flex-col justify-between items-center shadow-2xl shadow-black/40">
            {/* Bag Handle */}
            <div className="absolute -top-6 w-24 h-7 rounded-t-xl border-2 border-amber-500/50 border-b-0 bg-transparent" />

            {/* Bag Gold Badge */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 text-xs font-mono font-bold tracking-wider">
              <Crown className="size-3.5 text-amber-400" />
              HEAD / CONTROL BAG
            </div>

            {/* Center Seal Stamping */}
            <div className="text-center space-y-1">
              <p className="text-xs font-extrabold text-white uppercase tracking-wider">BUILDING CONTROL ROOM</p>
              <p className="text-[11px] text-amber-300/80 font-mono">DAMIETTA • BUILDING A</p>
            </div>

            {/* Bottom Status Ribbon */}
            <div className="w-full text-center py-1.5 rounded-lg bg-[#090D16]/90 border border-slate-800 text-[10px] font-mono text-emerald-400 font-bold flex items-center justify-center gap-1.5">
              <ShieldCheck className="size-3.5" /> VERIFIED CHIEF CUSTODY
            </div>
          </div>

          <div className="text-[11px] font-mono text-slate-400 text-center">
            Manufactured from tamper-evident reinforced canvas • Red security zip seal
          </div>
        </div>

        {/* Right: Master Control Register Document Card */}
        <div className={cn(GUIDE_THEME.card, "lg:col-span-6 p-6 flex flex-col justify-between space-y-4")}>
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <span className={cn("text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-md", GUIDE_THEME.workflow1.badge)}>
                Primary Register Document
              </span>
              <span className={GUIDE_THEME.muted}>CTRL-REG-01</span>
            </div>

            <h3 className="text-lg font-extrabold text-white">Master Building Control Register</h3>

            <p className="text-xs text-slate-300 leading-relaxed bg-[#090D16]/80 p-3.5 rounded-xl border border-slate-800/80">
              {CONTROL_REGISTER_DOC.description}
            </p>

            {/* Document Core Matrix Preview */}
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Key Recorded Metrics:
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-[#090D16]/60 border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block uppercase font-mono">Enclosed Floors:</span>
                  <span className="font-bold text-white text-xs">3 Supervised Floors</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#090D16]/60 border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block uppercase font-mono">Room Dossiers:</span>
                  <span className="font-bold text-white text-xs">12 Testing Rooms</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#090D16]/60 border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block uppercase font-mono">Roster Origin:</span>
                  <span className="font-bold text-emerald-400 text-xs">Dynamic Room Manifest</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#090D16]/60 border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block uppercase font-mono">Sign-Off:</span>
                  <span className="font-bold text-amber-300 text-xs">Chief Proctor In-Charge</span>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Inspection Action */}
          <button
            type="button"
            onClick={() => setSelectedDoc(CONTROL_REGISTER_DOC)}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-black/20 transition-all cursor-pointer transform-gpu will-change-transform"
          >
            <Maximize2 className="size-4" />
            <span>Inspect Full Control Register Specifications</span>
          </button>
        </div>
      </div>

      {/* Document Inspection Modal */}
      <DocumentModal doc={selectedDoc} onClose={() => setSelectedDoc(null)} />
    </div>
  );
}
