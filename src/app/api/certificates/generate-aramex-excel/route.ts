import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import type { AramexRowItem } from "@/lib/aramex-utils";
import { ARAMEX_CITY_MAP, DEFAULT_ARAMEX_CITY } from "@/lib/aramex-utils";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rows: AramexRowItem[] = Array.isArray(body.rows) ? body.rows : [];
    const fileName = (body.fileName || "Aramex_Shipments").replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, "_");

    if (rows.length === 0) {
      return NextResponse.json({ error: "No shipment rows provided" }, { status: 400 });
    }

    const tplPath = path.join(process.cwd(), "Aramex_PDU_Template_City_Auto_Fixed (2).xlsx");
    let wb: XLSX.WorkBook;

    if (fs.existsSync(tplPath)) {
      const tplBuffer = fs.readFileSync(tplPath);
      wb = XLSX.read(tplBuffer, { type: "buffer", cellFormula: true, cellStyles: true });
    } else {
      // Fallback: create fresh workbook if template is not found on disk
      wb = XLSX.utils.book_new();
    }

    let ws = wb.Sheets["PDU_Data"];
    if (!ws) {
      ws = XLSX.utils.aoa_to_sheet([]);
      XLSX.utils.book_append_sheet(wb, ws, "PDU_Data");
    }

    // Set merges for header
    ws["!merges"] = [
      { s: { c: 12, r: 4 }, e: { c: 16, r: 4 } }, // Shipper Details
      { s: { c: 0, r: 4 }, e: { c: 11, r: 4 } },  // Customer Details
    ];

    // Ensure header row 4 and row 5
    ws["A5"] = { t: "s", v: "Customer Details" };
    ws["M5"] = { t: "s", v: "Shipper Details" };

    const headers = [
      "HAWB",
      "Name",
      "Attention",
      "Full Address",
      "City - Governorate (Please select from the list)",
      "City",
      "Destination",
      "Government",
      "Reference / Unique",
      "Mobile Number",
      "Tel Number",
      "Landline Number",
      "Origin City (Please select from the list)",
      "Account Number",
      "Shipper Reference",
      "Commodity Description",
      "Remarks",
    ];

    const colLetters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q"];

    for (let c = 0; c < headers.length; c++) {
      ws[`${colLetters[c]}6`] = { t: "s", v: headers[c] };
    }

    // Populate data rows starting from row 7 (index 6)
    for (let idx = 0; idx < rows.length; idx++) {
      const r = rows[idx];
      const rowNum = idx + 7;
      const cityOpt =
        r.cityOption ||
        ARAMEX_CITY_MAP.get((r.selectedCityGov || "").toLowerCase()) ||
        DEFAULT_ARAMEX_CITY;

      const nameVal = r.studentNameAr || r.studentNameEn || "";
      const attentionNum = r.serialNumber !== undefined && r.serialNumber !== "" ? Number(r.serialNumber) || r.serialNumber : idx + 1;
      const totalReports = r.totalReports !== undefined && r.totalReports !== "" ? r.totalReports : 1;
      const remarksText = `تم تسليم عدد * ${totalReports}   * شهادة برجاء التوقيع +رقم البطاقة  على البوليصة  وارسالها مرة اخرى`;

      ws[`A${rowNum}`] = { t: "s", v: "" };
      ws[`B${rowNum}`] = { t: "s", v: nameVal };
      ws[`C${rowNum}`] = typeof attentionNum === "number" ? { t: "n", v: attentionNum } : { t: "s", v: String(attentionNum) };
      ws[`D${rowNum}`] = { t: "s", v: r.fullAddress || "" };
      ws[`E${rowNum}`] = {
        t: "s",
        v: cityOpt.cityGov,
        f: `IFERROR(LOOKUP(2,1/(ISNUMBER(SEARCH(CityLookup!$A$2:$A$477,D${rowNum}))),CityLookup!$B$2:$B$477),"")`,
      };
      ws[`F${rowNum}`] = {
        t: "s",
        v: cityOpt.city,
        f: `IFERROR(VLOOKUP($E${rowNum},List!$A$2:$D$346,2,FALSE()),"")`,
      };
      ws[`G${rowNum}`] = {
        t: "s",
        v: cityOpt.code,
        f: `IFERROR(VLOOKUP($E${rowNum},List!$A$2:$D$346,4,FALSE()),"")`,
      };
      ws[`H${rowNum}`] = {
        t: "s",
        v: cityOpt.gov,
        f: `IFERROR(VLOOKUP($E${rowNum},List!$A$2:$D$346,3,FALSE()),"")`,
      };
      ws[`I${rowNum}`] = { t: "s", v: r.originalCity || r.area || "" };
      ws[`J${rowNum}`] = { t: "s", v: r.phone || "" };
      ws[`K${rowNum}`] = { t: "s", v: r.phone2 || r.phone || "" };
      ws[`L${rowNum}`] = { t: "s", v: "" };
      ws[`M${rowNum}`] = { t: "s", v: "Alexandria" };
      ws[`N${rowNum}`] = { t: "n", v: 233677 };
      ws[`O${rowNum}`] = { t: "n", v: 3930356 };
      ws[`P${rowNum}`] = { t: "s", v: "" };
      ws[`Q${rowNum}`] = { t: "s", v: remarksText };
    }

    // Clear stale rows beyond current dataset up to 3001
    const endRow = Math.max(rows.length + 6, 6);
    for (let r = endRow + 1; r <= 3001; r++) {
      let hasCell = false;
      for (const col of colLetters) {
        const addr = `${col}${r}`;
        if (ws[addr]) {
          delete ws[addr];
          hasCell = true;
        }
      }
      if (!hasCell && r > endRow + 10) break;
    }

    ws["!ref"] = `A1:Q${endRow}`;

    // Column widths
    ws["!cols"] = [
      { wch: 10 }, // HAWB
      { wch: 32 }, // Name
      { wch: 10 }, // Attention
      { wch: 70 }, // Full Address
      { wch: 32 }, // City - Governorate
      { wch: 22 }, // City
      { wch: 12 }, // Destination
      { wch: 15 }, // Government
      { wch: 20 }, // Reference / Unique
      { wch: 16 }, // Mobile Number
      { wch: 16 }, // Tel Number
      { wch: 16 }, // Landline Number
      { wch: 18 }, // Origin City
      { wch: 16 }, // Account Number
      { wch: 18 }, // Shipper Reference
      { wch: 20 }, // Commodity Description
      { wch: 75 }, // Remarks
    ];

    const outBuf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(outBuf, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}.xlsx"`,
      },
    });
  } catch (err: any) {
    console.error("[generate-aramex-excel] error:", err);
    return NextResponse.json({ error: err?.message || "Failed to generate Aramex Excel file" }, { status: 500 });
  }
}

