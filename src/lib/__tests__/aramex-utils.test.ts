import { describe, it, expect } from "vitest";
import {
  buildFullAddress,
  detectAramexCity,
  convertStudentsToAramexRows,
  generateAramexWorkbook,
  translateFloorToArabic,
  translateApartmentToArabic,
  toArabicDigits,
  ARAMEX_CITIES_LIST,
} from "../aramex-utils";
import * as XLSX from "xlsx";

describe("aramex-utils", () => {
  it("translates floor and apartment into standard Arabic forms", () => {
    expect(toArabicDigits("424")).toBe("٤٢٤");
    expect(translateApartmentToArabic("424")).toBe("الشقة رقم ٤٢٤");
    expect(translateApartmentToArabic("9")).toBe("الشقة رقم ٩");

    expect(translateFloorToArabic(1)).toBe("الدور الأول");
    expect(translateFloorToArabic("2")).toBe("الدور الثاني");
    expect(translateFloorToArabic(3)).toBe("الدور الثالث");
    expect(translateFloorToArabic(4)).toBe("الدور الرابع");
    expect(translateFloorToArabic(5)).toBe("الدور الخامس");
    expect(translateFloorToArabic(0)).toBe("الدور الأرضي");
    expect(translateFloorToArabic("211")).toBe("الدور رقم ٢١١");
  });

  it("builds a full address containing all address components joined by Arabic comma", () => {
    // Example 1 from user
    const full1 = buildFullAddress({
      governorate: "Giza",
      city: "Hadayek Alahram",
      area: "منطقه ح",
      street: "شارع العشرين 424ح الدور الاول شقه 9",
      apartment: "424",
      floor: "1",
      landmark: "يوجد بالعمارة ماركت البقال و بجوار كنيسه السيده العذراء مريم و الانبا رويس",
    });

    expect(full1).toBe(
      "Giza، Hadayek Alahram، منطقه ح، شارع العشرين 424ح الدور الاول شقه 9، الشقة رقم ٤٢٤، الدور الأول، يوجد بالعمارة ماركت البقال و بجوار كنيسه السيده العذراء مريم و الانبا رويس",
    );

    // Example 2 from user (Beni Suef / Fashn)
    const full2 = buildFullAddress({
      governorate: "Beni Suef",
      city: "Fashn",
      area: "الفشن",
      street: "شارع الإبراهيميه",
      apartment: "1",
      floor: "3",
      landmark: "برج مستشفي زهور الحياه",
    });

    expect(full2).toBe(
      "Beni Suef، Fashn، الفشن، شارع الإبراهيميه، الشقة رقم ١، الدور الثالث، برج مستشفي زهور الحياه",
    );
  });

  it("detects city option accurately matching Pyramids Gardens - Giza", () => {
    const detected = detectAramexCity({
      governorate: "Giza",
      city: "Hadayek Alahram",
    });

    expect(detected.cityGov).toBe("Pyramids Gardens - Giza");
    expect(detected.city).toBe("Pyramids Gardens");
    expect(detected.code).toBe("PYG");
    expect(detected.gov).toBe("Giza");
  });

  it("converts students list to aramex rows with full address and remarks", () => {
    const students = [
      {
        studentName: "Abanoub Emad Adly Abdou",
        studentNameAr: "ابانوب عماد عدلى عبده",
        serialNumber: 1,
        governorate: "Giza",
        city: "Hadayek Alahram",
        area: "منطقه ح",
        street: "شارع العشرين 424ح الدور الاول شقه 9",
        apartment: "424",
        floor: "1",
        landmark: "يوجد بالعمارة ماركت البقال و بجوار كنيسه السيده العذراء مريم و الانبا رويس",
        phone: "01225468391",
        phone2: "201140122297",
        totalReports: 2,
      },
    ];

    const rows = convertStudentsToAramexRows(students);
    expect(rows).toHaveLength(1);
    expect(rows[0].studentNameAr).toBe("ابانوب عماد عدلى عبده");
    expect(rows[0].selectedCityGov).toBe("Pyramids Gardens - Giza");
    expect(rows[0].totalReports).toBe(2);
  });

  it("generates excel workbook with 17 official Aramex columns and exact Remarks formula", () => {
    const students = [
      {
        studentName: "Abanoub Emad Adly Abdou",
        studentNameAr: "ابانوب عماد عدلى عبده",
        serialNumber: 1,
        governorate: "Giza",
        city: "Hadayek Alahram",
        area: "منطقه ح",
        street: "شارع العشرين 424ح",
        apartment: "424",
        floor: "1",
        landmark: "يوجد بالعمارة ماركت البقال",
        phone: "01225468391",
        phone2: "201140122297",
        totalReports: 2,
      },
    ];

    const rows = convertStudentsToAramexRows(students);
    const wb = generateAramexWorkbook(rows, "Sheet1");
    expect(wb.SheetNames).toContain("Sheet1");

    const ws = wb.Sheets["Sheet1"];
    const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

    // Check Row 4 (Customer Details & Shipper Details)
    expect(data[4][0]).toBe("Customer Details");
    expect(data[4][12]).toBe("Shipper Details");

    // Check Row 5 (Headers)
    expect(data[5][0]).toBe("HAWB");
    expect(data[5][1]).toBe("Name");
    expect(data[5][2]).toBe("Attention");
    expect(data[5][3]).toBe("Full Address");
    expect(data[5][4]).toBe("City - Governorate (Please select from the list)");
    expect(data[5][5]).toBe("City");
    expect(data[5][6]).toBe("Destination");
    expect(data[5][7]).toBe("Government");
    expect(data[5][8]).toBe("Reference / Unique");
    expect(data[5][9]).toBe("Mobile Number");
    expect(data[5][10]).toBe("Tel Number");
    expect(data[5][12]).toBe("Origin City (Please select from the list)");
    expect(data[5][13]).toBe("Account Number");
    expect(data[5][14]).toBe("Shipper Reference");
    expect(data[5][16]).toBe("Remarks");

    // Check Data Row 6
    const r6 = data[6];
    expect(r6[1]).toBe("ابانوب عماد عدلى عبده");
    expect(r6[2]).toBe(1);
    expect(r6[4]).toBe("Pyramids Gardens - Giza");
    expect(r6[5]).toBe("Pyramids Gardens");
    expect(r6[6]).toBe("PYG");
    expect(r6[7]).toBe("Giza");
    expect(r6[8]).toBe("Hadayek Alahram");
    expect(r6[9]).toBe("01225468391");
    expect(r6[10]).toBe("201140122297");
    expect(r6[12]).toBe("Alexandria");
    expect(r6[13]).toBe("233677");
    expect(r6[14]).toBe("3930356");
    expect(r6[16]).toBe(
      "تم تسليم عدد * 2   * شهادة برجاء التوقيع +رقم البطاقة  على البوليصة  وارسالها مرة اخرى",
    );
  });
});
