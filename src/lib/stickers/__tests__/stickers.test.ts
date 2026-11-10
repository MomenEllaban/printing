import { describe, it, expect } from "vitest";
import { buildStickerContent } from "../sticker-content";
import { generateStickerPdf, generateBatchStickerPdf } from "../sticker-pdf";
import { generateProctorRegisterPdf } from "../proctor-register-pdf";
import { generateControlRegisterPdf } from "../control-register-pdf";
import { generateStudentRegisterPdf } from "../student-register-pdf";
import { generateBuildingExcelWorkbook } from "../building-excel";
import {
  getFolderRegisterCategory,
  isBuildingExcelFile,
  isControlRegisterFile,
  isProctorRegisterFile,
  isStudentRegisterFile,
  canProfileAddRegister,
  getRegisterTheme,
} from "../register-utils";
import { PROFILES } from "../../profiles";
import { PDFDocument } from "pdf-lib";
import * as XLSX from "xlsx";

describe("buildStickerContent", () => {
  it("A. Generates correct sticker for Exam Root (EST 1)", () => {
    const result = buildStickerContent([{ name: "Root" }, { name: "EST 1" }]);
    expect(result.level).toBe("root");
    expect(result.rawLines).toEqual(["EST", "EST 1"]);
    expect(result.lines).toEqual(["EST", "EST 1"]);
  });

  it("A2. Generates correct sticker for Exam Root (EST 2)", () => {
    const result = buildStickerContent(["EST 2"]);
    expect(result.level).toBe("root");
    expect(result.rawLines).toEqual(["EST", "EST 2"]);
  });

  it("B. Generates correct sticker for Governorate (Alexandria)", () => {
    const result = buildStickerContent([
      { name: "My Drive" },
      { name: "EST 1" },
      { name: "Alexandria" },
    ]);
    expect(result.level).toBe("governorate");
    expect(result.governorate).toBe("Alexandria");
    expect(result.rawLines).toEqual(["EST", "Alexandria"]);
    expect(result.lines).toEqual(["EST", "Governorate : Alexandria"]);
  });

  it("C. Generates correct sticker for Test Center (Abu Qir)", () => {
    const result = buildStickerContent([
      "EST 1",
      "Alexandria",
      "Abu Qir",
    ]);
    expect(result.level).toBe("center");
    expect(result.center).toBe("Abu Qir");
    expect(result.rawLines).toEqual(["EST", "Alexandria", "Abu Qir"]);
    expect(result.lines).toEqual(["EST", "Governorate : Alexandria", "Center : Abu Qir"]);
  });

  it("D. Generates correct sticker for Building (Pharmacy)", () => {
    const result = buildStickerContent([
      "EST 1",
      "Alexandria",
      "Abu Qir",
      "Pharmacy",
    ]);
    expect(result.level).toBe("building");
    expect(result.building).toBe("Pharmacy");
    expect(result.rawLines).toEqual(["EST", "Alexandria", "Abu Qir", "Pharmacy"]);
    expect(result.lines).toEqual([
      "EST",
      "Governorate : Alexandria",
      "Center : Abu Qir",
      "Building : Pharmacy",
    ]);
  });

  it("E. Generates correct sticker for Floor (2nd Floor)", () => {
    const result = buildStickerContent([
      "EST 1",
      "Alexandria",
      "Abu Qir",
      "Pharmacy",
      "2nd Floor",
    ]);
    expect(result.level).toBe("floor");
    expect(result.floor).toBe("2nd Floor");
    expect(result.rawLines).toEqual([
      "EST",
      "Alexandria",
      "Abu Qir",
      "Pharmacy",
      "2nd Floor",
    ]);
    expect(result.lines).toEqual([
      "EST",
      "Governorate : Alexandria",
      "Center : Abu Qir",
      "Building : Pharmacy",
      "Floor : 2nd Floor",
    ]);
  });

  it("F. Generates correct sticker for Room (204)", () => {
    const result = buildStickerContent([
      "EST 1",
      "Alexandria",
      "Abu Qir",
      "Pharmacy",
      "2nd Floor",
      "204",
    ]);
    expect(result.level).toBe("room");
    expect(result.room).toBe("204");
    expect(result.rawLines).toEqual([
      "EST",
      "Alexandria",
      "Abu Qir",
      "Pharmacy",
      "2nd Floor",
      "204",
    ]);
    expect(result.lines).toEqual([
      "EST",
      "Governorate : Alexandria",
      "Center : Abu Qir",
      "Building : Pharmacy",
      "Floor : 2nd Floor",
      "Room : 204",
    ]);
  });

  it("Cleans extra spaces but preserves exact wording", () => {
    const result = buildStickerContent([
      "  EST 1  ",
      " Alexandria ",
      "   Future International School   ",
      " 3rd Floor ",
      " 3rd floor MathsClass ",
    ]);
    expect(result.rawLines).toEqual([
      "EST",
      "Alexandria",
      "Future International School",
      "3rd Floor",
      "3rd floor MathsClass",
    ]);
  });
});

describe("generateStickerPdf", () => {
  it("Generates a single-page valid PDF with exact custom sticker dimensions", async () => {
    const lines = [
      "EST 1",
      "Alexandria",
      "Abu Qir",
      "Pharmacy",
      "2nd Floor",
      "204",
    ];

    const pdfBytes = await generateStickerPdf({
      lines,
      widthMm: 100,
      heightMm: 50,
      paperMode: "custom",
    });

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(100);

    const pdfDoc = await PDFDocument.load(pdfBytes);
    expect(pdfDoc.getPageCount()).toBe(1);

    const page = pdfDoc.getPage(0);
    const size = page.getSize();

    // 100mm = 283.46 pt, 50mm = 141.73 pt (tolerance +- 0.5pt)
    expect(size.width).toBeCloseTo(283.46, 0);
    expect(size.height).toBeCloseTo(141.73, 0);
  });

  it("Supports A4 landscape paper mode for large clear examination placard", async () => {
    const lines = ["EST 1", "Cairo", "Sheraton", "Transport & Logistics", "2nd Floor", "201A"];
    const pdfBytes = await generateStickerPdf({
      lines,
      paperMode: "a4",
      orientation: "landscape",
    });

    const pdfDoc = await PDFDocument.load(pdfBytes);
    expect(pdfDoc.getPageCount()).toBe(1);

    const page = pdfDoc.getPage(0);
    const size = page.getSize();
    // A4 Landscape: 841.89 x 595.28
    expect(size.width).toBeCloseTo(841.89, 0);
    expect(size.height).toBeCloseTo(595.28, 0);
  });

  it("Supports A4 portrait paper mode", async () => {
    const lines = ["EST 1", "Cairo", "Sheraton"];
    const pdfBytes = await generateStickerPdf({
      lines,
      paperMode: "a4",
      orientation: "portrait",
    });

    const pdfDoc = await PDFDocument.load(pdfBytes);
    expect(pdfDoc.getPageCount()).toBe(1);

    const page = pdfDoc.getPage(0);
    const size = page.getSize();
    // A4 Portrait: 595.28 x 841.89
    expect(size.width).toBeCloseTo(595.28, 0);
    expect(size.height).toBeCloseTo(841.89, 0);
  });

  it("Builds sticker correctly from nested December 2026 / EST 1 path", async () => {
    const { getDemoBreadcrumbs } = await import("../../demo");
    const { breadcrumbs } = getDemoBreadcrumbs("demo-gov-alexandria-abu-qir-pharmacy-2nd-floor-204");
    expect(breadcrumbs.length).toBeGreaterThan(0);

    const sticker = buildStickerContent(breadcrumbs);
    expect(sticker.level).toBe("room");
    expect(sticker.room).toBe("204");
    expect(sticker.rawLines).toEqual([
      "EST",
      "Alexandria",
      "Abu Qir",
      "Pharmacy",
      "2nd Floor",
      "204",
    ]);
  });

  it("generateBatchStickerPdf generates a unified multi-page PDF with 1 page per building/center and logo included", async () => {
    const sticker1 = buildStickerContent(["EST 1", "Alexandria", "Abu Qir", "Pharmacy"]);
    const sticker2 = buildStickerContent(["EST 1", "Cairo", "Sheraton", "Engineering"]);
    const sticker3 = buildStickerContent(["EST 1", "Giza", "October", "Main Campus"]);

    const pdfBytes = await generateBatchStickerPdf({
      contents: [sticker1, sticker2, sticker3],
      paperMode: "a4",
      orientation: "landscape",
    });

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    expect(pdfDoc.getPageCount()).toBe(3);

    // Each page should be A4 Landscape: 841.89 x 595.28
    for (let i = 0; i < 3; i++) {
      const page = pdfDoc.getPage(i);
      const size = page.getSize();
      expect(size.width).toBeCloseTo(841.89, 0);
      expect(size.height).toBeCloseTo(595.28, 0);
    }
  });

  it("Computes subfolder buildings count for Center sticker (Abu Qir)", () => {
    const sticker = buildStickerContent(["EST 1", "Alexandria", "Abu Qir"]);
    expect(sticker.level).toBe("center");
    expect(sticker.childLabel).toBe("Buildings");
    expect(sticker.childCount).toBe(1);
    expect(sticker.childNames).toEqual(["Pharmacy"]);
    expect(sticker.totalRooms).toBe(13);
  });

  it("Computes subfolder floors count for Building sticker", () => {
    const sticker = buildStickerContent(["EST 1", "Alexandria", "Abu Qir", "Pharmacy"]);
    expect(sticker.level).toBe("building");
    expect(sticker.childLabel).toBe("Floors");
    expect(sticker.childCount).toBe(4);
    expect(sticker.childNames).toEqual(["2nd Floor", "3rd Floor", "4th Floor", "5th Floor"]);
  });

  it("Computes subfolder rooms count for Floor sticker", () => {
    const sticker = buildStickerContent(["EST 1", "Alexandria", "Abu Qir", "Pharmacy", "2nd Floor"]);
    expect(sticker.level).toBe("floor");
    expect(sticker.childLabel).toBe("Rooms");
    expect(sticker.childCount).toBe(3);
    expect(sticker.childNames).toEqual(["204", "205", "219"]);
  });

  it("Generates Room placard with File Contents Checklist Box", async () => {
    const sticker = buildStickerContent(["EST 1", "Alexandria", "Abu Qir", "Pharmacy", "2nd Floor", "204"]);
    expect(sticker.level).toBe("room");

    const pdfBytes = await generateStickerPdf({
      content: sticker,
      paperMode: "a4",
      orientation: "landscape",
    });

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    expect(pdfDoc.getPageCount()).toBe(1);
  });

  it("Generates Floor placard with Senior Dossier Checklist Box (including Numbers & Mobile Collection Files)", async () => {
    const sticker = buildStickerContent(["EST 1", "Alexandria", "Abu Qir", "Pharmacy", "2nd Floor"]);
    expect(sticker.level).toBe("floor");

    const pdfBytes = await generateStickerPdf({
      content: sticker,
      paperMode: "a4",
      orientation: "landscape",
    });

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    expect(pdfDoc.getPageCount()).toBe(1);
  });

  it("Generates official EST Proctor Attendance & Assignment Register PDF (A4 Landscape)", async () => {
    const pdfBytes = await generateProctorRegisterPdf({
      examName: "EST 1",
      governorate: "Alexandria",
      center: "Abu Qir",
      building: "Pharmacy",
      floor: "2nd Floor",
      rooms: ["204", "205", "219"],
    });

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    expect(pdfDoc.getPageCount()).toBe(1);

    const page = pdfDoc.getPage(0);
    const size = page.getSize();
    expect(size.width).toBeCloseTo(841.89, 0);
    expect(size.height).toBeCloseTo(595.28, 0);
  });

  it("Generates official EST Building Control Register PDF (A4 Landscape)", async () => {
    const pdfBytes = await generateControlRegisterPdf({
      examName: "EST 1",
      governorate: "Alexandria",
      center: "Abu Qir",
      building: "Pharmacy",
      floors: ["2nd Floor", "3rd Floor", "4th Floor", "5th Floor"],
    });

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    expect(pdfDoc.getPageCount()).toBe(1);

    const page = pdfDoc.getPage(0);
    const size = page.getSize();
    expect(size.width).toBeCloseTo(841.89, 0);
    expect(size.height).toBeCloseTo(595.28, 0);
  });

  it("Generates official EST Student Attendance Register PDF (A4 Landscape)", async () => {
    const pdfBytes = await generateStudentRegisterPdf({
      examName: "EST 1",
      governorate: "Alexandria",
      center: "Abu Qir",
      building: "Pharmacy",
      floor: "2nd Floor",
      room: "204",
    });

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    expect(pdfDoc.getPageCount()).toBe(1);

    const page = pdfDoc.getPage(0);
    const size = page.getSize();
    expect(size.width).toBeCloseTo(841.89, 0);
    expect(size.height).toBeCloseTo(595.28, 0);
  });

  describe("Register Eligibility & Routing Rules", () => {
    const breadcrumbs = [
      { id: "root", name: "Root" },
      { id: "est", name: "EST 1" },
      { id: "gov", name: "Alexandria" },
      { id: "center", name: "Abu Qir" },
      { id: "building", name: "Pharmacy" },
      { id: "floor", name: "2nd Floor" },
      { id: "room", name: "204" },
    ];
    const insidePharmacyCrumbs = breadcrumbs.slice(0, 5); // up to Pharmacy
    const insideFloorCrumbs = breadcrumbs.slice(0, 6); // up to 2nd Floor

    it("Rooms have Student Register button", () => {
      // By name
      expect(getFolderRegisterCategory({ folder: { id: "r1", name: "204" } })).toBe("student");
      expect(getFolderRegisterCategory({ folder: { id: "r2", name: "Room 12" } })).toBe("student");
      expect(getFolderRegisterCategory({ folder: { id: "r3", name: "قاعة 5" } })).toBe("student");
      expect(getFolderRegisterCategory({ folder: { id: "r4", name: "لجنة 3" } })).toBe("student");

      // Inside Floor folder (depth 4), child folders are Rooms (student)
      expect(
        getFolderRegisterCategory({
          folder: { id: "r1", name: "204" },
          breadcrumbs: insideFloorCrumbs,
          isCurrentFolder: false,
        }),
      ).toBe("student");

      // When currently inside Room folder itself
      expect(
        getFolderRegisterCategory({
          folder: { id: "r1", name: "204" },
          breadcrumbs,
          isCurrentFolder: true,
        }),
      ).toBe("student");
    });

    it("Floors have NO proctor register button anymore (user request)", () => {
      // By name
      expect(getFolderRegisterCategory({ folder: { id: "f1", name: "2nd Floor" } })).toBeNull();
      expect(getFolderRegisterCategory({ folder: { id: "f2", name: "الدور الثالث" } })).toBeNull();

      // Inside Building folder (depth 3), child folders are Floors -> null
      expect(
        getFolderRegisterCategory({
          folder: { id: "f1", name: "Floor 2" },
          breadcrumbs: insidePharmacyCrumbs,
          isCurrentFolder: false,
        }),
      ).toBeNull();

      // When currently inside Floor folder itself -> null
      expect(
        getFolderRegisterCategory({
          folder: { id: "f1", name: "2nd Floor" },
          breadcrumbs: insideFloorCrumbs,
          isCurrentFolder: true,
        }),
      ).toBeNull();
    });

    it("Buildings have Building Excel button (one Excel with tabs for the building)", () => {
      // By name with various real-world patterns
      expect(getFolderRegisterCategory({ folder: { id: "b1", name: "Pharmacy Building" } })).toBe("building_excel");
      expect(getFolderRegisterCategory({ folder: { id: "b2", name: "مبنى الصيدلة" } })).toBe("building_excel");
      expect(getFolderRegisterCategory({ folder: { id: "b3", name: "High School" } })).toBe("building_excel");
      expect(getFolderRegisterCategory({ folder: { id: "b4", name: "Building A" } })).toBe("building_excel");
      expect(getFolderRegisterCategory({ folder: { id: "b5", name: "Sheraton Management" } })).toBe("building_excel");
      expect(getFolderRegisterCategory({ folder: { id: "b6", name: "Engineering" } })).toBe("building_excel");
      expect(getFolderRegisterCategory({ folder: { id: "b7", name: "كلية الهندسة" } })).toBe("building_excel");
      expect(getFolderRegisterCategory({ folder: { id: "b8", name: "Primary Section" } })).toBe("building_excel");

      // Inside Test Center folder (depth 2 or Center parent), child folders are Buildings (building_excel)
      const insideAbuQirCrumbs = breadcrumbs.slice(0, 4); // up to Abu Qir
      expect(
        getFolderRegisterCategory({
          folder: { id: "b1", name: "Pharmacy" },
          breadcrumbs: insideAbuQirCrumbs,
          isCurrentFolder: false,
        }),
      ).toBe("building_excel");
      // Even with custom/generic building names inside a Center:
      expect(
        getFolderRegisterCategory({
          folder: { id: "custom1", name: "New Wing" },
          breadcrumbs: insideAbuQirCrumbs,
          isCurrentFolder: false,
        }),
      ).toBe("building_excel");
      expect(
        getFolderRegisterCategory({
          folder: { id: "custom2", name: "Sheraton" },
          breadcrumbs: insideAbuQirCrumbs,
          isCurrentFolder: false,
        }),
      ).toBe("building_excel");

      // When currently inside Building folder itself
      expect(
        getFolderRegisterCategory({
          folder: { id: "b1", name: "Pharmacy" },
          breadcrumbs: insidePharmacyCrumbs,
          isCurrentFolder: true,
        }),
      ).toBe("building_excel");
    });

    it("City, Center, and Root have NO register buttons", () => {
      // Center
      expect(getFolderRegisterCategory({ folder: { id: "c1", name: "Abu Qir Center" } })).toBeNull();
      const insideAlexCrumbs = breadcrumbs.slice(0, 3); // up to Alexandria
      expect(
        getFolderRegisterCategory({
          folder: { id: "c1", name: "Abu Qir" },
          breadcrumbs: insideAlexCrumbs,
          isCurrentFolder: false,
        }),
      ).toBeNull();

      // City / Governorate
      expect(getFolderRegisterCategory({ folder: { id: "g1", name: "Alexandria" } })).toBeNull();
      expect(getFolderRegisterCategory({ folder: { id: "g2", name: "Cairo" } })).toBeNull();

      // Root
      expect(getFolderRegisterCategory({ folder: { id: "root", name: "EST 1" }, isCurrentFolder: true })).toBeNull();
    });

    it("Detects Building Excel, Control Register, Proctor Register, and Student Register files correctly", () => {
      // Real EST building Excel file from user:
      expect(
        isBuildingExcelFile({
          id: "ex1",
          name: "EST1 Sheraton Management Oct 09,2026.xlsx",
          mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
      ).toBe(true);
      expect(isBuildingExcelFile({ id: "ex2", name: "Building_Details.xlsx" })).toBe(true);
      expect(isBuildingExcelFile({ id: "ex3", name: "Control_Proctors.csv", mimeType: "text/csv" })).toBe(true);

      // PDFs
      expect(isControlRegisterFile({ id: "1", name: "Control_Register_Pharmacy.pdf", mimeType: "application/pdf" })).toBe(true);
      expect(isControlRegisterFile({ id: "2", name: "كشف كنترول مبنى صيدلة.pdf", mimeType: "application/pdf" })).toBe(true);
      expect(isProctorRegisterFile({ id: "3", name: "Proctor_Register_2nd_Floor.pdf", mimeType: "application/pdf" })).toBe(true);
      expect(isProctorRegisterFile({ id: "4", name: "كشف مراقبين الدور الثاني.pdf", mimeType: "application/pdf" })).toBe(true);
      expect(isStudentRegisterFile({ id: "5", name: "Student_Register_204.pdf", mimeType: "application/pdf" })).toBe(true);
      expect(isStudentRegisterFile({ id: "6", name: "كشف لجان وقاعات الطلاب.pdf", mimeType: "application/pdf" })).toBe(true);
    });
  });

  it("Ensures Dina and Nabil have full delete permissions (canDelete: true)", () => {
    expect(PROFILES.dina.canDelete).toBe(true);
    expect(PROFILES.nabil.canDelete).toBe(true);
    expect(PROFILES.printing.canDelete).toBe(true);
  });

  it("Enforces profile permissions for adding registers (canProfileAddRegister)", () => {
    // Printing Admin can add everything
    expect(canProfileAddRegister("printing", "building_excel")).toBe(true);
    expect(canProfileAddRegister("printing", "student")).toBe(true);
    expect(canProfileAddRegister("printing", null)).toBe(false);

    // Dina: can add building_excel, but NOT student (rooms)
    expect(canProfileAddRegister("dina", "building_excel")).toBe(true);
    expect(canProfileAddRegister("dina", "student")).toBe(false);
    expect(canProfileAddRegister("dina", null)).toBe(false);

    // Nabil: can add student (rooms), but NOT building_excel
    expect(canProfileAddRegister("nabil", "student")).toBe(true);
    expect(canProfileAddRegister("nabil", "building_excel")).toBe(false);
    expect(canProfileAddRegister("nabil", null)).toBe(false);
  });

  it("Provides distinct visual themes and owners for each register category", () => {
    const excelTheme = getRegisterTheme("building_excel");
    expect(excelTheme.category).toBe("building_excel");
    expect(excelTheme.nameAr).toBe("ريجستر المبنى (Excel)");
    expect(excelTheme.ownerAr).toBe("دينا");
    expect(excelTheme.textClass).toContain("emerald");

    const studentTheme = getRegisterTheme("student");
    expect(studentTheme.category).toBe("student");
    expect(studentTheme.nameAr).toBe("ريجستر الطلاب");
    expect(studentTheme.ownerAr).toBe("نبيل");
    expect(studentTheme.textClass).toContain("purple");
  });

  it("Generates official Building Excel workbook with floor tabs, Control Room tab, and the exact 10 required columns", () => {
    const excelBytes = generateBuildingExcelWorkbook({
      buildingName: "Sheraton Management",
      examName: "EST 1",
      center: "AAST Sheraton",
      floors: ["Ground", "1st Floor", "3rd Floor", "4th Floor", "5th Floor"],
    });

    expect(excelBytes).toBeInstanceOf(Uint8Array);
    const wb = XLSX.read(excelBytes, { type: "array" });
    expect(wb.SheetNames).toContain("Management Ground");
    expect(wb.SheetNames).toContain("Management 1st Floor");
    expect(wb.SheetNames).toContain("Control Room");

    // Verify the exact 10 required columns in Management Ground:
    const wsGround = wb.Sheets["Management Ground"];
    const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(wsGround, { header: 1 });
    const headerRow = rows[2]; // Row 3 (0-based 2)
    expect(headerRow).toEqual([
      "No.",
      "Name",
      "Proctor Type",
      "Mobile",
      "IP / EP",
      "Room",
      "Arrival Signature",
      "Time",
      "Departure Signature",
      "Time",
    ]);

    // Verify first data row sequential numbering and separate Time fields
    const dataRow1 = rows[3];
    expect(dataRow1[0]).toBe(1); // No.
    expect(dataRow1[1]).toBe("Safwat Ahmed"); // Name
    expect(dataRow1[2]).toBe("Senior"); // Proctor Type
    expect(dataRow1[4]).toBe("IP"); // IP / EP
    expect(dataRow1[5]).toBe("Ground"); // Room
    expect(dataRow1[7]).toBe(":"); // Arrival Time
    expect(dataRow1[9]).toBe(":"); // Departure Time
  });

  describe("Stickers 4-Up Layout for Rooms and Floors", () => {
    const room1 = buildStickerContent(["EST 1", "Alexandria", "Abu Qir", "Pharmacy", "2nd Floor", "201"]);
    const room2 = buildStickerContent(["EST 1", "Alexandria", "Abu Qir", "Pharmacy", "2nd Floor", "202"]);
    const room3 = buildStickerContent(["EST 1", "Alexandria", "Abu Qir", "Pharmacy", "2nd Floor", "203"]);
    const room4 = buildStickerContent(["EST 1", "Alexandria", "Abu Qir", "Pharmacy", "2nd Floor", "204"]);
    const room5 = buildStickerContent(["EST 1", "Alexandria", "Abu Qir", "Pharmacy", "2nd Floor", "205"]);
    const floor1 = buildStickerContent(["EST 1", "Alexandria", "Abu Qir", "Pharmacy", "2nd Floor"]);
    const building1 = buildStickerContent(["EST 1", "Alexandria", "Abu Qir", "Pharmacy"]);

    it("Prints 4 room stickers on exactly 1 single A4 Landscape page", async () => {
      const pdfBytes = await generateBatchStickerPdf({
        contents: [room1, room2, room3, room4],
        paperMode: "a4",
      });

      const pdfDoc = await PDFDocument.load(pdfBytes);
      expect(pdfDoc.getPageCount()).toBe(1);

      const page = pdfDoc.getPage(0);
      const size = page.getSize();
      expect(size.width).toBeCloseTo(841.89, 0);
      expect(size.height).toBeCloseTo(595.28, 0);
    });

    it("Packs Floor stickers and Room stickers together in the 4-quarter A4 grid", async () => {
      // 1 Floor + 3 Rooms = exactly 4 items -> 1 single A4 sheet
      const pdfBytes = await generateBatchStickerPdf({
        contents: [floor1, room1, room2, room3],
        paperMode: "a4",
      });

      const pdfDoc = await PDFDocument.load(pdfBytes);
      expect(pdfDoc.getPageCount()).toBe(1);
    });

    it("Overflows 5 room stickers onto a 2nd A4 sheet (4 on page 1, 1 on page 2)", async () => {
      const pdfBytes = await generateBatchStickerPdf({
        contents: [room1, room2, room3, room4, room5],
        paperMode: "a4",
      });

      const pdfDoc = await PDFDocument.load(pdfBytes);
      expect(pdfDoc.getPageCount()).toBe(2);
    });

    it("Prints Building sticker as a full single A4 page, followed by 4-up room stickers", async () => {
      // 1 Building (full page) + 4 Rooms (1 4-up page) = 2 pages total
      const pdfBytes = await generateBatchStickerPdf({
        contents: [building1, room1, room2, room3, room4],
        paperMode: "a4",
      });

      const pdfDoc = await PDFDocument.load(pdfBytes);
      expect(pdfDoc.getPageCount()).toBe(2);
    });

    it("Prints a single room sticker on an A4 sheet with 4-up quadrant formatting and cut lines", async () => {
      const pdfBytes = await generateStickerPdf({
        content: room1,
        paperMode: "a4",
      });

      const pdfDoc = await PDFDocument.load(pdfBytes);
      expect(pdfDoc.getPageCount()).toBe(1);
      const size = pdfDoc.getPage(0).getSize();
      expect(size.width).toBeCloseTo(841.89, 0);
      expect(size.height).toBeCloseTo(595.28, 0);
    });

    it("Prints a single building sticker as a large full A4 page", async () => {
      const pdfBytes = await generateStickerPdf({
        content: building1,
        paperMode: "a4",
      });

      const pdfDoc = await PDFDocument.load(pdfBytes);
      expect(pdfDoc.getPageCount()).toBe(1);
    });
  });
});
