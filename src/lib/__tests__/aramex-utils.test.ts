import { describe, it, expect } from "vitest";
import {
  buildFullAddress,
  detectAramexCity,
  convertStudentsToAramexRows,
  generateAramexWorkbook,
  ARAMEX_EGYPT_CITIES,
} from "../aramex-utils";
import * as XLSX from "xlsx";

describe("aramex-utils", () => {
  it("builds a full address containing all address components without duplicates", () => {
    const full = buildFullAddress({
      street: "شارع العشرين 424ح",
      floor: 1,
      apartment: "424",
      landmark: "بجوار كنيسه العذراء",
      area: "منطقه ح",
      city: "Hadayek Alahram",
      governorate: "Giza",
    });

    expect(full).toContain("شارع العشرين 424ح");
    expect(full).toContain("الدور 1");
    expect(full).toContain("شقة 424");
    expect(full).toContain("بجوار كنيسه العذراء");
    expect(full).toContain("منطقه ح");
    expect(full).toContain("Hadayek Alahram");
    expect(full).toContain("Giza");
  });

  it("detects city accurately from text / keywords", () => {
    expect(
      detectAramexCity({
        city: "Hadayek Alahram",
        governorate: "Giza",
      }),
    ).toBe("Hadayek Alahram");

    expect(
      detectAramexCity({
        street: "شارع التسعين التجمع الخامس",
        governorate: "Cairo",
      }),
    ).toBe("New Cairo");

    expect(
      detectAramexCity({
        street: "مدينة نصر الحي السابع",
        governorate: "Cairo",
      }),
    ).toBe("Nasr City");

    expect(
      detectAramexCity({
        street: "الشيخ زايد الحي الثامن",
        governorate: "Giza",
      }),
    ).toBe("Cheikh Zayed");
  });

  it("converts students list to aramex rows with full address and selected city", () => {
    const students = [
      {
        studentName: "Abanoub Emad",
        studentNameAr: "ابانوب عماد",
        serialNumber: 1,
        governorate: "Giza",
        city: "Hadayek Alahram",
        area: "منطقه ح",
        street: "شارع العشرين",
        apartment: "9",
        floor: "1",
        landmark: "بجوار ماركت البقال",
        phone: "01225468391",
        certificateCode: "RPCR2-126599",
      },
    ];

    const rows = convertStudentsToAramexRows(students);
    expect(rows).toHaveLength(1);
    expect(rows[0].studentNameEn).toBe("Abanoub Emad");
    expect(rows[0].studentNameAr).toBe("ابانوب عماد");
    expect(rows[0].fullAddress).toContain("شارع العشرين");
    expect(rows[0].fullAddress).toContain("Hadayek Alahram");
    expect(rows[0].selectedCity).toBe("Hadayek Alahram");
  });

  it("generates excel workbook with full address and city columns", () => {
    const rows = [
      {
        id: "1",
        serialNumber: 1,
        newRequestId: "RPCR2-126599",
        studentNameEn: "Abanoub Emad",
        studentNameAr: "ابانوب عماد",
        nationalId: "30905252200417",
        phone: "01225468391",
        governorate: "Giza",
        originalCity: "Hadayek Alahram",
        area: "منطقه ح",
        street: "شارع العشرين",
        fullAddress: "شارع العشرين - منطقه ح - Hadayek Alahram - Giza",
        selectedCity: "Hadayek Alahram",
      },
    ];

    const wb = generateAramexWorkbook(rows, "Aramex-Shipments");
    expect(wb.SheetNames).toContain("Aramex-Shipments");
    const ws = wb.Sheets["Aramex-Shipments"];
    const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
    expect(data[0]).toContain("Full Address");
    expect(data[0]).toContain("City");
    expect(data[1]).toContain("شارع العشرين - منطقه ح - Hadayek Alahram - Giza");
    expect(data[1]).toContain("Hadayek Alahram");
  });
});

