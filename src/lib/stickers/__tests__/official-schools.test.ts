import { describe, it, expect } from "vitest";
import {
  OFFICIAL_EST_SCHOOLS,
  parseSchoolFolderName,
  stripGovernorateFromName,
  OFFICIAL_ROOMS_SET,
} from "../est-reference-data";
import { isRoomFolderName } from "../register-utils";
import { buildStickerContent } from "../sticker-content";

describe("Official EST 1 & EST 2 Schools Architecture", () => {
  it("defines exactly 18 official schools with 202 total rooms", () => {
    expect(OFFICIAL_EST_SCHOOLS).toHaveLength(18);

    const totalRooms = OFFICIAL_EST_SCHOOLS.reduce(
      (sum, s) => sum + s.floors.reduce((fsum, fl) => fsum + fl.rooms.length, 0),
      0,
    );
    expect(totalRooms).toBe(202);
  });

  it("parses school folder names with governorates accurately", () => {
    const res = parseSchoolFolderName("Al Alamiya Modern School - International (Qalyubia)");
    expect(res.schoolName).toBe("Al Alamiya Modern School - International");
    expect(res.governorate).toBe("Qalyubia");
    expect(res.isOfficialSchool).toBe(true);

    const res2 = parseSchoolFolderName("Pioneers International School (Alexandria)");
    expect(res2.schoolName).toBe("Pioneers International School");
    expect(res2.governorate).toBe("Alexandria");

    expect(stripGovernorateFromName("Al-Andalus International School (Cairo)")).toBe(
      "Al-Andalus International School",
    );
  });

  it("recognizes all special and named rooms across all schools", () => {
    // US States / Cities in Pioneers International School
    expect(isRoomFolderName("Nebraska")).toBe(true);
    expect(isRoomFolderName("California")).toBe(true);
    expect(isRoomFolderName("Chicago")).toBe(true);
    expect(isRoomFolderName("Colimbia")).toBe(true);

    // Seniors in Hotep International School
    expect(isRoomFolderName("Senior1")).toBe(true);
    expect(isRoomFolderName("Senior12")).toBe(true);

    // MathsClass in Future International School
    expect(isRoomFolderName("MathsClass")).toBe(true);

    // German room & Music room in Irtiqaa
    expect(isRoomFolderName("German room")).toBe(true);
    expect(isRoomFolderName("Music Room")).toBe(true);

    // Dot decimals in Sun of Glory
    expect(isRoomFolderName("Room 1.1")).toBe(true);
    expect(isRoomFolderName("Room 1.14")).toBe(true);

    // Grade codes in Al Alamiya
    expect(isRoomFolderName("G5-C")).toBe(true);
    expect(isRoomFolderName("G12-C")).toBe(true);

    // AD codes in Tiba Modern
    expect(isRoomFolderName("AD3A")).toBe(true);
    expect(isRoomFolderName("AD12B")).toBe(true);

    // Standard Room numbers
    expect(isRoomFolderName("Room 402")).toBe(true);
    expect(isRoomFolderName("Room 4101")).toBe(true);
  });

  it("builds sticker content correctly for the Schools folder hierarchy", () => {
    const chain = [
      "EST 1",
      "Schools",
      "Al Alamiya Modern School - International (Qalyubia)",
      "4th Floor",
      "G5-C",
    ];

    const content = buildStickerContent(chain);
    expect(content.level).toBe("room");
    expect(content.room).toBe("G5-C");
    expect(content.floor).toBe("4th Floor");
    expect(content.building).toBe("Al Alamiya Modern School - International");
    expect(content.governorate).toBe("Qalyubia");
  });

  it("builds building sticker content correctly for a School folder", () => {
    const chain = [
      "December 2026",
      "EST 2",
      "Schools",
      "Pioneers International School (Alexandria)",
    ];

    const content = buildStickerContent(chain);
    expect(content.level).toBe("building");
    expect(content.building).toBe("Pioneers International School");
    expect(content.governorate).toBe("Alexandria");
    expect(content.childLabel).toBe("Floors");
    expect(content.childNames).toEqual(["3rd Floor"]);
    expect(content.totalRooms).toBe(12);
  });

  it("builds sticker content correctly for schools located directly inside their governorate", () => {
    // School Room level: Governorate -> School -> Floor -> Room (School is center & building)
    const roomChain = [
      "December 2026",
      "EST 1",
      "Cairo",
      "Al-Andalus International School",
      "1st Floor",
      "10B",
    ];

    const roomContent = buildStickerContent(roomChain);
    expect(roomContent.level).toBe("room");
    expect(roomContent.room).toBe("10B");
    expect(roomContent.floor).toBe("1st Floor");
    expect(roomContent.building).toBe("Al-Andalus International School");
    expect(roomContent.center).toBe("Al-Andalus International School");
    expect(roomContent.governorate).toBe("Cairo");

    // School Floor level: Governorate -> School -> Floor
    const floorChain = [
      "EST 1",
      "Alexandria",
      "Future International School",
      "3rd Floor",
    ];

    const floorContent = buildStickerContent(floorChain);
    expect(floorContent.level).toBe("floor");
    expect(floorContent.floor).toBe("3rd Floor");
    expect(floorContent.building).toBe("Future International School");
    expect(floorContent.center).toBe("Future International School");
    expect(floorContent.governorate).toBe("Alexandria");

    // School Building level: Governorate -> School
    const schoolChain = [
      "EST 2",
      "Qalyubia",
      "Al Alamiya Modern School - International",
    ];

    const schoolContent = buildStickerContent(schoolChain);
    expect(schoolContent.level).toBe("building");
    expect(schoolContent.building).toBe("Al Alamiya Modern School - International");
    expect(schoolContent.center).toBe("Al Alamiya Modern School - International");
    expect(schoolContent.governorate).toBe("Qalyubia");

    // Multi-building University Center level: Governorate -> Center -> Building -> Floor -> Room
    const uniChain = [
      "EST 1",
      "Alexandria",
      "Abu Qir",
      "Pharmacy",
      "2nd Floor",
      "204",
    ];

    const uniContent = buildStickerContent(uniChain);
    expect(uniContent.level).toBe("room");
    expect(uniContent.room).toBe("204");
    expect(uniContent.floor).toBe("2nd Floor");
    expect(uniContent.building).toBe("Pharmacy");
    expect(uniContent.center).toBe("Abu Qir");
    expect(uniContent.governorate).toBe("Alexandria");
  });
});

