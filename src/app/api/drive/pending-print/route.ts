import { NextResponse } from "next/server";
import { getConnection, getDriveContextWithRoot } from "@/lib/auth";
import { getFolderDescendants } from "@/lib/drive";
import { getDemoDescendants, isDemoEnabled } from "@/lib/demo";
import { getPrintedRecordsMap } from "@/lib/print-tracker";
import { requireSession, jsonError } from "@/lib/api-utils";
import { buildPendingPrintHierarchy } from "@/lib/pending-print";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireSession(request);

    const connection = await getConnection();
    const connected = connection?.connectionStatus === "connected";
    const demo = isDemoEnabled() && !connected;

    let allFolders: any[] = [];
    let allFiles: any[] = [];
    let rootFolderId: string | null = null;

    if (demo) {
      const demoData = getDemoDescendants(["demo-root"]);
      allFolders = demoData.folders;
      allFiles = demoData.files;
      rootFolderId = "demo-root";
    } else if (connected) {
      const ctx = await getDriveContextWithRoot();
      rootFolderId = ctx.rootFolderId;
      const data = await getFolderDescendants(ctx.drive, [ctx.rootFolderId]);
      allFolders = data.folders;
      allFiles = data.files;
    }

    const printedMap = await getPrintedRecordsMap();
    const printedIds = new Set(printedMap.keys());

    const result = buildPendingPrintHierarchy({
      allFolders,
      allFiles,
      printedIds,
      rootFolderId,
    });

    return NextResponse.json({
      success: true,
      ...result,
      printedIds: Array.from(printedIds),
    });
  } catch (error) {
    return jsonError(error);
  }
}
