export type ProfileId = "printing" | "dina" | "nabil";

export interface AppProfile {
  id: ProfileId;
  nameAr: string;
  nameEn: string;
  roleAr: string;
  roleEn: string;
  avatar: string;
  badgeAr: string;
  badgeEn: string;
  taglineAr: string;
  taglineEn: string;
  descriptionAr: string;
  descriptionEn: string;
  color: string;
  bgColor: string;
  borderColor: string;
  activeRing: string;
  accentBg: string;
  isAdmin: boolean;
  canPrint: boolean;
  canManageSettings: boolean;
  canDelete: boolean;
  allowedUploadType: "all" | "proctor_only" | "student_only" | "proctor_and_control";
}

export const PROFILE_COOKIE = "fm_profile";

export const PROFILES: Record<ProfileId, AppProfile> = {
  printing: {
    id: "printing",
    nameAr: "البرنتنج",
    nameEn: "Printing Admin",
    roleAr: "مدير النظام والطباعة (Admin)",
    roleEn: "System & Printing Admin",
    avatar: "🖨️",
    badgeAr: "المدير المسؤول",
    badgeEn: "System Admin",
    taglineAr: "كامل التحكم في الطباعة والإعدادات والملفات",
    taglineEn: "Full control over printing, files, and settings",
    descriptionAr: "المتحكم في كل شيء في النظام والطباعة، وإدارة وحذف الملفات وربط Google Drive.",
    descriptionEn: "Controls all printing, file management, Google Drive settings, and permissions.",
    color: "text-sky-600 dark:text-sky-400",
    bgColor: "bg-sky-500/10 dark:bg-sky-500/20",
    borderColor: "border-sky-500/40 hover:border-sky-500",
    activeRing: "ring-sky-500",
    accentBg: "bg-sky-600 text-white shadow-sky-500/25",
    isAdmin: true,
    canPrint: true,
    canManageSettings: true,
    canDelete: true,
    allowedUploadType: "all",
  },
  dina: {
    id: "dina",
    nameAr: "دينا",
    nameEn: "Dina",
    roleAr: "مسؤولة كشوف الكنترول والمراقبين (Control & Proctor)",
    roleEn: "Control & Proctor Register Coordinator",
    avatar: "👩‍💼",
    badgeAr: "كنترول ومراقبين",
    badgeEn: "Control & Proctor",
    taglineAr: "رفع وتوثيق كشوف الكنترول للمباني والمراقبين للأدوار",
    taglineEn: "Uploads Control & Proctor Register files exclusively",
    descriptionAr: "حساب مخصص لرفع وتوثيق كشوف الكنترول للمباني والمراقبين للأدوار، مع كامل صلاحيات الحذف والطباعة كالمسؤول.",
    descriptionEn: "Dedicated account for Control & Proctor Register uploads, with full delete and print permissions.",
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-500/10 dark:bg-emerald-500/20",
    borderColor: "border-emerald-500/40 hover:border-emerald-500",
    activeRing: "ring-emerald-500",
    accentBg: "bg-emerald-600 text-white shadow-emerald-500/25",
    isAdmin: false,
    canPrint: true,
    canManageSettings: false,
    canDelete: true,
    allowedUploadType: "proctor_and_control",
  },
  nabil: {
    id: "nabil",
    nameAr: "نبيل",
    nameEn: "Nabil",
    roleAr: "مسؤول كشوف الطلاب (Student Register)",
    roleEn: "Student Register Coordinator",
    avatar: "👨‍💼",
    badgeAr: "كشوف الطلاب",
    badgeEn: "Student Register",
    taglineAr: "رفع وتوثيق كشوف لجان وقاعات الطلاب مع الروم",
    taglineEn: "Uploads Student Register files with room numbers",
    descriptionAr: "حساب مخصص لرفع كشوف لجان وقاعات الطلاب (Student Register) وأرقام الروم، مع كامل صلاحيات الحذف والطباعة كالمسؤول.",
    descriptionEn: "Dedicated account for Student Register uploads with rooms, with full delete and print permissions.",
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-500/10 dark:bg-purple-500/20",
    borderColor: "border-purple-500/40 hover:border-purple-500",
    activeRing: "ring-purple-500",
    accentBg: "bg-purple-600 text-white shadow-purple-500/25",
    isAdmin: false,
    canPrint: true,
    canManageSettings: false,
    canDelete: true,
    allowedUploadType: "student_only",
  },
};

export const DEFAULT_PROFILE: ProfileId = "printing";

export const PROFILE_LIST: AppProfile[] = [
  PROFILES.printing,
  PROFILES.dina,
  PROFILES.nabil,
];

export function getProfile(id?: string | null): AppProfile {
  if (id === "dina") return PROFILES.dina;
  if (id === "nabil") return PROFILES.nabil;
  return PROFILES.printing;
}

