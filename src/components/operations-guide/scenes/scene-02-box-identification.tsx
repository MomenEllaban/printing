"use client";

import { useState, useRef } from "react";
import {
  Rotate3D,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  Info,
  CheckCircle2,
  Maximize2,
  FileCheck,
} from "lucide-react";
import { cn } from "@/lib/cn";

export function Scene02BoxIdentification() {
  const [rotX, setRotX] = useState<number>(-12);
  const [rotY, setRotY] = useState<number>(22);
  const [scale, setScale] = useState<number>(1);
  const [isPlacardModalOpen, setIsPlacardModalOpen] = useState<boolean>(false);
  const isDragging = useRef<boolean>(false);
  const lastMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const deltaX = e.clientX - lastMousePos.current.x;
    const deltaY = e.clientY - lastMousePos.current.y;
    lastMousePos.current = { x: e.clientX, y: e.clientY };

    setRotY((prev) => prev + deltaX * 0.5);
    setRotX((prev) => Math.max(-50, Math.min(50, prev - deltaY * 0.5)));
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const resetRotation = () => {
    setRotX(-12);
    setRotY(22);
    setScale(1);
  };

  return (
    <div className="space-y-6">
      {/* Scenario Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Representative Case Scenario
            </span>
          </div>
          <p className="text-sm font-extrabold text-white">
            Damietta Governorate • EST 1 (Friday Session) • Damietta Main Center • Building A
          </p>
        </div>

        {/* 3D Viewport Controls */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setScale((s) => Math.min(1.3, s + 0.1))}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setScale((s) => Math.max(0.7, s - 0.1))}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="size-4" />
          </button>
          <button
            type="button"
            onClick={resetRotation}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Reset 3D Angle"
          >
            <RotateCcw className="size-4" />
          </button>
        </div>
      </div>

      {/* 3D Cardboard Box Interactive Viewport */}
      <div
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="relative h-[380px] sm:h-[440px] rounded-3xl bg-radial from-slate-800/80 to-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
        style={{ perspective: 1200 }}
      >
        {/* Background Grid Accent */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b0f_1px,transparent_1px),linear-gradient(to_bottom,#1e293b0f_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

        {/* 3D Box Assembly Container */}
        <div
          className="relative transition-transform duration-75"
          style={{
            transformStyle: "preserve-3d",
            transform: `scale(${scale}) rotateX(${rotX}deg) rotateY(${rotY}deg)`,
            width: 260,
            height: 200,
          }}
        >
          {/* FRONT FACE (Carries Placard) */}
          <div
            className="absolute inset-0 rounded-2xl bg-amber-800/90 border-2 border-amber-900/80 shadow-2xl p-3 flex flex-col justify-between"
            style={{
              transform: "translateZ(110px)",
              backgroundImage: "linear-gradient(135deg, rgba(217, 119, 6, 0.15) 0%, rgba(146, 64, 14, 0.4) 100%)",
            }}
          >
            {/* Box Fragile / Orientation Icons */}
            <div className="flex justify-between items-center text-[10px] text-amber-200/60 font-mono font-bold">
              <span>↑ THIS WAY UP ↑</span>
              <span>BOX 01 / 01</span>
            </div>

            {/* Clickable Master Building Placard */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsPlacardModalOpen(true);
              }}
              className="group/placard w-full p-2.5 rounded-xl bg-white text-slate-900 shadow-xl border-2 border-amber-950 text-left transition-all hover:scale-[1.02] cursor-pointer"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-1">
                <span className="text-[10px] font-extrabold text-amber-800 tracking-wider">
                  EST I — BUILDING PLACARD
                </span>
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-xs font-black text-slate-900 leading-tight">DAMIETTA SECONDARY</p>
              <div className="flex items-center justify-between text-[9px] text-slate-600 mt-1 font-mono font-bold">
                <span>GOV: DAMIETTA</span>
                <span>DAY: FRIDAY</span>
              </div>
              <div className="mt-1 pt-1 border-t border-dashed border-slate-300 flex items-center justify-between text-[9px] font-bold text-indigo-700">
                <span>BUILDING: A</span>
                <span className="group-hover/placard:underline flex items-center gap-0.5">
                  Inspect <Maximize2 className="size-2.5" />
                </span>
              </div>
            </button>

            {/* Carton Tape Strip */}
            <div className="h-4 rounded bg-amber-950/40 border-y border-amber-700/30 flex items-center justify-center text-[8px] font-mono text-amber-300/40">
              TAMPER EVIDENT SECURITY SEAL
            </div>
          </div>

          {/* BACK FACE */}
          <div
            className="absolute inset-0 rounded-2xl bg-amber-900 border-2 border-amber-950 shadow-2xl p-4 flex flex-col justify-center items-center text-center text-amber-400/40 font-mono text-xs"
            style={{ transform: "rotateY(180deg) translateZ(110px)" }}
          >
            <p className="font-bold">MINISTRY OF EDUCATION & TECH EDUCATION</p>
            <p className="text-[9px] mt-1">EGYPTIAN SCHOLASTIC TEST (EST)</p>
            <p className="text-[8px] mt-4 font-mono">SEAL NUMBER: #EST-DM-2026-994</p>
          </div>

          {/* LEFT FACE */}
          <div
            className="absolute inset-0 rounded-2xl bg-amber-800/80 border-2 border-amber-900 shadow-xl p-4 flex flex-col justify-between"
            style={{
              width: 220,
              transform: "rotateY(-90deg) translateZ(110px)",
              left: 20,
            }}
          >
            <div className="size-8 rounded-full border-2 border-dashed border-amber-950/60 mx-auto flex items-center justify-center text-[9px] font-bold text-amber-950/80">
              HANDLE
            </div>
            <div className="text-center font-mono text-[9px] text-amber-300/60 font-bold">
              EST 1 CARRIER UNIT
            </div>
          </div>

          {/* RIGHT FACE */}
          <div
            className="absolute inset-0 rounded-2xl bg-amber-800/80 border-2 border-amber-900 shadow-xl p-4 flex flex-col justify-between"
            style={{
              width: 220,
              transform: "rotateY(90deg) translateZ(150px)",
              left: 20,
            }}
          >
            <div className="size-8 rounded-full border-2 border-dashed border-amber-950/60 mx-auto flex items-center justify-center text-[9px] font-bold text-amber-950/80">
              HANDLE
            </div>
            <div className="text-center font-mono text-[9px] text-amber-300/60 font-bold">
              CENTRAL CUSTODY
            </div>
          </div>

          {/* TOP FACE (LID) */}
          <div
            className="absolute inset-0 rounded-2xl bg-amber-700/90 border-2 border-amber-800 shadow-lg flex items-center justify-center"
            style={{
              height: 220,
              transform: "rotateX(90deg) translateZ(100px)",
              top: -10,
            }}
          >
            <div className="w-full h-8 bg-amber-950/30 border-y border-amber-600/40 flex items-center justify-center text-[10px] font-mono font-bold text-amber-200/70">
              ◄ REINFORCED SECURITY PACKING STRIP ►
            </div>
          </div>

          {/* BOTTOM FACE */}
          <div
            className="absolute inset-0 rounded-2xl bg-amber-950 border-2 border-black"
            style={{
              height: 220,
              transform: "rotateX(-90deg) translateZ(100px)",
              top: -10,
            }}
          />
        </div>

        {/* Drag Helper Tip */}
        <div className="absolute bottom-4 start-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-700/60 text-slate-300 text-xs pointer-events-none">
          <Rotate3D className="size-4 text-indigo-400" />
          <span>Click & Drag to rotate cardboard box in 3D</span>
        </div>
      </div>

      {/* Educational Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <CheckCircle2 className="size-4" /> 1. Center & Exam Session
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            The placard clearly establishes whether the carton belongs to EST 1 or EST 2, and names the exact school center campus.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="size-4" /> 2. Examination Day
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            Examination day (e.g. Friday or Saturday) is boldly printed to ensure delivery trucks do not unload materials on the incorrect testing morning.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
            <CheckCircle2 className="size-4" /> 3. Building Segregation
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            Multi-building centers receive dedicated individual cartons per building (e.g., Building A, Building B) to keep custody isolated.
          </p>
        </div>
      </div>

      {/* Modal for Placard Close-Up */}
      {isPlacardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl border border-slate-700 bg-white p-6 shadow-2xl text-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
              <div>
                <span className="text-[11px] font-mono font-bold uppercase text-amber-700 tracking-wider">
                  Official Placard Specification
                </span>
                <h3 className="text-xl font-black text-slate-900">MASTER BUILDING CARTON PLACARD</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPlacardModalOpen(false)}
                className="size-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-black hover:bg-slate-100 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-slate-100 border border-slate-300 grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500 block text-[10px]">EXAM SESSION:</span>
                  <span className="font-extrabold text-sm text-slate-900">EST I</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">DAY OF TEST:</span>
                  <span className="font-extrabold text-sm text-slate-900">FRIDAY</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">GOVERNORATE:</span>
                  <span className="font-extrabold text-slate-900">DAMIETTA</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">BUILDING:</span>
                  <span className="font-extrabold text-slate-900">BUILDING A</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block text-[10px]">TEST CENTER NAME:</span>
                <span className="font-bold text-sm text-slate-900">DAMIETTA SECONDARY EXPERIMENTAL SCHOOL</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-sans">
              This placard is automatically generated by the EST Logistics System and adhered to the exterior of the cardboard carton with heavy-duty transparent packaging laminate.
            </p>

            <button
              type="button"
              onClick={() => setIsPlacardModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Return to 3D Inspection
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

