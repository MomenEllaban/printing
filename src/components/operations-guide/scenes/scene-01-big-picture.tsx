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
  Info,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/cn";

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
    color: "from-blue-600 to-indigo-600 text-blue-400 border-blue-500/30",
  },
  {
    id: "session",
    level: "Tier 2: Examination Date",
    name: "Session: December 2026",
    details: "Specific testing cycle window with locked question variants, security codes, and rosters.",
    icon: Calendar,
    metric: "Cycle Window",
    color: "from-indigo-600 to-violet-600 text-indigo-400 border-indigo-500/30",
  },
  {
    id: "governorate",
    level: "Tier 3: Governorate Zone",
    name: "Governorate: Damietta",
    details: "Territorial logistics partition coordinating transport convoys, regional leads, and deliveries.",
    icon: MapPin,
    metric: "Regional Route",
    color: "from-violet-600 to-purple-600 text-violet-400 border-violet-500/30",
  },
  {
    id: "center",
    level: "Tier 4: Test Center",
    name: "Center: Damietta Main School",
    details: "Physical school or university campus hosting candidate arrival, security gates, and control.",
    icon: Building2,
    metric: "Center HQ",
    color: "from-purple-600 to-fuchsia-600 text-purple-400 border-purple-500/30",
  },
  {
    id: "building",
    level: "Tier 5: Examination Building",
    name: "Building: Building A (Primary)",
    details: "Discrete structural facility containing dedicated Chief Proctor control room and multiple floors.",
    icon: Building2,
    metric: "Building Unit",
    color: "from-emerald-600 to-teal-600 text-emerald-400 border-emerald-500/30",
  },
  {
    id: "floors",
    level: "Tier 6: Floor Wings",
    name: "Floors: 1st, 2nd, 3rd Floors",
    details: "Supervised floor wings managed by Senior Proctors with dedicated Floor Transit Bags.",
    icon: Layers,
    metric: "3 Floor Bags",
    color: "from-amber-600 to-orange-600 text-amber-400 border-amber-500/30",
  },
  {
    id: "rooms",
    level: "Tier 7: Candidate Rooms",
    name: "Rooms: Room 101 – 112",
    details: "Individual testing halls (25 candidates each) with Room Dossiers and assigned proctors.",
    icon: DoorOpen,
    metric: "12 Enclosed Rooms",
    color: "from-rose-600 to-pink-600 text-rose-400 border-rose-500/30",
  },
];

export function Scene01BigPicture() {
  const [selectedNodeId, setSelectedNodeId] = useState<string>("building");

  const activeNode = NODES.find((n) => n.id === selectedNodeId) || NODES[4];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/60 to-slate-900 border border-indigo-800/40 text-slate-200">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="size-4 text-indigo-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
            Top-Down Operations Architecture
          </span>
        </div>
        <p className="text-sm text-slate-300">
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
                      ? "bg-slate-800/90 border-indigo-400 shadow-lg shadow-indigo-500/20 scale-105 ring-2 ring-indigo-500/40"
                      : "bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40",
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={cn(
                        "size-8 rounded-xl flex items-center justify-center border",
                        node.color,
                        "bg-slate-950/80",
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 font-bold px-1.5 py-0.5 rounded-md bg-slate-950">
                      L0{index + 1}
                    </span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 truncate">{node.level}</span>
                  <span className="text-xs font-extrabold text-white truncate mt-0.5">{node.name}</span>
                  <span className="text-[10px] font-mono text-indigo-400 mt-1 font-semibold">{node.metric}</span>
                </button>

                {index < NODES.length - 1 && (
                  <ArrowRight className="size-4 text-slate-600 mx-1 shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Deep Dive Node Inspection Card */}
      <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "size-12 rounded-2xl flex items-center justify-center border bg-slate-950 shadow-md",
                activeNode.color,
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
          <span className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold font-mono">
            {activeNode.metric}
          </span>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/40 p-4 rounded-2xl border border-slate-800/80">
          {activeNode.details}
        </p>

        {/* Operational takeaway */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[11px] text-slate-400 uppercase font-bold block mb-1">Logistics Unit</span>
            <span className="text-xs font-semibold text-white flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-emerald-400" />
              1 Physical Box per Building
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[11px] text-slate-400 uppercase font-bold block mb-1">Standard Quota</span>
            <span className="text-xs font-semibold text-white flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-indigo-400" />
              25 Candidates per Room
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[11px] text-slate-400 uppercase font-bold block mb-1">Supervision Ratio</span>
            <span className="text-xs font-semibold text-white flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-purple-400" />
              1 Senior per 4 Rooms
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

