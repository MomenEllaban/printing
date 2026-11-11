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
});
