import { NextResponse } from "next/server";
import { Readable } from "node:stream";
import { requireSession, enforceRateLimit, jsonError } from "@/lib/api-utils";
import { getDriveContextWithRoot } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateCertificatesFolder } from "@/lib/certificates-drive";
import { resolveAvailableName } from "@/lib/upload";
import { toDriveItem } from "@/lib/drive";
import { syncDriveItems } from "@/lib/metadata";
import { invalidateCache } from "@/lib/ttl-cache";
import { OWNER_ID } from "@/lib/auth";
import { AppError } from "@/lib/errors";

export const dynamic = "force-dynamic";

function safeJsonParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export async function GET(request: Request) {
  try {
    await requireSession(request);
    enforceRateLimit(request, "certificates:batches:list", 120, 60_000);

    const batches = await prisma.certificateStickerBatch.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        shortName: true,
        fileName: true,
        driveFileId: true,
        driveFolderId: true,
        batchType: true,
        sourceKey: true,
        createdAt: true,
        updatedAt: true,
        studentsData: true,
        receiptsData: true,
      },
    });

    const items = batches.map((b) => {
      const students = Array.isArray(b.studentsData) ? b.studentsData : [];
      const receipts = b.receiptsData && typeof b.receiptsData === "object" ? (b.receiptsData as Record<string, any>) : {};
      const receivedCount = Object.values(receipts).filter((r: any) => r?.received).length;
      return {
        ...b,
        studentCount: students.length,
        receivedCount,
      };
    });

    return NextResponse.json({ batches: items });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireSession(request, { mutating: true });
    enforceRateLimit(request, "certificates:batches:create", 60, 60_000);

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string") {
      throw new AppError("No Excel file uploaded", { status: 400, code: "invalidRequest" });
    }

    const studentsRaw = formData.get("students");
    const students = safeJsonParse<any[]>(typeof studentsRaw === "string" ? studentsRaw : null, []);
    if (!Array.isArray(students) || students.length === 0) {
      throw new AppError("Students data is required", { status: 400, code: "invalidRequest" });
    }

    const batchNameRaw = formData.get("batchName");
    const batchName = (typeof batchNameRaw === "string" && batchNameRaw.trim()) || file.name.replace(/\.[^.]+$/, "") || "Certificate Batch";
    const shortName = batchName.length > 60 ? `${batchName.slice(0, 57)}...` : batchName;

    const { drive, rootFolderId } = await getDriveContextWithRoot();
    const certificatesFolderId = await getOrCreateCertificatesFolder(drive, rootFolderId);

    const finalName = await resolveAvailableName(drive, certificatesFolderId, file.name, "rename");
    const arrayBuffer = await file.arrayBuffer();
    const stream = Readable.from(Buffer.from(arrayBuffer));

    const response = await drive.files.create({
      requestBody: {
        name: finalName,
        mimeType: file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        parents: [certificatesFolderId],
      },
      media: {
        mimeType: file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        body: stream,
      },
      fields: "id,name,mimeType,size,fileExtension,modifiedTime,createdTime,webViewLink,thumbnailLink,iconLink,parents",
      supportsAllDrives: true,
    });

    if (!response.data.id) {
      throw new AppError("Google Drive upload failed", { status: 502, code: "uploadInit" });
    }

    const item = toDriveItem(response.data);
    await syncDriveItems([item]);
    invalidateCache("stats:");

    const batch = await prisma.certificateStickerBatch.create({
      data: {
        userId: OWNER_ID,
        name: batchName,
        shortName,
        fileName: finalName,
        driveFileId: response.data.id,
        driveFolderId: certificatesFolderId,
        batchType: "uploaded",
        studentsData: students as any,
        receiptsData: {},
      },
    });

    return NextResponse.json({ batch }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
