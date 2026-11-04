import {
  File,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  Folder,
  Presentation,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { FileCategory } from "@/lib/types";

const styles: Record<FileCategory | "folder", { className: string; icon: typeof File }> = {
  folder: { className: "bg-amber-500/12 text-amber-600 dark:text-amber-400", icon: Folder },
  pdf: { className: "bg-rose-500/12 text-rose-600 dark:text-rose-400", icon: FileText },
  excel: { className: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400", icon: FileSpreadsheet },
  word: { className: "bg-sky-500/12 text-sky-600 dark:text-sky-400", icon: FileText },
  image: { className: "bg-violet-500/12 text-violet-600 dark:text-violet-400", icon: FileImage },
  other: { className: "bg-slate-500/12 text-slate-600 dark:text-slate-300", icon: File },
};

export function FileIcon({
  category,
  extension,
  className,
  size = "md",
}: {
  category: FileCategory | "folder";
  extension?: string | null;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  let Icon = styles[category].icon;
  if (category === "other") {
    if (extension === "zip" || extension === "rar" || extension === "7z") Icon = FileArchive;
    if (extension === "ppt" || extension === "pptx") Icon = Presentation;
  }
  const sizes = {
    sm: "size-8 rounded-lg [&>svg]:size-4",
    md: "size-11 rounded-xl [&>svg]:size-5",
    lg: "size-16 rounded-2xl [&>svg]:size-8",
  };
  return (
    <span className={cn("flex shrink-0 items-center justify-center", sizes[size], styles[category].className, className)}>
      <Icon />
    </span>
  );
}
