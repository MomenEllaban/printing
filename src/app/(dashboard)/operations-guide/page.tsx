import type { Metadata } from "next";
import { GuideController } from "@/components/operations-guide/guide-controller";

export const metadata: Metadata = {
  title: "EST Operations Guide | Examination Preparation & Printing System",
  description:
    "Interactive, bird's-eye architectural presentation explaining the complete EST examination preparation, packaging, sticker manifests, and courier dispatch workflow.",
};

export default function OperationsGuidePage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <GuideController />
    </div>
  );
}

