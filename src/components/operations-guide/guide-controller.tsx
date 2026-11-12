"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Compass,
  GraduationCap,
  Layers,
  Maximize2,
  Minimize2,
  RotateCcw,
  Sparkles,
  X,
  Package,
  FileText,
  Map,
  CheckCircle2,
} from "lucide-react";
import { SCENES_METADATA } from "./guide-data";
import type { SceneMeta } from "./guide-types";
import { GUIDE_THEME } from "./shared/guide-theme";

// Scenes
import { Scene01BigPicture } from "./scenes/scene-01-big-picture";
import { Scene02BoxIdentification } from "./scenes/scene-02-box-identification";
import { Scene03OpeningBox } from "./scenes/scene-03-opening-box";
import { Scene04HeadControlBag } from "./scenes/scene-04-head-control-bag";
import { Scene05AssnBag } from "./scenes/scene-05-assn-bag";
import { Scene06FloorBagBreakdown } from "./scenes/scene-06-floor-bag-breakdown";
import { Scene07SeniorFolder } from "./scenes/scene-07-senior-folder";
import { Scene08RoomFolders } from "./scenes/scene-08-room-folders";
import { Scene09Workflow01Summary } from "./scenes/scene-09-workflow-01-summary";
import { Scene10MaterialsBigPicture } from "./scenes/scene-10-materials-big-picture";
import { Scene11GrayFile } from "./scenes/scene-11-gray-file";
import { Scene12SubjectStickers } from "./scenes/scene-12-subject-stickers";
import { Scene13StudentCountVerification } from "./scenes/scene-13-student-count-verification";
import { Scene14AssnRoomStickers } from "./scenes/scene-14-assn-room-stickers";
import { Scene15FloorBagStickers } from "./scenes/scene-15-floor-bag-stickers";
import { Scene16ExternalShippingBags } from "./scenes/scene-16-external-shipping-bags";
import { Scene17FinalShipping } from "./scenes/scene-17-final-shipping";
import { Scene18MasterOverview } from "./scenes/scene-18-master-overview";

export function GuideController() {
  const [activeSceneIndex, setActiveSceneIndex] = useState<number>(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [sceneKey, setSceneKey] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentScene = SCENES_METADATA[activeSceneIndex];
  const totalScenes = SCENES_METADATA.length;
  const progressPercent = Math.round(((activeSceneIndex + 1) / totalScenes) * 100);

  // Navigation handlers
  const goToNext = useCallback(() => {
    setActiveSceneIndex((prev) => (prev < totalScenes - 1 ? prev + 1 : prev));
    setSceneKey((k) => k + 1);
  }, [totalScenes]);

  const goToPrev = useCallback(() => {
    setActiveSceneIndex((prev) => (prev > 0 ? prev - 1 : prev));
    setSceneKey((k) => k + 1);
  }, []);

  const jumpToScene = useCallback(
    (index: number) => {
      if (index >= 0 && index < totalScenes) {
        setActiveSceneIndex(index);
        setSceneKey((k) => k + 1);
        setIsDrawerOpen(false);
      }
    },
    [totalScenes],
  );

  const replayAnimation = () => {
    setSceneKey((k) => k + 1);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        goToNext();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        goToPrev();
      } else if (e.key === "Escape") {
        setIsDrawerOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNext, goToPrev]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  // Render the active scene component
  const renderSceneComponent = () => {
    switch (activeSceneIndex) {
      case 0:
        return <Scene01BigPicture />;
      case 1:
        return <Scene02BoxIdentification />;
      case 2:
        return <Scene03OpeningBox />;
      case 3:
        return <Scene04HeadControlBag />;
      case 4:
        return <Scene05AssnBag />;
      case 5:
        return <Scene06FloorBagBreakdown />;
      case 6:
        return <Scene07SeniorFolder />;
      case 7:
        return <Scene08RoomFolders />;
      case 8:
        return <Scene09Workflow01Summary onGoToWorkflow2={() => jumpToScene(9)} />;
      case 9:
        return <Scene10MaterialsBigPicture />;
      case 10:
        return <Scene11GrayFile />;
      case 11:
        return <Scene12SubjectStickers />;
      case 12:
        return <Scene13StudentCountVerification />;
      case 13:
        return <Scene14AssnRoomStickers />;
      case 14:
        return <Scene15FloorBagStickers />;
      case 15:
        return <Scene16ExternalShippingBags />;
      case 16:
        return <Scene17FinalShipping />;
      case 17:
        return <Scene18MasterOverview onNavigateToScene={jumpToScene} />;
      default:
        return <Scene01BigPicture />;
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative min-h-[90vh] flex flex-col justify-between space-y-6 max-w-7xl mx-auto rounded-3xl bg-[#090D16] border border-slate-800/80 p-4 sm:p-6 lg:p-7 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.8)] overflow-hidden text-slate-100"
    >
      {/* Top Ambient Glow & Subtle Blueprint Grid */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[850px] h-[240px] bg-gradient-to-b from-blue-600/10 via-indigo-600/5 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b0f_1px,transparent_1px),linear-gradient(to_bottom,#1e293b0f_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none opacity-30" />

      {/* TOP COMMAND BAR */}
      <header className="relative z-30 rounded-2xl bg-[#111827]/90 backdrop-blur-xl border border-slate-800/90 p-4 sm:p-5 shadow-xl shadow-black/40 space-y-3.5">
        {/* Progress Line */}
        <div className="h-1.5 w-full rounded-full bg-slate-800/80 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 transition-all duration-300 shadow-sm"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Row 1: Logo & Workflow Switcher Tabs */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Logo & Breadcrumb Info */}
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shrink-0 shadow-lg shadow-blue-600/20 border border-blue-400/30">
              <GraduationCap className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-blue-400">
                  EST OPERATIONS PLATFORM
                </span>
                <span className="text-[10px] text-slate-500">•</span>
                <span className="text-[10px] font-mono text-slate-400">EXECUTIVE GUIDE</span>
              </div>
              <h1 className="text-base sm:text-lg font-black text-white tracking-tight">
                {currentScene.title}
              </h1>
            </div>
          </div>

          {/* Quick Direct Workflow Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#090D16]/90 border border-slate-800/90 text-xs font-bold overflow-x-auto">
            {/* Tab 1: Workflow 01 */}
            <button
              type="button"
              onClick={() => jumpToScene(0)}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                currentScene.workflow === "workflow-1"
                  ? "bg-amber-500/20 border border-amber-500/40 text-amber-300 shadow-xs"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Package className="size-3.5 text-amber-400" />
              <span>Workflow 01: Box Prep</span>
              <span className="text-[10px] font-mono opacity-60">(1-9)</span>
            </button>

            {/* Tab 2: Workflow 02 */}
            <button
              type="button"
              onClick={() => jumpToScene(9)}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                currentScene.workflow === "workflow-2"
                  ? "bg-blue-500/20 border border-blue-500/40 text-blue-300 shadow-xs"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <FileText className="size-3.5 text-blue-400" />
              <span>Workflow 02: Materials & Shipping</span>
              <span className="text-[10px] font-mono opacity-60">(10-17)</span>
            </button>

            {/* Tab 3: Master Overview */}
            <button
              type="button"
              onClick={() => jumpToScene(17)}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                currentScene.workflow === "master-overview"
                  ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 shadow-xs"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Map className="size-3.5 text-emerald-400" />
              <span>Master Architecture</span>
              <span className="text-[10px] font-mono opacity-60">(18)</span>
            </button>
          </div>

          {/* Quick Action Tools */}
          <div className="flex items-center gap-2 self-end lg:self-center">
            {/* Replay Scene */}
            <button
              type="button"
              onClick={replayAnimation}
              className="p-2 rounded-xl border border-slate-700/80 bg-slate-800/60 hover:bg-slate-700/80 text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Replay scene animations"
            >
              <RotateCcw className="size-4" />
            </button>

            {/* Scene Index Drawer */}
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="px-3 py-1.5 rounded-xl border border-slate-700/80 bg-slate-800/60 hover:bg-slate-700/80 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Compass className="size-4 text-blue-400" />
              <span className="hidden sm:inline">Index</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900 text-slate-300">
                {activeSceneIndex + 1}/{totalScenes}
              </span>
            </button>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2 rounded-xl border border-slate-700/80 bg-slate-800/60 hover:bg-slate-700/80 text-slate-300 hover:text-white transition-all cursor-pointer"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Presentation Mode"}
            >
              {isFullscreen ? <Minimize2 className="size-4 text-blue-400" /> : <Maximize2 className="size-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* MAIN VIEWPORT CONTAINER */}
      <main key={sceneKey} className="relative z-10 flex-1 animate-in fade-in duration-300">
        {renderSceneComponent()}
      </main>

      {/* PRESENTATION NAVIGATION FOOTER DOCK */}
      <footer className="relative z-30 p-3.5 sm:p-4 rounded-2xl bg-[#111827]/90 backdrop-blur-xl border border-slate-800/90 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Previous Button */}
        <button
          type="button"
          onClick={goToPrev}
          disabled={activeSceneIndex === 0}
          className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSceneIndex === 0
              ? "opacity-30 cursor-not-allowed bg-slate-900 text-slate-600 border border-slate-800"
              : "bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white shadow-xs hover:scale-[1.02] active:scale-[0.98]"
          }`}
        >
          <ArrowLeft className="size-4" />
          <span>Previous Scene</span>
        </button>

        {/* Center Progress Dot Stepper */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-1.5">
            {SCENES_METADATA.map((s: SceneMeta, idx: number) => {
              const isActive = activeSceneIndex === idx;
              const isW1 = s.workflow === "workflow-1";
              const isW2 = s.workflow === "workflow-2";
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => jumpToScene(idx)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    isActive
                      ? isW1
                        ? "w-6 bg-amber-400 shadow-sm shadow-amber-500/50"
                        : isW2
                        ? "w-6 bg-blue-400 shadow-sm shadow-blue-500/50"
                        : "w-6 bg-emerald-400 shadow-sm shadow-emerald-500/50"
                      : "w-1.5 bg-slate-700 hover:bg-slate-500"
                  }`}
                  title={`Scene ${idx + 1}: ${s.title}`}
                />
              );
            })}
          </div>
          <span className="text-[10px] text-slate-400 font-mono hidden md:inline">
            Press [←] and [→] keyboard arrow keys to navigate
          </span>
        </div>

        {/* Next Button */}
        <button
          type="button"
          onClick={goToNext}
          disabled={activeSceneIndex === totalScenes - 1}
          className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSceneIndex === totalScenes - 1
              ? "opacity-30 cursor-not-allowed bg-slate-900 text-slate-600 border border-slate-800"
              : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/30 hover:scale-[1.02] active:scale-[0.98]"
          }`}
        >
          <span>Next Scene</span>
          <ArrowRight className="size-4" />
        </button>
      </footer>

      {/* SCENE DIRECTORY MODAL */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-3xl max-h-[85vh] rounded-3xl bg-[#0F1626] border border-slate-700/80 shadow-2xl flex flex-col overflow-hidden ring-1 ring-white/10">
            {/* Modal Header */}
            <div className="p-4 px-6 border-b border-slate-800 bg-[#090D16]/90 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Compass className="size-5 text-blue-400" />
                <h3 className="text-base font-extrabold text-white">
                  EST Operations Presentation — Scene Directory
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Scenes Scrollable List */}
            <div className="p-5 px-6 overflow-y-auto space-y-5 text-xs">
              {/* Section 1 */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block mb-2 flex items-center gap-1.5">
                  <Package className="size-3.5" />
                  <span>Workflow 01: Center & Building Box Preparation (Scenes 01 – 09)</span>
                </span>
                <div className="space-y-1.5">
                  {SCENES_METADATA.slice(0, 9).map((sc: SceneMeta, idx: number) => (
                    <div
                      key={sc.id}
                      onClick={() => jumpToScene(idx)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                        activeSceneIndex === idx
                          ? "bg-amber-500/15 border-amber-500/50 text-white font-bold ring-1 ring-amber-500/30"
                          : "bg-[#090D16]/80 border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/60 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[10px] text-amber-400/80 font-bold">0{idx + 1}</span>
                        <span className="font-semibold text-slate-100">{sc.title}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">{sc.subtitle}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 2 */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 block mb-2 flex items-center gap-1.5">
                  <FileText className="size-3.5" />
                  <span>Workflow 02: Examination Materials & Shipping (Scenes 10 – 17)</span>
                </span>
                <div className="space-y-1.5">
                  {SCENES_METADATA.slice(9, 17).map((sc: SceneMeta, idx: number) => {
                    const realIdx = idx + 9;
                    return (
                      <div
                        key={sc.id}
                        onClick={() => jumpToScene(realIdx)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                          activeSceneIndex === realIdx
                            ? "bg-blue-500/15 border-blue-500/50 text-white font-bold ring-1 ring-blue-500/30"
                            : "bg-[#090D16]/80 border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/60 text-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-[10px] text-blue-400/80 font-bold">{realIdx + 1}</span>
                          <span className="font-semibold text-slate-100">{sc.title}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">{sc.subtitle}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section 3 */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block mb-2 flex items-center gap-1.5">
                  <Map className="size-3.5" />
                  <span>Master Architecture & Summary (Scene 18)</span>
                </span>
                <div
                  onClick={() => jumpToScene(17)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                    activeSceneIndex === 17
                      ? "bg-emerald-500/15 border-emerald-500/50 text-white font-bold ring-1 ring-emerald-500/30"
                      : "bg-[#090D16]/80 border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/60 text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] text-emerald-400/80 font-bold">18</span>
                    <span className="font-semibold text-slate-100">18. Master Bird&apos;s-Eye Architectural Schematic</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Dual-Branch Architecture</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
