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
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { DocumentModal } from "../shared/document-modal";
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
    totalCandidates: "300 Registered Candidates",
    chiefProctor: "Dr. Tarek Abdel-Aziz (Chief Proctor)",
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
      <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-800/40 text-slate-200">
        <div className="flex items-center gap-2 mb-1">
          <Crown className="size-4 text-amber-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
            Command Center Logistics
          </span>
        </div>
        <p className="text-sm text-slate-300">
          The <strong>Head / Control Bag</strong> is the supreme administrative packet for the building.
          It is delivered directly to the Chief Proctor and never enters standard examination rooms.
        </p>
      </div>

      {/* Bag & Register Side-by-Side Presentation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 3D-Styled Bag Representation */}
        <div className="lg:col-span-6 h-[400px] rounded-3xl bg-slate-950 border border-slate-800 p-6 flex flex-col justify-between items-center relative overflow-hidden shadow-2xl">
          {/* Subtle Ambient Lighting */}
          <div className="absolute top-0 w-full h-32 bg-amber-500/10 blur-3xl pointer-events-none" />

          <div className="flex items-center justify-between w-full border-b border-slate-800 pb-3 text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5 text-amber-400 font-bold">
              <Lock className="size-3.5" /> SECURE CONTROL CUSTODY
            </span>
            <span>BAG 01 / 01</span>
          </div>

          {/* Visual Heavy-Duty Bag */}
          <div className="relative w-64 h-56 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 border-4 border-amber-600/70 p-5 flex flex-col justify-between items-center shadow-2xl shadow-amber-950/30">
            {/* Bag Handle */}
            <div className="absolute -top-7 w-28 h-8 rounded-t-2xl border-4 border-amber-600/70 border-b-0 bg-transparent" />

            {/* Bag Gold Badge */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 text-xs font-mono font-bold tracking-wider">
              <Crown className="size-3.5 text-amber-400" />
              HEAD / CONTROL BAG
            </div>

            {/* Center Seal Stamping */}
            <div className="text-center space-y-1">
              <p className="text-xs font-black text-white uppercase tracking-wider">BUILDING CONTROL ROOM</p>
              <p className="text-[10px] text-amber-300/80 font-mono">DAMIETTA • BUILDING A</p>
            </div>

            {/* Bottom Status Ribbon */}
            <div className="w-full text-center py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-[10px] font-mono text-emerald-400 font-bold flex items-center justify-center gap-1.5">
              <ShieldCheck className="size-3.5" /> VERIFIED CHIEF CUSTODY
            </div>
          </div>

          <div className="text-[11px] font-mono text-slate-400 text-center">
            Manufactured from tamper-evident reinforced canvas • Red security zip seal
          </div>
        </div>

        {/* Right: Master Control Register Document Card */}
        <div className="lg:col-span-6 p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                Primary Register Document
              </span>
              <span className="text-xs font-mono text-slate-400">CTRL-REG-01</span>
            </div>

            <h3 className="text-xl font-black text-white">Master Control Register (سجل الكنترول)</h3>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/50 p-3.5 rounded-xl border border-slate-800">
              {CONTROL_REGISTER_DOC.description}
            </p>

            {/* Document Core Matrix Preview */}
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Key Recorded Metrics:
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">ENCLOSED FLOORS:</span>
                  <span className="font-extrabold text-white">3 Supervised Floors</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">ROOM DOSSIERS:</span>
                  <span className="font-extrabold text-white">12 Testing Rooms</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">REGISTERED SEATS:</span>
                  <span className="font-extrabold text-emerald-400">300 Candidates</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">CHIEF PROCTOR:</span>
                  <span className="font-extrabold text-amber-300">Dr. Tarek Abdel-Aziz</span>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Inspection Action */}
          <button
            type="button"
            onClick={() => setSelectedDoc(CONTROL_REGISTER_DOC)}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-950/30 transition-all cursor-pointer"
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

