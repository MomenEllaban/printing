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
} from "lucide-react";
import { SCENES_METADATA } from "./guide-data";
import type { SceneMeta } from "./guide-types";

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
  const [sceneKey, setSceneKey] = useState<number>(0); // Used to trigger replay/re-render animations
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

  const jumpToScene = useCallback((index: number) => {
    if (index >= 0 && index < totalScenes) {
      setActiveSceneIndex(index);
      setSceneKey((k) => k + 1);
      setIsDrawerOpen(false);
    }
  }, [totalScenes]);

  const replayAnimation = () => {
    setSceneKey((k) => k + 1);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
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
      document.documentElement.requestFullscreen().catch(() => {});
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
      className="min-h-[85vh] flex flex-col justify-between space-y-6 max-w-7xl mx-auto pb-12"
    >
      {/* Top Presentation Bar */}
      <div className="card p-4 sm:p-5 border border-border shadow-xs bg-surface-soft/60 backdrop-blur-md sticky top-2 z-30 space-y-3">
        {/* Progress Line */}
        <div className="h-1.5 w-full rounded-full bg-surface-strong overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Title & Badge */}
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0 shadow-xs">
              <GraduationCap className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    currentScene.workflow === "workflow-1"
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                      : currentScene.workflow === "workflow-2"
                      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  }`}
                >
                  {currentScene.workflow === "workflow-1"
                    ? "Workflow 01: Center & Building Boxes"
                    : currentScene.workflow === "workflow-2"
                    ? "Workflow 02: Materials & Shipping"
                    : "Master Operations Architecture"}
                </span>
                <span className="text-xs font-mono font-bold text-muted">
                  Scene {activeSceneIndex + 1} of {totalScenes}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-foreground">
                {currentScene.title}
              </h2>
            </div>
          </div>

          {/* Quick Presentation Actions */}
          <div className="flex items-center gap-2 self-end sm:self-center">
            {/* Replay Scene */}
            <button
              type="button"
              onClick={replayAnimation}
              className="p-2 rounded-xl border border-border bg-surface hover:bg-surface-strong text-muted hover:text-foreground transition-all cursor-pointer"
              title="Replay scene animations"
            >
              <RotateCcw className="size-4" />
            </button>

            {/* Scene Index Drawer */}
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="px-3 py-1.5 rounded-xl border border-border bg-surface hover:bg-surface-strong text-foreground text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Compass className="size-4 text-indigo-500" />
              <span className="hidden sm:inline">Scene Index</span>
            </button>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2 rounded-xl border border-border bg-surface hover:bg-surface-strong text-muted hover:text-foreground transition-all cursor-pointer"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Presentation Mode"}
            >
              {isFullscreen ? (
                <Minimize2 className="size-4 text-accent" />
              ) : (
                <Maximize2 className="size-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Viewport Container */}
      <div key={sceneKey} className="flex-1 animate-in fade-in duration-300">
        {renderSceneComponent()}
      </div>

      {/* Presentation Navigation Footer */}
      <div className="p-4 rounded-2xl bg-surface border border-border shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 sticky bottom-3 z-30 backdrop-blur-md">
        {/* Previous Button */}
        <button
          type="button"
          onClick={goToPrev}
          disabled={activeSceneIndex === 0}
          className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSceneIndex === 0
              ? "opacity-40 cursor-not-allowed bg-surface-strong text-muted border border-border"
              : "bg-surface border border-border hover:bg-surface-strong text-foreground shadow-xs"
          }`}
        >
          <ArrowLeft className="size-4" />
          <span>Previous Scene</span>
        </button>

        {/* Center Indicators & Keyboard Tip */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1.5">
            {SCENES_METADATA.map((s: SceneMeta, idx: number) => (
              <button
                key={s.id}
                type="button"
                onClick={() => jumpToScene(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  activeSceneIndex === idx
                    ? "w-6 bg-accent"
                    : "w-1.5 bg-border hover:bg-muted"
                }`}
                title={`Jump to Scene ${idx + 1}: ${s.title}`}
              />
            ))}
          </div>
          <span className="text-[10px] text-muted font-mono hidden md:inline">
            Use [←] and [→] keyboard arrow keys to navigate
          </span>
        </div>

        {/* Next Button */}
        <button
          type="button"
          onClick={goToNext}
          disabled={activeSceneIndex === totalScenes - 1}
          className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSceneIndex === totalScenes - 1
              ? "opacity-40 cursor-not-allowed bg-surface-strong text-muted border border-border"
              : "bg-accent hover:bg-accent/90 text-white shadow-md"
          }`}
        >
          <span>Next Scene</span>
          <ArrowRight className="size-4" />
        </button>
      </div>

      {/* Scene Index Drawer / Modal */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-2xl max-h-[85vh] rounded-3xl bg-surface border border-border shadow-2xl flex flex-col overflow-hidden">
            {/* Drawer Header */}
            <div className="p-4 px-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="size-5 text-indigo-500" />
                <h3 className="text-base font-bold text-foreground">
                  EST Operations Presentation — Scene Directory
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 rounded-xl hover:bg-surface-strong text-muted hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Scenes Scrollable List */}
            <div className="p-4 px-6 overflow-y-auto space-y-4">
              {/* Section 1 */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500 block mb-2">
                  Workflow 01: Center & Building Box Preparation (Scenes 01 – 09)
                </span>
                <div className="space-y-1.5">
                  {SCENES_METADATA.slice(0, 9).map((sc: SceneMeta, idx: number) => (
                    <div
                      key={sc.id}
                      onClick={() => jumpToScene(idx)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                        activeSceneIndex === idx
                          ? "bg-amber-500/10 border-amber-500/50 text-foreground font-bold"
                          : "bg-surface-strong/30 border-border/60 hover:bg-surface-strong hover:text-foreground text-muted"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-[10px] text-muted">0{idx + 1}</span>
                        <span>{sc.title}</span>
                      </div>
                      <span className="text-[10px] text-muted">{sc.subtitle}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 2 */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-500 block mb-2">
                  Workflow 02: Examination Materials & Shipping (Scenes 10 – 17)
                </span>
                <div className="space-y-1.5">
                  {SCENES_METADATA.slice(9, 17).map((sc: SceneMeta, idx: number) => {
                    const realIdx = idx + 9;
                    return (
                      <div
                        key={sc.id}
                        onClick={() => jumpToScene(realIdx)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                          activeSceneIndex === realIdx
                            ? "bg-blue-500/10 border-blue-500/50 text-foreground font-bold"
                            : "bg-surface-strong/30 border-border/60 hover:bg-surface-strong hover:text-foreground text-muted"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-[10px] text-muted">{realIdx + 1}</span>
                          <span>{sc.title}</span>
                        </div>
                        <span className="text-[10px] text-muted">{sc.subtitle}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section 3 */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-500 block mb-2">
                  Master Architecture & Summary (Scene 18)
                </span>
                <div
                  onClick={() => jumpToScene(17)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                    activeSceneIndex === 17
                      ? "bg-emerald-500/10 border-emerald-500/50 text-foreground font-bold"
                      : "bg-surface-strong/30 border-border/60 hover:bg-surface-strong hover:text-foreground text-muted"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-[10px] text-muted">18</span>
                    <span>18. Master Bird&apos;s-Eye Architectural Schematic</span>
                  </div>
                  <span className="text-[10px] text-muted">Dual-Branch Architecture</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
