"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getProfile, PROFILES, PROFILE_COOKIE, type AppProfile, type ProfileId } from "@/lib/profiles";
import { useI18n } from "./locale-provider";

interface ProfileContextValue {
  activeProfile: AppProfile;
  switchProfile: (id: ProfileId) => Promise<void>;
  logout: () => Promise<void>;
  isSwitching: boolean;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({
  children,
  initialProfile,
}: {
  children: ReactNode;
  initialProfile: AppProfile;
}) {
  const router = useRouter();
  const { locale } = useI18n();
  const [activeProfile, setActiveProfile] = useState<AppProfile>(initialProfile);
  const [isSwitching, setIsSwitching] = useState(false);

  // Sync with document.cookie or storage if changed across windows
  useEffect(() => {
    const handleStorage = () => {
      const match = document.cookie.match(new RegExp(`(?:^|; )${PROFILE_COOKIE}=([^;]*)`));
      if (match) {
        const id = decodeURIComponent(match[1]);
        setActiveProfile(getProfile(id));
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const switchProfile = useCallback(
    async (id: ProfileId) => {
      setIsSwitching(true);
      try {
        const res = await fetch("/api/auth/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profileId: id }),
        });
        if (!res.ok) throw new Error("Failed to switch profile");

        const target = PROFILES[id];
        setActiveProfile(target);
        const name = locale === "ar" ? target.nameAr : target.nameEn;
        const role = locale === "ar" ? target.badgeAr : target.badgeEn;
        toast.success(
          locale === "ar"
            ? `تم التبديل بنجاح إلى: ${target.avatar} ${name} (${role})`
            : `Switched to: ${target.avatar} ${name} (${role})`,
        );
        router.refresh();
      } catch (err) {
        toast.error(locale === "ar" ? "تعذر تبديل الحساب" : "Failed to switch account");
      } finally {
        setIsSwitching(false);
      }
    },
    [locale, router],
  );

  const logout = useCallback(async () => {
    setIsSwitching(true);
    try {
      await fetch("/api/auth/profile", { method: "DELETE" });
      document.cookie = `${PROFILE_COOKIE}=; path=/; max-age=0`;
      router.push("/login");
      router.refresh();
    } catch {
      router.push("/login");
    } finally {
      setIsSwitching(false);
    }
  }, [router]);

  return (
    <ProfileContext.Provider value={{ activeProfile, switchProfile, logout, isSwitching }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useActiveProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    // Fallback if rendered outside provider
    return {
      activeProfile: PROFILES.printing,
      switchProfile: async () => {},
      logout: async () => {},
      isSwitching: false,
    };
  }
  return ctx;
}

