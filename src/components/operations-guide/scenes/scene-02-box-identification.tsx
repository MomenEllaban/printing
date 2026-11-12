"use client";

import { useState, useRef } from "react";
import {
  Rotate3D,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Maximize2,
  FileCheck,
  ShieldCheck,
  Package,
  Layers,
  Building2,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { GUIDE_THEME } from "../shared/guide-theme";

export function Scene02BoxIdentification() {
  const [rotX, setRotX] = useState<number>(-14);
  const [rotY, setRotY] = useState<number>(24);
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

    setRotY((prev) => prev + deltaX * 0.4);
    setRotX((prev) => Math.max(-50, Math.min(50, prev - deltaY * 0.4)));
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const setViewPreset = (x: number, y: number, s: number = 1) => {
    setRotX(x);
    setRotY(y);
    setScale(s);
  };

  return (
    <div className="space-y-6">
      {/* Scenario Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-[#111827]/90 border border-slate-800 text-slate-200 shadow-md">
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

        {/* 3D Viewport Controls & Presets */}
        <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto bg-[#090D16] p-1.5 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setViewPreset(0, 0, 1.05)}
            className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Front View
          </button>
          <button
            type="button"
            onClick={() => setViewPreset(-14, 24, 1)}
            className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 transition-colors cursor-pointer"
          >
            3D Isometric
          </button>
          <button
            type="button"
            onClick={() => setViewPreset(-45, 0, 1.05)}
            className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Top (Lid)
          </button>
          <div className="w-px h-4 bg-slate-800 mx-1" />
          <button
            type="button"
            onClick={() => setScale((s) => Math.min(1.3, s + 0.1))}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setScale((s) => Math.max(0.7, s - 0.1))}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setViewPreset(-14, 24, 1)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Reset 3D Angle"
          >
            <RotateCcw className="size-3.5" />
          </button>
        </div>
      </div>

      {/* 3D Cardboard Box Interactive Viewport */}
      <div
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="relative h-[400px] sm:h-[460px] rounded-3xl bg-[#0B101D] border border-slate-800/90 overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing select-none shadow-2xl"
        style={{ perspective: 1200 }}
      >
        {/* Soft Ambient Spotlight */}
        <div className="absolute inset-0 bg-radial from-blue-600/10 via-transparent to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b0a_1px,transparent_1px),linear-gradient(to_bottom,#1e293b0a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

        {/* 3D Box Assembly Container */}
        <div
          className="relative transition-transform duration-75 transform-gpu will-change-transform"
          style={{
            transformStyle: "preserve-3d",
            transform: `scale(${scale}) rotateX(${rotX}deg) rotateY(${rotY}deg)`,
            width: 270,
            height: 205,
          }}
        >
          {/* FRONT FACE (Carries Official Placard) */}
          <div
            className="absolute inset-0 rounded-2xl bg-[#BA844C] border-2 border-[#8A5A2B] shadow-2xl p-3 flex flex-col justify-between"
            style={{
              transform: "translateZ(115px)",
              backgroundImage: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(0,0,0,0.2) 100%)",
            }}
          >
            {/* Box Header Text */}
            <div className="flex justify-between items-center text-[10px] text-[#4A2800] font-mono font-black tracking-wider">
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
              className="group/placard w-full p-2.5 rounded-xl bg-white text-slate-900 shadow-xl border-2 border-slate-300 text-left transition-all hover:scale-[1.02] cursor-pointer"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-amber-500" />
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-800">
                    EST 1 • MASTER CARTON PLACARD
                  </span>
                </div>
                <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                  DEC 2026
                </span>
              </div>
              <div className="space-y-0.5 text-[9.5px]">
                <div className="font-extrabold text-slate-900 truncate">
                  DAMIETTA • MAIN TEST CENTER
                </div>
                <div className="text-slate-600 font-medium">Building A (12 Rooms Enclosed)</div>
              </div>
              <div className="mt-1.5 pt-1 border-t border-dashed border-slate-300 flex items-center justify-between text-[9px] font-bold text-blue-700">
                <span>BUILDING: A</span>
                <span className="group-hover/placard:underline flex items-center gap-0.5 text-blue-600">
                  Inspect Placard <Maximize2 className="size-2.5" />
                </span>
              </div>
            </button>

            {/* Tamper Evident Packing Tape Strip */}
            <div className="h-4 rounded bg-[#7A481B]/60 border-y border-[#5E330D] flex items-center justify-center text-[8px] font-mono text-amber-200/80 font-bold tracking-wider">
              EST OFFICIAL SECURITY SEAL • #EST-DAM-99412
            </div>
          </div>

          {/* BACK FACE */}
          <div
            className="absolute inset-0 rounded-2xl bg-[#9E6B36] border-2 border-[#7A4B20] shadow-2xl p-4 flex flex-col justify-center items-center text-center text-[#4A2800] font-mono text-xs"
            style={{ transform: "rotateY(180deg) translateZ(115px)" }}
          >
            <p className="font-extrabold text-[11px]">EGYPTIAN SCHOLASTIC TEST (EST)</p>
            <p className="text-[9px] mt-1 text-[#4A2800]/80">MINISTRY OF EDUCATION & TECHNICAL EDUCATION</p>
            <p className="text-[8px] mt-3 font-mono text-[#4A2800]">SEAL: #EST-DAM-99412-SEAL</p>
          </div>

          {/* LEFT FACE */}
          <div
            className="absolute inset-0 rounded-2xl bg-[#AB763F] border-2 border-[#7A4B20] shadow-xl p-4 flex flex-col justify-between"
            style={{
              width: 230,
              transform: "rotateY(-90deg) translateZ(115px)",
              left: 20,
            }}
          >
            <div className="size-7 rounded-full border-2 border-dashed border-[#5A320A] mx-auto flex items-center justify-center text-[8px] font-bold text-[#5A320A]">
              HANDLE
            </div>
            <div className="text-center font-mono text-[9px] text-[#4A2800] font-bold">
              EST 1 CARRIER CARTON
            </div>
          </div>

          {/* RIGHT FACE */}
          <div
            className="absolute inset-0 rounded-2xl bg-[#AB763F] border-2 border-[#7A4B20] shadow-xl p-4 flex flex-col justify-between"
            style={{
              width: 230,
              transform: "rotateY(90deg) translateZ(155px)",
              left: 20,
            }}
          >
            <div className="size-7 rounded-full border-2 border-dashed border-[#5A320A] mx-auto flex items-center justify-center text-[8px] font-bold text-[#5A320A]">
              HANDLE
            </div>
            <div className="text-center font-mono text-[9px] text-[#4A2800] font-bold">
              CENTRAL CUSTODY DISPATCH
            </div>
          </div>

          {/* TOP FACE (LID) */}
          <div
            className="absolute inset-0 rounded-2xl bg-[#BA844C] border-2 border-[#8A5A2B] shadow-lg flex items-center justify-center"
            style={{
              height: 230,
              transform: "rotateX(90deg) translateZ(102px)",
              top: -12,
            }}
          >
            <div className="w-full h-8 bg-[#7A481B]/50 border-y border-[#5E330D] flex items-center justify-center text-[10px] font-mono font-bold text-amber-200">
              ◄ TAMPER-EVIDENT REINFORCED PACKING TAPE ►
            </div>
          </div>

          {/* BOTTOM FACE */}
          <div
            className="absolute inset-0 rounded-2xl bg-[#8A5A2B] border-2 border-black"
            style={{
              height: 230,
              transform: "rotateX(-90deg) translateZ(102px)",
              top: -12,
            }}
          />
        </div>

        {/* Drag Helper Tip */}
        <div className="absolute bottom-4 start-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#111827]/90 border border-slate-700/80 text-slate-300 text-xs pointer-events-none backdrop-blur-md">
          <Rotate3D className="size-4 text-blue-400" />
          <span>Click & Drag to rotate cardboard box in 3D</span>
        </div>
      </div>

      {/* Educational Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-[#111827]/90 border border-slate-800 space-y-1.5 shadow-md">
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <CheckCircle2 className="size-4" /> 1. Center & Exam Session
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            The placard clearly establishes whether the carton belongs to EST 1 or EST 2, and names the exact school center campus.
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[#111827]/90 border border-slate-800 space-y-1.5 shadow-md">
          <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
            <Building2 className="size-4" /> 2. Building & Floor Directory
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            Lists all constituent floors (e.g., 1st, 2nd, 3rd) and enclosed rooms with checkoff boxes for packing verification.
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[#111827]/90 border border-slate-800 space-y-1.5 shadow-md">
          <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <ShieldCheck className="size-4" /> 3. Tamper-Evident Security
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            Sealed with serialized anti-tamper security tape. Any unrecorded tear or opening invalidates the custody chain.
          </p>
        </div>
      </div>

      {/* PLACARD INSPECTION MODAL */}
      {isPlacardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white text-slate-900 shadow-2xl border-4 border-slate-300 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b-2 border-slate-200 pb-3">
              <div className="flex items-center gap-3">
                <span className="size-3 rounded-full bg-amber-500" />
                <div>
                  <h3 className="text-base font-black tracking-tight text-slate-900">
                    MASTER BUILDING CARTON PLACARD
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Official External Identification Label (A4 Landscape Format)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPlacardModalOpen(false)}
                className="size-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Placard Metadata Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-slate-100 font-mono text-xs border border-slate-200">
              <div>
                <span className="text-[10px] text-slate-500 block">EXAM LEVEL:</span>
                <span className="font-extrabold text-slate-900">EST I (Session 1)</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">GOVERNORATE:</span>
                <span className="font-extrabold text-slate-900">Damietta</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">TEST CENTER:</span>
                <span className="font-extrabold text-slate-900 truncate block">Main School</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">BUILDING:</span>
                <span className="font-extrabold text-amber-700">Building A</span>
              </div>
            </div>

            {/* Floors and Rooms Check-Off Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>ENCLOSED FLOORS & ROOMS DIRECTORY</span>
                <span className="text-[10px] text-slate-500 font-mono">
                  [ CHECK OFF [✓] EACH ROOM PACKET UPON PACKING ]
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Floor 1 */}
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="text-xs font-black text-slate-800 pb-1 border-b border-slate-200">
                    FIRST FLOOR (4 Rooms)
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-xs font-mono">
                    <span className="p-1 rounded bg-white border border-slate-200 text-center font-bold">
                      [ ] Room 101
                    </span>
                    <span className="p-1 rounded bg-white border border-slate-200 text-center font-bold">
                      [ ] Room 102
                    </span>
                    <span className="p-1 rounded bg-white border border-slate-200 text-center font-bold">
                      [ ] Room 103
                    </span>
                    <span className="p-1 rounded bg-white border border-slate-200 text-center font-bold">
                      [ ] Room 104
                    </span>
                  </div>
                </div>

                {/* Floor 2 */}
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="text-xs font-black text-slate-800 pb-1 border-b border-slate-200">
                    SECOND FLOOR (4 Rooms)
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-xs font-mono">
                    <span className="p-1 rounded bg-white border border-slate-200 text-center font-bold">
                      [ ] Room 201
                    </span>
                    <span className="p-1 rounded bg-white border border-slate-200 text-center font-bold">
                      [ ] Room 202
                    </span>
                    <span className="p-1 rounded bg-white border border-slate-200 text-center font-bold">
                      [ ] Room 203
                    </span>
                    <span className="p-1 rounded bg-white border border-slate-200 text-center font-bold">
                      [ ] Room 204
                    </span>
                  </div>
                </div>

                {/* Floor 3 */}
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="text-xs font-black text-slate-800 pb-1 border-b border-slate-200">
                    THIRD FLOOR (4 Rooms)
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-xs font-mono">
                    <span className="p-1 rounded bg-white border border-slate-200 text-center font-bold">
                      [ ] Room 301
                    </span>
                    <span className="p-1 rounded bg-white border border-slate-200 text-center font-bold">
                      [ ] Room 302
                    </span>
                    <span className="p-1 rounded bg-white border border-slate-200 text-center font-bold">
                      [ ] Room 303
                    </span>
                    <span className="p-1 rounded bg-white border border-slate-200 text-center font-bold">
                      [ ] Room 304
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Seal & Dispatch Footer */}
            <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 font-mono">
              <div>
                <span className="text-slate-500 text-[10px] block">SECURITY SEAL SERIAL:</span>
                <span className="font-extrabold text-slate-900">#EST-DAM-99412-SEAL</span>
              </div>
              <div className="text-slate-600 text-[11px]">
                Authorized Packing Station • Cairo Operations HQ
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
