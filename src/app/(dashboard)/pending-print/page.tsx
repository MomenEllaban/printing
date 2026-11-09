import type { Metadata } from "next";
import { PendingPrintTree } from "@/components/pending-print-tree";
import { getLocale } from "@/lib/locale-server";
import { translate } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: `${translate(locale, "nav.pendingPrint")} — EST`,
  };
}

export default function PendingPrintPage() {
  return <PendingPrintTree />;
}
