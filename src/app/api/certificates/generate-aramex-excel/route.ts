import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import JSZip from "jszip";
import type { AramexRowItem } from "@/lib/aramex-utils";
import { ARAMEX_CITY_MAP, DEFAULT_ARAMEX_CITY, buildFullAddress } from "@/lib/aramex-utils";

function escapeXml(unsafe: any): string {
  if (unsafe === undefined || unsafe === null) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rows: AramexRowItem[] = Array.isArray(body.rows) ? body.rows : [];
    const fileName = (body.fileName || "Aramex_Shipments").replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, "_");

    if (rows.length === 0) {
      return NextResponse.json({ error: "No shipment rows provided" }, { status: 400 });
    }

    const tplPath = path.join(process.cwd(), "Aramex_PDU_Template_City_Auto_Fixed (2).xlsx");
    if (!fs.existsSync(tplPath)) {
      throw new Error("Aramex official template file not found on server");
    }

    const tplBuffer = fs.readFileSync(tplPath);
    const zip = await JSZip.loadAsync(tplBuffer);

    const sheet1File = zip.file("xl/worksheets/sheet1.xml");
    if (!sheet1File) {
      throw new Error("Could not find xl/worksheets/sheet1.xml inside Aramex template");
    }

    let sheet1Xml = await sheet1File.async("text");

    // Locate the start of row 7 and the end of sheetData
    const row7Idx = sheet1Xml.indexOf('<row r="7"');
    const sheetDataEndIdx = sheet1Xml.indexOf("</sheetData>");

    if (row7Idx === -1 || sheetDataEndIdx === -1) {
      throw new Error("Could not find row 7 or </sheetData> in sheet1.xml");
    }

    const maxRowsInTemplate = 3001;
    const newRowXmls: string[] = [];

    // 1. Populate rows with student shipment data starting at row 7
    for (let idx = 0; idx < rows.length; idx++) {
      const r = rows[idx];
      const rowNum = idx + 7;
      const cityOpt =
        r.cityOption ||
        ARAMEX_CITY_MAP.get((r.selectedCityGov || "").toLowerCase()) ||
        DEFAULT_ARAMEX_CITY;

      const nameVal = r.studentNameAr || r.studentNameEn || "";
      const attentionNum =
        r.serialNumber !== undefined && r.serialNumber !== ""
          ? Number(r.serialNumber) || r.serialNumber
          : idx + 1;
      const totalReports =
        r.totalReports !== undefined && r.totalReports !== "" ? r.totalReports : 1;
      const remarksText = `تم تسليم عدد * ${totalReports}   * شهادة برجاء التوقيع +رقم البطاقة  على البوليصة  وارسالها مرة اخرى`;

      const refUnique = r.originalCity || r.area || "";
      const mobileVal = r.phone || "";
      const telVal = r.phone2 || r.phone || "";
      const fullAddressVal =
        r.fullAddress && r.fullAddress.includes("،")
          ? r.fullAddress
          : buildFullAddress({
              governorate: r.governorate,
              city: r.originalCity,
              area: r.area,
              street: r.street,
              apartment: r.apartment,
              floor: r.floor,
              landmark: r.landmark,
            }) || r.fullAddress || "";

      const rowXml =
        `<row r="${rowNum}" spans="1:30" ht="16.35" customHeight="1">` +
        `<c r="A${rowNum}" s="8"/>` +
        `<c r="B${rowNum}" s="9" t="inlineStr"><is><t>${escapeXml(nameVal)}</t></is></c>` +
        `<c r="C${rowNum}" s="8"><v>${attentionNum}</v></c>` +
        `<c r="D${rowNum}" s="10" t="inlineStr"><is><t>${escapeXml(fullAddressVal)}</t></is></c>` +
        `<c r="E${rowNum}" s="8" t="str"><f>IFERROR(LOOKUP(2,1/(ISNUMBER(SEARCH(CityLookup!$A$2:$A$477,D${rowNum}))),CityLookup!$B$2:$B$477),"")</f><v>${escapeXml(cityOpt.cityGov)}</v></c>` +
        `<c r="F${rowNum}" s="11" t="str"><f>IFERROR(VLOOKUP($E${rowNum},List!$A$2:$D$346,2,FALSE()),"")</f><v>${escapeXml(cityOpt.city)}</v></c>` +
        `<c r="G${rowNum}" s="11" t="str"><f>IFERROR(VLOOKUP($E${rowNum},List!$A$2:$D$346,4,FALSE()),"")</f><v>${escapeXml(cityOpt.code)}</v></c>` +
        `<c r="H${rowNum}" s="11" t="str"><f>IFERROR(VLOOKUP($E${rowNum},List!$A$2:$D$346,3,FALSE()),"")</f><v>${escapeXml(cityOpt.gov)}</v></c>` +
        `<c r="I${rowNum}" s="10" t="inlineStr"><is><t>${escapeXml(refUnique)}</t></is></c>` +
        `<c r="J${rowNum}" s="8" t="inlineStr"><is><t>${escapeXml(mobileVal)}</t></is></c>` +
        `<c r="K${rowNum}" s="8" t="inlineStr"><is><t>${escapeXml(telVal)}</t></is></c>` +
        `<c r="L${rowNum}" s="10"/>` +
        `<c r="M${rowNum}" s="12" t="inlineStr"><is><t>Alexandria</t></is></c>` +
        `<c r="N${rowNum}" s="8"><v>233677</v></c>` +
        `<c r="O${rowNum}" s="8"><v>3930356</v></c>` +
        `<c r="P${rowNum}" s="8"/>` +
        `<c r="Q${rowNum}" s="13" t="inlineStr"><is><t>${escapeXml(remarksText)}</t></is></c>` +
        `<c r="R${rowNum}" s="2"/><c r="S${rowNum}" s="2"/><c r="T${rowNum}" s="2"/><c r="U${rowNum}" s="2"/><c r="V${rowNum}" s="2"/><c r="W${rowNum}" s="2"/><c r="X${rowNum}" s="2"/><c r="Y${rowNum}" s="2"/><c r="Z${rowNum}" s="2"/><c r="AA${rowNum}" s="2"/><c r="AB${rowNum}" s="2"/><c r="AC${rowNum}" s="2"/><c r="AD${rowNum}" s="2"/>` +
        `</row>`;

      newRowXmls.push(rowXml);
    }

    // 2. For remaining rows up to 3001, keep blank formula rows exactly like the official template
    const lastFilledRow = rows.length + 6;
    const endRow = Math.max(lastFilledRow, maxRowsInTemplate);

    for (let rowNum = lastFilledRow + 1; rowNum <= endRow; rowNum++) {
      const emptyRowXml =
        `<row r="${rowNum}" spans="1:30" ht="15" customHeight="1">` +
        `<c r="A${rowNum}" s="8"/><c r="B${rowNum}" s="8"/><c r="C${rowNum}" s="8"/><c r="D${rowNum}" s="8"/>` +
        `<c r="E${rowNum}" s="14" t="str"><f>IFERROR(LOOKUP(2,1/(ISNUMBER(SEARCH(CityLookup!$A$2:$A$477,D${rowNum}))),CityLookup!$B$2:$B$477),"")</f><v/></c>` +
        `<c r="F${rowNum}" s="11" t="str"><f>IFERROR(VLOOKUP($E${rowNum},List!$A$2:$D$346,2,FALSE()),"")</f><v/></c>` +
        `<c r="G${rowNum}" s="11" t="str"><f>IFERROR(VLOOKUP($E${rowNum},List!$A$2:$D$346,4,FALSE()),"")</f><v/></c>` +
        `<c r="H${rowNum}" s="11" t="str"><f>IFERROR(VLOOKUP($E${rowNum},List!$A$2:$D$346,3,FALSE()),"")</f><v/></c>` +
        `<c r="I${rowNum}" s="8"/><c r="J${rowNum}" s="8"/><c r="K${rowNum}" s="8"/><c r="L${rowNum}" s="13"/>` +
        `<c r="M${rowNum}" s="12"/><c r="N${rowNum}" s="8"/><c r="O${rowNum}" s="8"/><c r="P${rowNum}" s="8"/>` +
        `<c r="Q${rowNum}" s="13"/>` +
        `<c r="R${rowNum}" s="2"/><c r="S${rowNum}" s="2"/><c r="T${rowNum}" s="2"/><c r="U${rowNum}" s="2"/><c r="V${rowNum}" s="2"/><c r="W${rowNum}" s="2"/><c r="X${rowNum}" s="2"/><c r="Y${rowNum}" s="2"/><c r="Z${rowNum}" s="2"/><c r="AA${rowNum}" s="2"/><c r="AB${rowNum}" s="2"/><c r="AC${rowNum}" s="2"/><c r="AD${rowNum}" s="2"/>` +
        `</row>`;

      newRowXmls.push(emptyRowXml);
    }

    // Replace the row block in sheet1Xml
    const updatedSheet1Xml =
      sheet1Xml.slice(0, row7Idx) + newRowXmls.join("") + sheet1Xml.slice(sheetDataEndIdx);

    zip.file("xl/worksheets/sheet1.xml", updatedSheet1Xml);

    const outBuf = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    return new NextResponse(new Uint8Array(outBuf), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}.xlsx"`,
      },
    });
  } catch (err: any) {
    console.error("[generate-aramex-excel] error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to generate Aramex Excel file" },
      { status: 500 },
    );
  }
}
