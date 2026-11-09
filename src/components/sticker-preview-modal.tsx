"use client";

import { useEffect } from "react";
import { Download, ExternalLink, Printer, Tag, X } from "lucide-react";
import { Button, Modal } from "./ui";
import { useI18n } from "./locale-provider";

interface StickerPreviewModalProps {
  open: boolean;
  onClose: () => void;
  pdfUrl: string | null;
  title?: string;
  onPrint?: () => void;
  customTitle?: string;
  customDescription?: string;
}

export function StickerPreviewModal({
  open,
  onClose,
  pdfUrl,
  title,
  onPrint,
  customTitle,
  customDescription,
}: StickerPreviewModalProps) {
  const { locale } = useI18n();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open || !pdfUrl) return null;

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = pdfUrl;
    link.download = `${(title || "Document").replace(/[/\\?%*:|"<>]/g, "_")}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenNewTab = () => {
    window.open(pdfUrl, "_blank");
  };

  const handleDirectPrint = () => {
    if (onPrint) {
      onPrint();
      return;
    }
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.src = pdfUrl;
    document.body.appendChild(iframe);
    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        const w = window.open(pdfUrl, "_blank");
        w?.focus();
        w?.print();
      }
    };
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        customTitle
          ? customTitle
          : locale === "ar"
            ? `معاينة الاستيكر: ${title || "EST"}`
            : `Sticker Preview: ${title || "EST"}`
      }
      description={
        customDescription
          ? customDescription
          : locale === "ar"
            ? "معاينة مباشرة للاستيكر مع الشعار الرسمي وبيانات المكان قبل إرساله للطباعة."
            : "Live sticker preview with official logo and location details before printing."
      }
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={handleDownload}
              className="flex items-center gap-1.5 text-xs cursor-pointer"
            >
              <Download className="size-3.5" />
              <span>{locale === "ar" ? "تنزيل PDF" : "Download PDF"}</span>
            </Button>
            <Button
              variant="secondary"
              onClick={handleOpenNewTab}
              className="flex items-center gap-1.5 text-xs cursor-pointer"
            >
              <ExternalLink className="size-3.5" />
              <span>{locale === "ar" ? "فتح في نافذة جديدة" : "Open in New Tab"}</span>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose} className="text-xs cursor-pointer">
              {locale === "ar" ? "إغلاق" : "Close"}
            </Button>
            <Button
              variant="primary"
              onClick={handleDirectPrint}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs cursor-pointer"
            >
              <Printer className="size-3.5 text-white" />
              <span>{locale === "ar" ? "طباعة الآن" : "Print Now"}</span>
            </Button>
          </div>
        </div>
      }
    >
      <div className="w-full flex flex-col items-center justify-center">
        <iframe
          src={pdfUrl}
          className="w-full h-[68vh] rounded-xl border border-border bg-white shadow-inner"
          title="EST Sticker Preview"
        />
      </div>
    </Modal>
  );
}

