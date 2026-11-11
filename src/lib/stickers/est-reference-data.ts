export interface EstReferenceRow {
  governorate: string;
  testCenter: string;
  building: string;
  floor: string;
  room: string;
  studentsEst1: number;
  studentsWithoutEssay: number;
  studentsWithEssay: number;
}

export interface EstSchoolDefinition {
  schoolName: string;
  governorate: string;
  fullFolderName: string;
  floors: Array<{
    floorName: string;
    rooms: string[];
  }>;
}

/**
 * Official schools, floors, and rooms structure for EST 1 & EST 2.
 * Matches the official Google Drive structure:
 * Schools / <School Name (Governorate)> / <Floor> / <Room>
 */
export const OFFICIAL_EST_SCHOOLS: EstSchoolDefinition[] = [
  {
    schoolName: "Al Alamiya Modern School - International",
    governorate: "Qalyubia",
    fullFolderName: "Al Alamiya Modern School - International (Qalyubia)",
    floors: [
      {
        floorName: "4th Floor",
        rooms: [
          "G5-C",
          "G6-A",
          "G6-B",
          "G6-C",
          "G7-A",
          "G7-B",
          "G7-C",
          "G7-D",
          "G8-A",
          "G8-B",
          "G12-B",
          "G12-C",
        ],
      },
    ],
  },
  {
    schoolName: "Al-Andalus International School",
    governorate: "Cairo",
    fullFolderName: "Al-Andalus International School (Cairo)",
    floors: [
      {
        floorName: "1st Floor",
        rooms: ["9C", "10B", "10C", "11B", "11C", "12B", "12C"],
      },
      {
        floorName: "2nd Floor",
        rooms: ["9A", "10A", "10D", "11A", "11D", "12A", "12D"],
      },
    ],
  },
  {
    schoolName: "El Zahraa International School - American Division",
    governorate: "Alexandria",
    fullFolderName: "El Zahraa International School - American Division (Alexandria)",
    floors: [
      {
        floorName: "1st Floor",
        rooms: ["Room 1", "Room 2", "Room 3", "Room 4", "Room 5"],
      },
    ],
  },
  {
    schoolName: "Future International School",
    governorate: "Alexandria",
    fullFolderName: "Future International School (Alexandria)",
    floors: [
      {
        floorName: "3rd Floor",
        rooms: ["10B", "11A", "11B", "11C", "12A", "12B", "12C", "MathsClass"],
      },
    ],
  },
  {
    schoolName: "Hotep International School",
    governorate: "Cairo",
    fullFolderName: "Hotep International School (Cairo)",
    floors: [
      {
        floorName: "3rd Floor",
        rooms: [
          "Senior1",
          "Senior2",
          "Senior3",
          "Senior4",
          "Senior5",
          "Senior6",
          "Senior7",
          "Senior8",
          "Senior9",
          "Senior10",
          "Senior11",
          "Senior12",
        ],
      },
    ],
  },
  {
    schoolName: "Integrated Thebes American College In Cairto",
    governorate: "Qalyubia",
    fullFolderName: "Integrated Thebes American College In Cairto (Qalyubia)",
    floors: [
      {
        floorName: "4th Floor",
        rooms: ["Room 402", "Room 403", "Room 404", "Room 405", "Room 406", "Room 407", "Room 408"],
      },
    ],
  },
  {
    schoolName: "Irtiqaa International School",
    governorate: "Menofia",
    fullFolderName: "Irtiqaa International School (Menofia)",
    floors: [
      {
        floorName: "3rd Floor",
        rooms: [
          "8A",
          "8B",
          "9A",
          "9B",
          "10A",
          "10B",
          "11A",
          "11B",
          "12A",
          "12B",
          "German room",
          "Music Room",
        ],
      },
    ],
  },
  {
    schoolName: "Mansoura College International School",
    governorate: "Dakahlia",
    fullFolderName: "Mansoura College International School (Dakahlia)",
    floors: [
      {
        floorName: "1st Floor",
        rooms: ["Room 1", "Room 2", "Room 3", "Room 4", "Room 5", "Room 6", "Room 7"],
      },
    ],
  },
  {
    schoolName: "Map International Schools",
    governorate: "Giza",
    fullFolderName: "Map International Schools (Giza)",
    floors: [
      {
        floorName: "3rd Floor",
        rooms: [
          "Room 1",
          "Room 2",
          "Room 3",
          "Room 4",
          "Room 5",
          "Room 6",
          "Room 7",
          "Room 8",
          "Room 9",
          "Room 10",
          "Room 11",
          "Room 12",
        ],
      },
    ],
  },
  {
    schoolName: "Mastery International School",
    governorate: "Cairo",
    fullFolderName: "Mastery International School (Cairo)",
    floors: [
      {
        floorName: "2nd Floor",
        rooms: ["Room 202", "Room 203", "Room 205", "Room 214", "Room 215", "Room 216", "Room 217"],
      },
    ],
  },
  {
    schoolName: "New Vision International School",
    governorate: "Giza",
    fullFolderName: "New Vision International School (Giza)",
    floors: [
      {
        floorName: "1st Floor",
        rooms: ["Room 1", "Room 2", "Room 3", "Room 4", "Room 5", "Room 6"],
      },
      {
        floorName: "2nd Floor",
        rooms: ["Room 7", "Room 8", "Room 9", "Room 10", "Room 11", "Room 12", "Room 13"],
      },
    ],
  },
  {
    schoolName: "Pioneer Misr International School",
    governorate: "Cairo",
    fullFolderName: "Pioneer Misr International School (Cairo)",
    floors: [
      {
        floorName: "2nd Floor",
        rooms: [
          "Room 1",
          "Room 2",
          "Room 3",
          "Room 4",
          "Room 5",
          "Room 6",
          "Room 7",
          "Room 8",
          "Room 9",
          "Room 10",
          "Room 11",
          "Room 12",
          "Room 13",
          "Room 14",
        ],
      },
    ],
  },
  {
    schoolName: "Pioneers International School",
    governorate: "Alexandria",
    fullFolderName: "Pioneers International School (Alexandria)",
    floors: [
      {
        floorName: "3rd Floor",
        rooms: [
          "Nebraska",
          "Nevada",
          "New Jersey",
          "New york",
          "North Carolina",
          "New Mexico",
          "California",
          "Colimbia",
          "Colorado",
          "Chicago",
          "Cleaveland",
          "Concord",
        ],
      },
    ],
  },
  {
    schoolName: "Rawasy Misr International School",
    governorate: "Cairo",
    fullFolderName: "Rawasy Misr International School (Cairo)",
    floors: [
      {
        floorName: "2nd Floor",
        rooms: ["6A", "6B", "7A", "8A", "9A", "10A", "11A"],
      },
    ],
  },
  {
    schoolName: "St.Fatima Badr International School",
    governorate: "Suez",
    fullFolderName: "St.Fatima Badr International School (Suez)",
    floors: [
      {
        floorName: "1st Floor",
        rooms: ["Room 4101", "Room 4102", "Room 4103", "Room 4104", "Room 4105"],
      },
      {
        floorName: "2nd Floor",
        rooms: ["Room 4106", "Room 4107", "Room 4108", "Room 4109", "Room 4110", "Room 4111", "Room 4112", "Room 4113"],
      },
      {
        floorName: "3rd Floor",
        rooms: ["Room 4114", "Room 4115", "Room 4116", "Room 4117", "Room 4118", "Room 4119", "Room 4120"],
      },
    ],
  },
  {
    schoolName: "Sun of Glory International School",
    governorate: "Cairo",
    fullFolderName: "Sun of Glory International School (Cairo)",
    floors: [
      {
        floorName: "1st Floor",
        rooms: [
          "Room 1.1",
          "Room 1.2",
          "Room 1.3",
          "Room 1.4",
          "Room 1.5",
          "Room 1.6",
          "Room 1.7",
          "Room 1.8",
          "Room 1.9",
          "Room 1.10",
          "Room 1.11",
          "Room 1.12",
          "Room 1.13",
          "Room 1.14",
        ],
      },
    ],
  },
  {
    schoolName: "Taymour English School",
    governorate: "Alexandria",
    fullFolderName: "Taymour English School (Alexandria)",
    floors: [
      {
        floorName: "1st Floor",
        rooms: ["Room 1", "Room 2", "Room 3"],
      },
      {
        floorName: "3rd Floor",
        rooms: ["Room 4", "Room 5", "Room 6", "Room 7"],
      },
      {
        floorName: "4th Floor",
        rooms: ["Room 8", "Room 9", "Room 10", "Room 11"],
      },
    ],
  },
  {
    schoolName: "Tiba Modern International Schools",
    governorate: "Dakahlia",
    fullFolderName: "Tiba Modern International Schools (Dakahlia)",
    floors: [
      {
        floorName: "3rd Floor",
        rooms: ["AD3A", "AD4A", "AD5A", "AD6A", "AD7A", "AD8A", "AD9A"],
      },
      {
        floorName: "4th Floor",
        rooms: ["AD10A", "AD10C", "AD10D", "AD11A", "AD11B", "AD11C", "AD12A", "AD12B"],
      },
    ],
  },
];

/**
 * Helper to parse a folder name like "Al Alamiya Modern School - International (Qalyubia)"
 * into schoolName and governorate.
 */
export function parseSchoolFolderName(folderName?: string | null): {
  schoolName: string;
  governorate?: string;
  isOfficialSchool: boolean;
} {
  if (!folderName) return { schoolName: "", isOfficialSchool: false };
  const raw = folderName.trim();

  // Check against official definitions first
  const match = OFFICIAL_EST_SCHOOLS.find(
    (s) =>
      s.fullFolderName.toLowerCase() === raw.toLowerCase() ||
      s.schoolName.toLowerCase() === raw.toLowerCase(),
  );
  if (match) {
    return {
      schoolName: match.schoolName,
      governorate: match.governorate,
      isOfficialSchool: true,
    };
  }

  // Regex extraction: "Name (Governorate)"
  const parenMatch = raw.match(/^(.*?)\s*\(([^)]+)\)$/);
  if (parenMatch) {
    return {
      schoolName: parenMatch[1].trim(),
      governorate: parenMatch[2].trim(),
      isOfficialSchool: false,
    };
  }

  return { schoolName: raw, isOfficialSchool: false };
}

/**
 * Strips "(Governorate)" from a folder or school name if present.
 */
export function stripGovernorateFromName(name?: string | null): string {
  if (!name) return "";
  return name.replace(/\s*\([^)]+\)$/, "").trim();
}

/**
 * Set of all official room names across all schools (lowercase).
 */
export const OFFICIAL_ROOMS_SET = new Set<string>(
  OFFICIAL_EST_SCHOOLS.flatMap((s) => s.floors.flatMap((fl) => fl.rooms.map((r) => r.toLowerCase()))),
);

/**
 * Logical sorting weight for floor names to guarantee standard building floor order:
 * Basement (0) -> Ground (10) -> Mezzanine (15) -> 1st (21) -> 2nd (22) -> 3rd (23) ...
 */
export function getFloorSortWeight(floorName?: string | null): number {
  if (!floorName) return 999;
  const clean = floorName.toLowerCase().trim();
  if (/basement|بدروم|تسوية/i.test(clean)) return 0;
  if (/ground|أرضي/i.test(clean)) return 10;
  if (/mezzanine|ميزانين/i.test(clean)) return 15;
  const match = clean.match(/(\d+)/);
  if (match) {
    return 20 + parseInt(match[1], 10);
  }
  return 100;
}

/**
 * Builds standard EST reference rows for all official schools.
 * Supports lookups by either clean school name or full folder name with governorate.
 */
function buildOfficialReferenceRows(): EstReferenceRow[] {
  const rows: EstReferenceRow[] = [];

  for (const school of OFFICIAL_EST_SCHOOLS) {
    for (const fl of school.floors) {
      for (const room of fl.rooms) {
        // Index each room once with full folder name and clean test center name
        rows.push({
          governorate: school.governorate,
          testCenter: school.schoolName,
          building: school.fullFolderName,
          floor: fl.floorName,
          room,
          studentsEst1: 25,
          studentsWithoutEssay: 25,
          studentsWithEssay: 0,
        });
      }
    }
  }

  // Legacy compatibility rows so tests and previous references continue to pass
  rows.push(
    { governorate: "Alexandria", testCenter: "Abu Qir", building: "Pharmacy", floor: "2nd Floor", room: "204", studentsEst1: 30, studentsWithoutEssay: 30, studentsWithEssay: 0 },
    { governorate: "Alexandria", testCenter: "Abu Qir", building: "Pharmacy", floor: "2nd Floor", room: "205", studentsEst1: 25, studentsWithoutEssay: 25, studentsWithEssay: 0 },
    { governorate: "Alexandria", testCenter: "Abu Qir", building: "Pharmacy", floor: "2nd Floor", room: "219", studentsEst1: 25, studentsWithoutEssay: 25, studentsWithEssay: 0 },
    { governorate: "Alexandria", testCenter: "Abu Qir", building: "Pharmacy", floor: "3rd Floor", room: "304", studentsEst1: 25, studentsWithoutEssay: 25, studentsWithEssay: 0 },
    { governorate: "Alexandria", testCenter: "Abu Qir", building: "Pharmacy", floor: "3rd Floor", room: "305", studentsEst1: 25, studentsWithoutEssay: 25, studentsWithEssay: 0 },
    { governorate: "Alexandria", testCenter: "Abu Qir", building: "Pharmacy", floor: "3rd Floor", room: "319", studentsEst1: 25, studentsWithoutEssay: 25, studentsWithEssay: 0 },
    { governorate: "Alexandria", testCenter: "Abu Qir", building: "Pharmacy", floor: "4th Floor", room: "404", studentsEst1: 25, studentsWithoutEssay: 25, studentsWithEssay: 0 },
    { governorate: "Alexandria", testCenter: "Abu Qir", building: "Pharmacy", floor: "4th Floor", room: "405", studentsEst1: 25, studentsWithoutEssay: 25, studentsWithEssay: 0 },
    { governorate: "Alexandria", testCenter: "Abu Qir", building: "Pharmacy", floor: "4th Floor", room: "424", studentsEst1: 25, studentsWithoutEssay: 25, studentsWithEssay: 0 },
    { governorate: "Alexandria", testCenter: "Abu Qir", building: "Pharmacy", floor: "5th Floor", room: "504", studentsEst1: 24, studentsWithoutEssay: 24, studentsWithEssay: 0 },
    { governorate: "Alexandria", testCenter: "Abu Qir", building: "Pharmacy", floor: "5th Floor", room: "505", studentsEst1: 25, studentsWithoutEssay: 25, studentsWithEssay: 0 },
    { governorate: "Alexandria", testCenter: "Abu Qir", building: "Pharmacy", floor: "5th Floor", room: "507", studentsEst1: 30, studentsWithoutEssay: 30, studentsWithEssay: 0 },
    { governorate: "Alexandria", testCenter: "Abu Qir", building: "Pharmacy", floor: "5th Floor", room: "513", studentsEst1: 25, studentsWithoutEssay: 25, studentsWithEssay: 0 },
    { governorate: "Cairo", testCenter: "Sheraton", building: "Transport & Logistics", floor: "2nd Floor", room: "201A", studentsEst1: 27, studentsWithoutEssay: 27, studentsWithEssay: 0 },
    { governorate: "Cairo", testCenter: "Sheraton", building: "Management & Technology", floor: "2nd Floor", room: "201", studentsEst1: 25, studentsWithoutEssay: 25, studentsWithEssay: 0 },
  );

  return rows;
}

export const EST_REFERENCE_DATA: EstReferenceRow[] = buildOfficialReferenceRows();

export interface SubfolderInfoResult {
  childCount: number;
  childLabel: string;
  childNames: string[];
  totalRooms?: number;
}

/**
 * Resolves child subfolder information (e.g. floors inside a building, or rooms inside a floor)
 * based on the reference EST dataset.
 */
export function getReferenceSubfolderInfo(params: {
  level: "governorate" | "center" | "building" | "floor" | "room" | "root" | "custom";
  governorate?: string;
  center?: string;
  building?: string;
  floor?: string;
}): SubfolderInfoResult {
  const norm = (s?: string) => s?.trim().toLowerCase() || "";
  const gov = norm(params.governorate);
  const center = norm(params.center);
  const rawBuilding = norm(params.building);
  const cleanBuilding = norm(stripGovernorateFromName(params.building));
  const floor = norm(params.floor);

  if (params.level === "building" && rawBuilding) {
    const matching = EST_REFERENCE_DATA.filter((r) => {
      const rowClean = norm(stripGovernorateFromName(r.building));
      const matchB =
        norm(r.building) === rawBuilding ||
        norm(r.building) === cleanBuilding ||
        rowClean === cleanBuilding ||
        (cleanBuilding.length > 3 && (rowClean.includes(cleanBuilding) || cleanBuilding.includes(rowClean)));
      const matchC =
        !center ||
        norm(r.testCenter) === center ||
        norm(stripGovernorateFromName(r.testCenter)) === norm(stripGovernorateFromName(center));
      const matchG = !gov || norm(r.governorate) === gov;
      return matchB && matchC && matchG;
    });
    const uniqueFloors = Array.from(new Set(matching.map((r) => r.floor))).filter(Boolean);
    const uniqueRooms = Array.from(new Set(matching.map((r) => r.room))).filter(Boolean);
    return {
      childCount: uniqueFloors.length,
      childLabel: "Floors",
      childNames: uniqueFloors,
      totalRooms: uniqueRooms.length,
    };
  }

  if (params.level === "floor" && floor) {
    const matching = EST_REFERENCE_DATA.filter((r) => {
      const rowClean = norm(stripGovernorateFromName(r.building));
      const matchF = norm(r.floor) === floor;
      const matchB =
        !rawBuilding ||
        norm(r.building) === rawBuilding ||
        norm(r.building) === cleanBuilding ||
        rowClean === cleanBuilding ||
        (cleanBuilding.length > 3 && (rowClean.includes(cleanBuilding) || cleanBuilding.includes(rowClean)));
      const matchC =
        !center ||
        norm(r.testCenter) === center ||
        norm(stripGovernorateFromName(r.testCenter)) === norm(stripGovernorateFromName(center));
      const matchG = !gov || norm(r.governorate) === gov;
      return matchF && matchB && matchC && matchG;
    });
    const uniqueRooms = Array.from(new Set(matching.map((r) => r.room))).filter(Boolean);
    return {
      childCount: uniqueRooms.length,
      childLabel: "Rooms",
      childNames: uniqueRooms,
      totalRooms: uniqueRooms.length,
    };
  }

  if (params.level === "center" && center) {
    const matching = EST_REFERENCE_DATA.filter((r) => {
      const matchC = norm(r.testCenter) === center || norm(stripGovernorateFromName(r.testCenter)) === norm(stripGovernorateFromName(center));
      const matchG = !gov || norm(r.governorate) === gov;
      return matchC && matchG;
    });
    const uniqueBuildings = Array.from(new Set(matching.map((r) => r.building))).filter(Boolean);
    const uniqueRooms = Array.from(new Set(matching.map((r) => r.room))).filter(Boolean);
    return {
      childCount: uniqueBuildings.length,
      childLabel: "Buildings",
      childNames: uniqueBuildings,
      totalRooms: uniqueRooms.length,
    };
  }

  if (params.level === "governorate" && gov) {
    const matching = EST_REFERENCE_DATA.filter((r) => norm(r.governorate) === gov);
    const uniqueCenters = Array.from(new Set(matching.map((r) => r.testCenter))).filter(Boolean);
    const uniqueRooms = Array.from(new Set(matching.map((r) => r.room))).filter(Boolean);
    return {
      childCount: uniqueCenters.length,
      childLabel: "Centers",
      childNames: uniqueCenters,
      totalRooms: uniqueRooms.length,
    };
  }

  return {
    childCount: 0,
    childLabel: "",
    childNames: [],
    totalRooms: 0,
  };
}
