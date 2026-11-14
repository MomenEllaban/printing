"use client";

import {
  forwardRef,
  useEffect,
  useId,
  useMemo,
  useState,
  useSyncExternalStore,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Check, Copy, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useI18n } from "./locale-provider";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variantClasses: Record<Variant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
  danger: "btn-danger",
};

const subscribeNoop = () => () => {};
const getMountedSnapshot = () => true;
const getServerMountedSnapshot = () => false;

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }
>(function Button({ className, variant = "primary", loading, disabled, children, ...props }, ref) {
  return (
    <button
      ref={ref}
      className={cn(variantClasses[variant], "cursor-pointer", className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner className="size-4" />}
      {children}
    </button>
  );
});

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn("input", className)} {...props} />;
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <select ref={ref} className={cn("input appearance-none pe-8 cursor-pointer", className)} {...props}>
        {children}
      </select>
    );
  },
);

export function Field({
  label,
  hint,
  htmlFor,
  children,
  error,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
  error?: string;
}) {
  return (
    <div>
      <label className="label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
      {error && <p className="mt-1.5 text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4">
      <label htmlFor={id} className="text-sm font-medium text-foreground cursor-pointer select-none">
        {label}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer",
          checked ? "bg-accent" : "bg-surface-strong border border-border",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      >
        <span
          className={cn(
            "inline-block size-4 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-6 rtl:-translate-x-6" : "translate-x-1 rtl:-translate-x-1",
          )}
        />
      </button>
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-block size-5 animate-spin rounded-full border-2 border-current border-t-transparent", className)}
      aria-hidden="true"
    />
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const mounted = useSyncExternalStore(subscribeNoop, getMountedSnapshot, getServerMountedSnapshot);

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  const widths = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl" };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative z-10 w-full overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl",
          widths[size],
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-bold">{title}</h2>
            {description && <p className="mt-1 text-sm text-muted">{description}</p>}
          </div>
          <button type="button" className="icon-btn -me-2 -mt-1" onClick={onClose} aria-label="Close">
            <X className="size-4" />
          </button>
        </div>
        <div className="max-h-[75dvh] overflow-y-auto scrollbar-thin px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-border px-5 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmLabel?: string;
  confirmVariant?: Variant;
  loading?: boolean;
  /**
   * If provided, requires the user to type matching text (e.g. file name or "delete") to confirm.
   */
  requireConfirmationText?: string | boolean;
  /**
   * Optional custom match texts (e.g. ["delete", "DELETE", "حذف"]).
   */
  confirmationMatchTexts?: string[];
  /**
   * Text shown with a 1-click "Copy Name" button so user can copy-paste it instantly.
   */
  copyableText?: string;
  /**
   * Optional custom instruction message displayed inside the warning box.
   */
  instructionMessage?: string;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  confirmVariant = "danger",
  loading,
  requireConfirmationText,
  confirmationMatchTexts,
  copyableText,
  instructionMessage,
}: ConfirmDialogProps) {
  const { t, locale } = useI18n();
  const [userInput, setUserInput] = useState("");
  const [copied, setCopied] = useState(false);

  // Reset input and copied state whenever dialog opens or closes
  useEffect(() => {
    if (open) {
      setUserInput("");
      setCopied(false);
    }
  }, [open]);

  const needsConfirmation = Boolean(requireConfirmationText || (confirmationMatchTexts && confirmationMatchTexts.length > 0));

  // Determine allowed match candidates
  const allowedMatches = useMemo(() => {
    if (!needsConfirmation) return [];
    if (confirmationMatchTexts && confirmationMatchTexts.length > 0) {
      const list = [...confirmationMatchTexts];
      if (!list.some((s) => s.toLowerCase() === "delete")) list.push("delete", "DELETE");
      if (!list.includes("حذف")) list.push("حذف");
      return list;
    }
    const list: string[] = [];
    if (typeof requireConfirmationText === "string" && requireConfirmationText.trim()) {
      list.push(requireConfirmationText.trim());
    }
    if (copyableText && copyableText.trim() && !list.includes(copyableText.trim())) {
      list.push(copyableText.trim());
    }
    if (!list.some((s) => s.toLowerCase() === "delete")) {
      list.push("delete", "DELETE");
    }
    if (!list.includes("حذف")) {
      list.push("حذف");
    }
    return list;
  }, [needsConfirmation, confirmationMatchTexts, requireConfirmationText, copyableText]);

  const trimmedInput = userInput.trim();
  const isMatch = useMemo(() => {
    if (!needsConfirmation) return true;
    if (!trimmedInput) return false;
    return allowedMatches.some((target) => {
      const normTarget = target.trim().toLowerCase();
      const normInput = trimmedInput.toLowerCase();
      return normTarget === normInput || target.trim() === trimmedInput;
    });
  }, [needsConfirmation, trimmedInput, allowedMatches]);

  const handleCopy = async () => {
    const textToCopy = copyableText || (typeof requireConfirmationText === "string" ? requireConfirmationText : "delete");
    if (!textToCopy) return;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = textToCopy;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard error
    }
  };

  const displayTextToCopy = copyableText || (typeof requireConfirmationText === "string" ? requireConfirmationText : "");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {t("common.cancel")}
          </Button>
          <Button
            variant={confirmVariant}
            onClick={() => {
              if (isMatch && !loading) {
                void onConfirm();
              }
            }}
            loading={loading}
            disabled={loading || !isMatch}
          >
            {confirmLabel ?? t("common.confirm")}
          </Button>
        </>
      }
    >
      <div className="space-y-3.5">
        <p className="text-sm text-muted">{description}</p>

        {needsConfirmation && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 dark:bg-rose-950/20 p-3 space-y-2.5">
            <div className="flex items-start gap-2 text-rose-700 dark:text-rose-300 text-xs">
              <AlertTriangle className="size-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">
                  {instructionMessage ||
                    (locale === "ar"
                      ? displayTextToCopy
                        ? `لتأكيد الحذف نهائياً، يرجى كتابة اسم الملف "${displayTextToCopy}" أو كلمة delete أدناه:`
                        : 'لتأكيد الحذف نهائياً، يرجى كتابة كلمة "delete" أدناه للتأكيد:'
                      : displayTextToCopy
                      ? `To confirm deletion, please type "${displayTextToCopy}" or "delete" below:`
                      : 'To confirm deletion, please type "delete" below:')}
                </p>
              </div>
            </div>

            {displayTextToCopy && (
              <div className="flex items-center justify-between gap-2 p-1.5 px-2.5 rounded-lg bg-surface border border-rose-500/20 text-xs font-mono select-all">
                <span className="truncate font-semibold text-foreground text-[11px]" title={displayTextToCopy}>
                  {displayTextToCopy}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-500/10 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20 transition-colors cursor-pointer"
                  title={locale === "ar" ? "نسخ الاسم للحافظة" : "Copy name to clipboard"}
                >
                  {copied ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                  <span>{copied ? (locale === "ar" ? "تم النسخ!" : "Copied!") : (locale === "ar" ? "نسخ الاسم" : "Copy")}</span>
                </button>
              </div>
            )}

            <div className="space-y-1">
              <Input
                autoFocus
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && isMatch && !loading) {
                    e.preventDefault();
                    void onConfirm();
                  }
                }}
                placeholder={
                  locale === "ar"
                    ? displayTextToCopy
                      ? `الصق الاسم هنا أو اكتب delete...`
                      : `اكتب delete للتأكيد...`
                    : displayTextToCopy
                    ? `Paste name here or type delete...`
                    : `Type delete to confirm...`
                }
                className={cn(
                  "h-9 text-xs font-mono",
                  isMatch
                    ? "border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500/20"
                    : trimmedInput
                    ? "border-rose-400 focus:border-rose-400 focus:ring-rose-400/20"
                    : "",
                )}
              />
              <div className="text-[11px] flex items-center justify-between px-1">
                {isMatch ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                    <Check className="size-3" />
                    {locale === "ar" ? "تم التأكيد بنجاح، يمكنك الحذف الآن" : "Matched! You can now delete"}
                  </span>
                ) : trimmedInput ? (
                  <span className="text-rose-600 dark:text-rose-400 font-medium">
                    {locale === "ar"
                      ? "النص غير متطابق بعد"
                      : "Text does not match yet"}
                  </span>
                ) : (
                  <span className="text-muted">
                    {locale === "ar"
                      ? "زر الحذف معطل حتى كتابة المطلوب"
                      : "Delete button disabled until confirmed"}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-strong">
      <div
        className="h-full rounded-full bg-accent transition-[width] duration-200"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-accent-soft text-accent-strong">{icon}</div>
      <h3 className="text-base font-semibold">{title}</h3>
      {description && <p className="max-w-md text-sm text-muted">{description}</p>}
      {action}
    </div>
  );
}
