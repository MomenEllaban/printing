"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, HardDrive, Loader2, ShieldCheck, Sparkles, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { PROFILES, PROFILE_COOKIE, type ProfileId } from "@/lib/profiles";
import { useI18n } from "@/components/locale-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/cn";

export default function LoginPage() {
  const router = useRouter();
  const { locale, setLocale, dir } = useI18n();
  const [selectedId, setSelectedId] = useState<ProfileId | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);

  useEffect(() => {
    const match = document.cookie.match(new RegExp(`(?:^|; )${PROFILE_COOKIE}=([^;]*)`));
    if (match) {
      setCurrentId(decodeURIComponent(match[1]));
    }
  }, []);

  const handleSelect = async (profileId: ProfileId) => {
    setSelectedId(profileId);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId }),
      });
      if (!res.ok) throw new Error("Failed to sign in");

      const profile = PROFILES[profileId];
      const name = locale === "ar" ? profile.nameAr : profile.nameEn;
      toast.success(
        locale === "ar"
          ? `أهلاً بك، تم الدخول بنجاح بحساب ${profile.avatar} ${name}`
          : `Welcome, signed in as ${profile.avatar} ${name}`,
      );

      router.push("/");
      router.refresh();
    } catch {
      toast.error(locale === "ar" ? "فشل تسجيل الدخول" : "Failed to sign in");
      setLoading(false);
    }
  };

  const profilesList = [PROFILES.printing, PROFILES.dina, PROFILES.nabil];

  return (
    <div className="min-h-dvh flex flex-col justify-between bg-gradient-to-b from-background via-surface-soft/40 to-background p-4 sm:p-6 lg:p-10">
      {/* Top Controls */}
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-sky-500 text-white shadow-lg shadow-teal-500/25">
            <HardDrive className="size-5" />
          </span>
          <div>
            <span className="text-base font-black tracking-tight block">
              {locale === "ar" ? "نظام إدارة الامتحانات والطباعة" : "Exam & Print Management"}
            </span>
            <span className="text-[11px] text-muted block">
              {locale === "ar" ? "منظومة EST للطباعة السحابية" : "EST Cloud Printing Suite"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="icon-btn text-xs font-bold px-2.5 py-1.5 rounded-xl border border-border bg-surface hover:bg-surface-soft cursor-pointer"
            onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
          >
            {locale === "ar" ? "English" : "العربية"}
          </button>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Account Selection Section */}
      <main className="mx-auto my-auto w-full max-w-5xl py-8">
        <div className="text-center space-y-3 mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3.5 py-1 text-xs font-semibold text-accent">
            <Sparkles className="size-3.5" />
            <span>{locale === "ar" ? "اختر الحساب للمتابعة" : "Select Your Account To Continue"}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground">
            {locale === "ar" ? "تسجيل الدخول إلى النظام" : "Sign In to the System"}
          </h1>
          <p className="mx-auto max-w-xl text-xs sm:text-sm text-muted">
            {locale === "ar"
              ? "اختر حسابك المخصص. لكل دور صلاحيات واضحة ومحددة لمنع أي تداخل بين كشوف المراقبين وكشوف الطلاب."
              : "Select your designated profile. Roles are strictly partitioned to prevent any mix-up between Proctor and Student registers."}
          </p>
        </div>

        {/* 3 Profile Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {profilesList.map((profile) => {
            const isCurrent = currentId === profile.id;
            const isSelected = selectedId === profile.id && loading;

            return (
              <div
                key={profile.id}
                onClick={() => !loading && handleSelect(profile.id)}
                className={cn(
                  "group relative flex flex-col justify-between rounded-3xl border-2 bg-surface p-6 shadow-sm transition-all duration-200 cursor-pointer text-start hover:shadow-xl hover:-translate-y-1",
                  profile.borderColor,
                  isCurrent && "ring-2 ring-accent border-accent bg-accent/5",
                  isSelected && "scale-[0.98] opacity-90",
                )}
              >
                {/* Header Badge */}
                <div className="flex items-start justify-between gap-2">
                  <span className="flex size-14 items-center justify-center rounded-2xl bg-surface-strong text-3xl shadow-inner group-hover:scale-110 transition-transform">
                    {profile.avatar}
                  </span>
                  <div className="flex flex-col items-end">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-[11px] font-bold shadow-sm",
                        profile.accentBg,
                      )}
                    >
                      {locale === "ar" ? profile.badgeAr : profile.badgeEn}
                    </span>
                    {isCurrent && (
                      <span className="mt-1 flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                        <CheckCircle2 className="size-3" />
                        {locale === "ar" ? "نشط حالياً" : "Active"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Profile Identity */}
                <div className="mt-5 space-y-1.5 flex-1">
                  <h2 className="text-xl font-black text-foreground group-hover:text-accent transition-colors">
                    {locale === "ar" ? profile.nameAr : profile.nameEn}
                  </h2>
                  <p className="text-xs font-bold text-accent">
                    {locale === "ar" ? profile.roleAr : profile.roleEn}
                  </p>
                  <p className="text-xs text-muted leading-relaxed pt-1">
                    {locale === "ar" ? profile.descriptionAr : profile.descriptionEn}
                  </p>
                </div>

                {/* Capabilities Pill */}
                <div className="mt-5 pt-4 border-t border-border/70 space-y-2">
                  <div className="flex items-center gap-2 text-[11px] font-medium text-foreground">
                    <ShieldCheck className="size-4 text-accent shrink-0" />
                    <span className="truncate">
                      {locale === "ar" ? profile.taglineAr : profile.taglineEn}
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={loading}
                    className={cn(
                      "w-full mt-2 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm",
                      profile.accentBg,
                      "hover:opacity-95",
                    )}
                  >
                    {isSelected ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>{locale === "ar" ? "جارٍ الدخول…" : "Entering…"}</span>
                      </>
                    ) : (
                      <>
                        <UserCheck className="size-4" />
                        <span>
                          {locale === "ar"
                            ? `دخول كـ ${profile.nameAr}`
                            : `Enter as ${profile.nameEn}`}
                        </span>
                        {dir === "rtl" ? (
                          <ArrowLeft className="size-3.5 group-hover:-translate-x-1 transition-transform" />
                        ) : (
                          <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
                        )}
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Footer Info */}
      <footer className="mx-auto w-full max-w-5xl border-t border-border/60 pt-4 text-center text-xs text-muted">
        <p>
          {locale === "ar"
            ? "نظام الطباعة وإدارة كشوفات الامتحانات © 2026 — حسابات مخصصة لمنع الأخطاء والتداخل."
            : "Printing & Exam Management System © 2026 — Dedicated partitioned profiles for error-free operations."}
        </p>
      </footer>
    </div>
  );
}

