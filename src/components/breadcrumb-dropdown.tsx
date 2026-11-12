"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Search, Check, Loader2, Folder } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Breadcrumb, DriveItem, Locale } from "@/lib/types";

interface BreadcrumbDropdownItemProps {
  crumb: Breadcrumb;
  parentCrumb?: Breadcrumb | null;
  isCurrent: boolean;
  isDragOver: boolean;
  draggedItem: DriveItem | null;
  locale: Locale;
  onNavigate: (folderId: string) => void;
  onDragOver: (e: React.DragEvent, folder: Breadcrumb) => void;
  onDragLeave: (e: React.DragEvent, folder: Breadcrumb) => void;
  onDrop: (e: React.DragEvent, folder: Breadcrumb) => void;
  folderChildren: Record<string, DriveItem[]>;
  fetchFolderChildren: (folderId: string) => Promise<DriveItem[] | undefined>;
}

export function BreadcrumbDropdownItem({
  crumb,
  parentCrumb,
  isCurrent,
  isDragOver,
  draggedItem,
  locale,
  onNavigate,
  onDragOver,
  onDragLeave,
  onDrop,
  folderChildren,
  fetchFolderChildren,
}: BreadcrumbDropdownItemProps) {
  const isAr = locale === "ar";
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingSiblings, setLoadingSiblings] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const parentId = parentCrumb?.id;

  // Click outside and Escape key listener
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearchQuery("");
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setSearchQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleToggleDropdown = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!parentId) return;
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen) {
      setSearchQuery("");
      if (!folderChildren[parentId]) {
        setLoadingSiblings(true);
        try {
          await fetchFolderChildren(parentId);
        } finally {
          setLoadingSiblings(false);
        }
      }
    }
  };

  const siblings = useMemo(() => {
    if (!parentId) return [];
    const items = folderChildren[parentId] || [];
    const list: Array<{ id: string; name: string }> = items
      .filter((i) => i.isFolder)
      .map((i) => ({ id: i.id, name: i.name }));

    // Ensure the current crumb is present in the list if not already
    if (!list.some((s) => s.id === crumb.id)) {
      list.push({ id: crumb.id, name: crumb.name });
    }

    // Natural sort: e.g. EST 1 before EST 2, floor 1 before floor 2
    return list.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }),
    );
  }, [parentId, folderChildren, crumb]);

  const filteredSiblings = useMemo(() => {
    if (!searchQuery.trim()) return siblings;
    const q = searchQuery.trim().toLowerCase();
    return siblings.filter((s) => s.name.toLowerCase().includes(q));
  }, [siblings, searchQuery]);

  return (
    <div
      ref={dropdownRef}
      className={cn(
        "relative inline-flex items-center rounded-lg transition-all",
        isCurrent && "font-semibold text-foreground",
        isDragOver && "bg-accent/20 ring-2 ring-accent text-accent font-bold scale-105 shadow-xs",
      )}
    >
      {/* Folder Name Action Button */}
      <button
        type="button"
        onClick={() => onNavigate(crumb.id)}
        onDragOver={(e) => onDragOver(e, crumb)}
        onDragLeave={(e) => onDragLeave(e, crumb)}
        onDrop={(e) => onDrop(e, crumb)}
        className={cn(
          "rounded-lg px-2 py-0.5 hover:bg-surface-strong hover:text-foreground cursor-pointer transition-all",
          isCurrent ? "font-bold text-foreground bg-surface-strong/60" : "text-muted hover:text-foreground",
          parentId && "pe-1",
        )}
        title={
          draggedItem && !isCurrent
            ? isAr
              ? `إفلات لنقل "${draggedItem.name}" إلى مجلد "${crumb.name}"`
              : `Drop to move "${draggedItem.name}" into "${crumb.name}"`
            : undefined
        }
      >
        {crumb.name}
      </button>

      {/* Sibling Dropdown Trigger (available whenever there is a parent folder) */}
      {parentId && (
        <button
          type="button"
          onClick={handleToggleDropdown}
          className={cn(
            "inline-flex items-center justify-center size-5.5 rounded-md p-0.5 text-muted/70 hover:text-foreground hover:bg-surface-strong cursor-pointer transition-all ms-0.5",
            open && "bg-surface-strong text-foreground rotate-180",
          )}
          title={
            isAr
              ? `عرض مجلدات نفس المستوى (المجلدات الشقيقة لـ "${crumb.name}")`
              : `Show sibling folders of "${crumb.name}"`
          }
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <ChevronDown className="size-3 transition-transform duration-150" />
        </button>
      )}

      {/* Floating Sibling Dropdown Menu */}
      {open && parentId && (
        <div
          className={cn(
            "absolute top-full start-0 mt-1.5 w-60 max-w-[85vw] rounded-xl border border-border bg-surface p-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100 text-xs",
          )}
        >
          {/* Header title */}
          <div className="flex items-center justify-between px-2 py-1 text-[10px] font-bold text-muted border-b border-border/50 mb-1">
            <span>{isAr ? "المجلدات في هذا المستوى:" : "Folders at this level:"}</span>
            <span className="font-mono text-muted/70">{siblings.length}</span>
          </div>

          {/* Search Box if siblings > 5 */}
          {siblings.length > 5 && (
            <div className="relative mb-1 px-1">
              <Search className="size-3 absolute start-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isAr ? "تصفية المجلدات..." : "Filter folders..."}
                className="w-full h-7 ps-7 pe-2 text-xs rounded-lg border border-border bg-surface-soft text-foreground focus:outline-hidden focus:ring-1 focus:ring-accent"
              />
            </div>
          )}

          {/* Sibling folders list or loader */}
          {loadingSiblings ? (
            <div className="flex items-center justify-center gap-2 py-4 text-muted">
              <Loader2 className="size-3.5 animate-spin text-accent" />
              <span className="text-[11px]">{isAr ? "جاري قراءة المجلدات..." : "Loading folders..."}</span>
            </div>
          ) : filteredSiblings.length > 0 ? (
            <div className="max-h-56 overflow-y-auto scrollbar-thin space-y-0.5">
              {filteredSiblings.map((sibling) => {
                const isSiblingSelected = sibling.id === crumb.id;
                return (
                  <button
                    key={sibling.id}
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      setSearchQuery("");
                      onNavigate(sibling.id);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-start transition-all cursor-pointer",
                      isSiblingSelected
                        ? "bg-accent/15 text-accent-strong font-bold"
                        : "text-foreground hover:bg-surface-strong",
                    )}
                  >
                    <span className="flex items-center gap-2 truncate min-w-0">
                      <Folder className={cn("size-3.5 shrink-0", isSiblingSelected ? "text-accent" : "text-muted")} />
                      <span className="truncate">{sibling.name}</span>
                    </span>
                    {isSiblingSelected && <Check className="size-3.5 shrink-0 text-accent" />}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="py-3 text-center text-muted text-[11px]">
              {searchQuery
                ? isAr
                  ? "لا توجد نتائج مطابقة"
                  : "No matching folders"
                : isAr
                ? "لا توجد مجلدات أخرى"
                : "No sibling folders"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

