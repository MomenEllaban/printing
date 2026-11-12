"use client";

import { useState } from "react";
import {
  Globe,
  Calendar,
  MapPin,
  Building2,
  Layers,
  DoorOpen,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Shield,
  FileCheck,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { GUIDE_THEME } from "../shared/guide-theme";

interface HierarchyNode {
  id: string;
  level: string;
  name: string;
  details: string;
  icon: typeof Globe;
  metric: string;
  color: string;
}

const NODES: HierarchyNode[] = [
  {
    id: "exam",
    level: "Tier 1: Global Program",
    name: "EST Examination",
    details: "Standardized Egyptian Scholastic Test program governing national and international schools.",
    icon: Globe,
    metric: "EST 1 & EST 2",
    color: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  },
  {
    id: "session",
    level: "Tier 2: Examination Cycle",
    name: "Session: December 2026",
    details: "Specific testing cycle window with locked question variants, security codes, and rosters.",
    icon: Calendar,
    metric: "Cycle Window",
    color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
  },
  {
    id: "governorate",
    level: "Tier 3: Governorate Zone",
    name: "Governorate: Damietta",
    details: "Territorial logistics partition coordinating transport convoys, regional leads, and deliveries.",
    icon: MapPin,
    metric: "Regional Route",
    color: "bg-slate-500/10 text-slate-300 border-slate-500/30",
  },
  {
    id: "center",
    level: "Tier 4: Test Center",
    name: "Center: Damietta Main School",
    details: "Physical school or university campus hosting candidate arrival, security gates, and control.",
    icon: Building2,
    metric: "Center HQ",
    color: "bg-blue-500/10 text-blue-300 border-blue-500/30",
  },
  {
    id: "building",
    level: "Tier 5: Examination Building",
    name: "Building: Building A (Primary)",
    details: "Discrete structural facility containing dedicated Chief Proctor control room and multiple floors.",
    icon: Building2,
    metric: "Building Unit",
    color: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  },
  {
    id: "floors",
    level: "Tier 6: Floor Wings",
    name: "Floors: 1st, 2nd, 3rd Floors",
    details: "Supervised floor wings managed by Senior Proctors with dedicated Floor Transit Bags.",
    icon: Layers,
    metric: "Floor Transit Bags",
    color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  },
  {
    id: "rooms",
    level: "Tier 7: Candidate Rooms",
    name: "Rooms: Room 101 – 112",
    details: "Individual testing halls governed by Room Dossiers and assigned proctors based on actual student rosters.",
    icon: DoorOpen,
    metric: "Enclosed Rooms",
    color: "bg-indigo-500/10 text-indigo-300 border-indigo-500/30",
  },
];

export function Scene01BigPicture() {
  const [selectedNodeId, setSelectedNodeId] = useState<string>("building");

  const activeNode = NODES.find((n) => n.id === selectedNodeId) || NODES[4];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#111827]/90 border border-slate-800 text-slate-200 shadow-md">
        <div className="flex items-center gap-2 mb-1.5">
          <Sparkles className="size-4 text-blue-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
            Top-Down Operations Architecture
          </span>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          The EST examination logistics system operates on a rigid 7-tier geographic and operational hierarchy.
          Click any level in the pipeline below to inspect its operational scope and see how examination cartons are partitioned.
        </p>
      </div>

      {/* Interactive Horizontal Pipeline */}
      <div className="overflow-x-auto pb-3">
        <div className="flex items-center gap-2 min-w-max">
          {NODES.map((node, index) => {
            const Icon = node.icon;
            const isSelected = selectedNodeId === node.id;
            return (
              <div key={node.id} className="flex items-center">
                <button
                  type="button"
                  onClick={() => setSelectedNodeId(node.id)}
                  className={cn(
                    "flex flex-col text-left p-3.5 rounded-2xl border transition-all duration-200 w-44 cursor-pointer",
                    isSelected
                      ? "bg-[#162036] border-blue-500/80 shadow-lg shadow-blue-500/10 scale-102 ring-1 ring-blue-500/40 text-white"
                      : "bg-[#0F1626]/80 border-slate-800/80 hover:border-slate-700 hover:bg-[#131D31]/90 text-slate-300",
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={cn(
                        "size-8 rounded-xl flex items-center justify-center border",
                        node.color,
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 font-bold px-1.5 py-0.5 rounded-md bg-[#090D16]">
                      L0{index + 1}
                    </span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 truncate">{node.level}</span>
                  <span className="text-xs font-extrabold text-slate-100 truncate mt-0.5">{node.name}</span>
                  <span className="text-[10px] font-mono text-blue-400 mt-1 font-semibold">{node.metric}</span>
                </button>

                {index < NODES.length - 1 && (
                  <ArrowRight className="size-3.5 text-slate-600 mx-1 shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Deep Dive Node Inspection Card */}
      <div className="p-6 rounded-3xl bg-[#111827]/90 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "size-12 rounded-2xl flex items-center justify-center border shadow-md",
                activeNode.color,
                "bg-[#090D16]",
              )}
            >
              <activeNode.icon className="size-6" />
            </span>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {activeNode.level}
              </span>
              <h3 className="text-lg font-extrabold text-white">{activeNode.name}</h3>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-bold font-mono">
            {activeNode.metric}
          </span>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed bg-[#090D16]/80 p-4 rounded-2xl border border-slate-800/80">
          {activeNode.details}
        </p>

        {/* Operational takeaway */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3.5 rounded-xl bg-[#090D16]/80 border border-slate-800/80">
            <span className="text-[11px] text-slate-400 uppercase font-bold block mb-1">Packaging Hierarchy</span>
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-emerald-400" />
              1 Physical Box per Building
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#090D16]/80 border border-slate-800/80">
            <span className="text-[11px] text-slate-400 uppercase font-bold block mb-1">Student Quota Policy</span>
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-blue-400" />
              Dynamic Room Roster Allocations
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#090D16]/80 border border-slate-800/80">
            <span className="text-[11px] text-slate-400 uppercase font-bold block mb-1">Supervision Ratio</span>
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-amber-400" />
              1 Senior Proctor per Floor Wing
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
