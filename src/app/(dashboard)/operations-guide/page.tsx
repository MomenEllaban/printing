import type { Metadata } from "next";
import { GuideController } from "@/components/operations-guide/guide-controller";

export const metadata: Metadata = {
  title: "EST Operations Guide | Examination Preparation & Logistics System",
  description:
    "Interactive, bird's-eye architectural presentation explaining the complete EST examination preparation, packaging, sticker manifests, and courier dispatch workflow.",
};

export default function OperationsGuidePage() {
  return (
    <div className="p-2 sm:p-4 lg:p-6 min-h-[calc(100vh-4rem)] flex flex-col justify-start">
      <GuideController />
    </div>
  );
}
