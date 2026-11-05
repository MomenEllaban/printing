"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, LogOut, ShieldCheck, UserCheck, Users } from "lucide-react";
import { useActiveProfile } from "./profile-provider";
import { PROFILE_LIST, type ProfileId } from "@/lib/profiles";
import { useI18n } from "./locale-provider";
import { cn } from "@/lib/cn";

export function AccountMenu({ compact = false }: { compact?: boolean }) {
  const { activeProfile, switchProfile, isSwitching, logout } = useActiveProfile();
  const { locale } = useI18n();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleSelect = async (id: ProfileId) => {
    if (id === activeProfile.id) {
      setOpen(false);
      return;
    }
    await switchProfile(id);
    setOpen(false);
  };

  const isAr = locale === "ar";

  return (
    <div className="relative inline-block text-start" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        disabled={isSwitching}
        className={cn(
          "group flex items-center gap-2 rounded-xl border border-border bg-surface px-2.5 py-1.5 text-xs font-semibold shadow-xs transition-all hover:border-accent hover:bg-surface-soft cursor-pointer",
          open && "border-accent ring-2 ring-accent/20",
          compact && "p-1.5",
        )}
        title={isAr ? `الحساب الحالي: ${activeProfile.nameAr}` : `Current: ${activeProfile.nameEn}`}
        aria-label="Account Switcher"
      >
        <span
          className={cn(
            "flex size-7 items-center justify-center rounded-lg text-sm shadow-xs",
            activeProfile.color,
          )}
        >
          {activeProfile.avatar}
        </span>

        {!compact && (
          <div className="hidden sm:flex flex-col text-start leading-tight">
            <span className="font-bold text-foreground truncate max-w-[110px]">
              {isAr ? activeProfile.nameAr : activeProfile.nameEn}
            </span>
            <span className="text-[10px] text-muted truncate max-w-[110px]">
              {isAr ? activeProfile.badgeAr : activeProfile.badgeEn}
            </span>
          </div>
        )}

        <ChevronDown
          className={cn(
            "size-3.5 text-muted transition-transform duration-200 group-hover:text-foreground",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div
          className={cn(
            "absolute z-50 mt-2 w-72 rounded-2xl border border-border bg-surface p-2 shadow-2xl backdrop-blur-xl animate-in fade-in-50 zoom-in-95",
            isAr ? "left-0" : "right-0",
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/60 px-3 py-2 text-xs font-bold text-foreground">
            <div className="flex items-center gap-1.5">
              <Users className="size-4 text-accent" />
              <span>{isAr ? "الحساب النشط" : "Active Profile"}</span>
            </div>
            <span className="rounded-md bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent-strong">
              {isAr ? activeProfile.badgeAr : activeProfile.badgeEn}
            </span>
          </div>

          {/* Accounts list */}
          <div className="mt-1.5 space-y-1">
            {PROFILE_LIST.map((p) => {
              const selected = p.id === activeProfile.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => void handleSelect(p.id)}
                  disabled={isSwitching}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl p-2 text-start transition-all cursor-pointer",
                    selected
                      ? "bg-accent/10 border border-accent/40 text-foreground shadow-xs font-bold"
                      : "border border-transparent hover:bg-surface-soft text-muted hover:text-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-xl text-lg shadow-xs",
                      p.color,
                    )}
                  >
                    {p.avatar}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold truncate">
                        {isAr ? p.nameAr : p.nameEn}
                      </span>
                      {p.isAdmin && (
                        <span className="rounded bg-indigo-500/15 px-1.5 py-0.2 text-[9px] font-bold text-indigo-600 dark:text-indigo-400">
                          {isAr ? "مدير" : "Admin"}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted truncate">
                      {isAr ? p.descriptionAr : p.descriptionEn}
                    </p>
                  </div>
                  {selected && (
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-white">
                      <Check className="size-3 stroke-[3]" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Separation / Hint */}
          <div className="mt-2 rounded-xl bg-surface-soft p-2 text-[10px] text-muted border border-border/40">
            <p className="font-semibold text-foreground flex items-center gap-1">
              <span>🛡️</span>
              <span>{isAr ? "توزيع المسؤوليات المباشر:" : "Strict Role Isolation:"}</span>
            </p>
            <p className="mt-0.5 leading-relaxed">
              {isAr
                ? "دينا مسؤولة عن كشوف المراقبين فقط. نبيل مسؤول عن كشوف الطلاب فقط. البرنتنج هو المتحكم الكامل والطباعة."
                : "Dina handles Proctor Registers only. Nabil handles Student Registers only. Printing has full control."}
            </p>
          </div>

          {/* Footer buttons */}
          <div className="mt-2 pt-2 border-t border-border/60 flex items-center justify-between gap-1 px-1">
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-semibold text-accent hover:bg-accent/10 transition-colors cursor-pointer"
            >
              <UserCheck className="size-3.5" />
              <span>{isAr ? "شاشة الدخول" : "Login Screen"}</span>
            </Link>

            <button
              type="button"
              onClick={() => void logout()}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
            >
              <LogOut className="size-3.5" />
              <span>{isAr ? "خروج" : "Logout"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

