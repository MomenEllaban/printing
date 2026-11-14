import { describe, it, expect } from "vitest";
import { generateCertificateStickersPdf } from "../stickers/certificate-stickers-pdf";

describe("generateCertificateStickersPdf", () => {
  it("generates stickers PDF with English and Arabic names", async () => {
    const pdfBytes = await generateCertificateStickersPdf({
      batchName: "Data for MoE - Nov Batch 2 11.11.2026",
      students: [
        {
          serialNumber: "1",
          studentName: "Abdelaziz Sameh Mahmoud Aly Aboueyana",
          studentNameAr: "عبد العزيز سامح محمود علي ابو عيانة",
          totalReports: 2,
          reportsList: "October 2025 - EST I; July 2026 - EST I; January 2026 - EST II; July 2026 - EST II",
        },
        {
          serialNumber: "2",
          studentName: "Abdelrahman Alaa Ahmed Ragheb Ibrahim",
          studentNameAr: "عبد الرحمن علاء احمد راغب ابراهيم",
          totalReports: 1,
          reportsList: "January 2026 - EST I",
        },
      ],
    });

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(1000);
  });
});

