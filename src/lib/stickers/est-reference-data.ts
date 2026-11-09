import type { drive_v3 } from "googleapis";
import { createFolder, searchFolders } from "@/lib/drive";

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

/**
 * Initial reference dataset from prompt section 10.
 * Preserves exact casing, names, and numbers.
 */
export const EST_REFERENCE_DATA: EstReferenceRow[] = [
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

  { governorate: "Alexandria", testCenter: "Future International School", building: "Future International School", floor: "3rd Floor", room: "3rd floor 12A", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },
  { governorate: "Alexandria", testCenter: "Future International School", building: "Future International School", floor: "3rd Floor", room: "3rd floor 12B", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },
  { governorate: "Alexandria", testCenter: "Future International School", building: "Future International School", floor: "3rd Floor", room: "3rd floor 12C", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },
  { governorate: "Alexandria", testCenter: "Future International School", building: "Future International School", floor: "3rd Floor", room: "3rd floor 11A", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },
  { governorate: "Alexandria", testCenter: "Future International School", building: "Future International School", floor: "3rd Floor", room: "3rd floor 11B", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },
  { governorate: "Alexandria", testCenter: "Future International School", building: "Future International School", floor: "3rd Floor", room: "3rd floor 11C", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },
  { governorate: "Alexandria", testCenter: "Future International School", building: "Future International School", floor: "3rd Floor", room: "3rd floor 10B", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },
  { governorate: "Alexandria", testCenter: "Future International School", building: "Future International School", floor: "3rd Floor", room: "3rd floor MathsClass", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },

  { governorate: "Alexandria", testCenter: "Pioneers International School", building: "Pioneers International School", floor: "3rd Floor", room: "3rd floor Nebraska", studentsEst1: 15, studentsWithoutEssay: 12, studentsWithEssay: 3 },
  { governorate: "Alexandria", testCenter: "Pioneers International School", building: "Pioneers International School", floor: "3rd Floor", room: "3rd floor Nevada", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },
  { governorate: "Alexandria", testCenter: "Pioneers International School", building: "Pioneers International School", floor: "3rd Floor", room: "3rd floor New Mexico", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },
  { governorate: "Alexandria", testCenter: "Pioneers International School", building: "Pioneers International School", floor: "3rd Floor", room: "3rd floor New Jersey", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },
  { governorate: "Alexandria", testCenter: "Pioneers International School", building: "Pioneers International School", floor: "3rd Floor", room: "3rd floor New york", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },
  { governorate: "Alexandria", testCenter: "Pioneers International School", building: "Pioneers International School", floor: "3rd Floor", room: "3rd floor North Carolina", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },

  { governorate: "Alexandria", testCenter: "El Zahraa International School", building: "El Zahraa International School - American Division", floor: "1st Floor", room: "1st floor Room 1", studentsEst1: 14, studentsWithoutEssay: 14, studentsWithEssay: 0 },
  { governorate: "Alexandria", testCenter: "El Zahraa International School", building: "El Zahraa International School - American Division", floor: "1st Floor", room: "1st floor Room 2", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },
  { governorate: "Alexandria", testCenter: "El Zahraa International School", building: "El Zahraa International School - American Division", floor: "1st Floor", room: "1st floor Room 3", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },
  { governorate: "Alexandria", testCenter: "El Zahraa International School", building: "El Zahraa International School - American Division", floor: "1st Floor", room: "1st floor Room 4", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },
  { governorate: "Alexandria", testCenter: "El Zahraa International School", building: "El Zahraa International School - American Division", floor: "1st Floor", room: "1st floor Room 5", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },

  { governorate: "Cairo", testCenter: "Sheraton", building: "Transport & Logistics", floor: "2nd Floor", room: "201A", studentsEst1: 27, studentsWithoutEssay: 27, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Sheraton", building: "Transport & Logistics", floor: "2nd Floor", room: "202A", studentsEst1: 27, studentsWithoutEssay: 27, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Sheraton", building: "Transport & Logistics", floor: "2nd Floor", room: "203A", studentsEst1: 27, studentsWithoutEssay: 27, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Sheraton", building: "Transport & Logistics", floor: "2nd Floor", room: "204A", studentsEst1: 27, studentsWithoutEssay: 27, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Sheraton", building: "Transport & Logistics", floor: "2nd Floor", room: "205A", studentsEst1: 27, studentsWithoutEssay: 27, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Sheraton", building: "Transport & Logistics", floor: "3nd Floor", room: "302A", studentsEst1: 27, studentsWithoutEssay: 27, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Sheraton", building: "Transport & Logistics", floor: "3nd Floor", room: "303A", studentsEst1: 26, studentsWithoutEssay: 26, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Sheraton", building: "Transport & Logistics", floor: "3nd Floor", room: "304A", studentsEst1: 27, studentsWithoutEssay: 27, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Sheraton", building: "Transport & Logistics", floor: "3nd Floor", room: "305A", studentsEst1: 27, studentsWithoutEssay: 27, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Sheraton", building: "Transport & Logistics", floor: "4th Floor", room: "401A", studentsEst1: 27, studentsWithoutEssay: 27, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Sheraton", building: "Transport & Logistics", floor: "4th Floor", room: "402A", studentsEst1: 27, studentsWithoutEssay: 27, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Sheraton", building: "Transport & Logistics", floor: "4th Floor", room: "403A", studentsEst1: 27, studentsWithoutEssay: 27, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Sheraton", building: "Transport & Logistics", floor: "4th Floor", room: "404A", studentsEst1: 27, studentsWithoutEssay: 27, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Sheraton", building: "Transport & Logistics", floor: "4th Floor", room: "405A", studentsEst1: 27, studentsWithoutEssay: 27, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Sheraton", building: "Transport & Logistics", floor: "5th Floor", room: "502A", studentsEst1: 27, studentsWithoutEssay: 27, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Sheraton", building: "Transport & Logistics", floor: "5th Floor", room: "503A", studentsEst1: 27, studentsWithoutEssay: 27, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Sheraton", building: "Transport & Logistics", floor: "5th Floor", room: "504A", studentsEst1: 27, studentsWithoutEssay: 27, studentsWithEssay: 0 },

  { governorate: "Cairo", testCenter: "Sheraton", building: "Management & Technology", floor: "Ground", room: "2", studentsEst1: 25, studentsWithoutEssay: 21, studentsWithEssay: 4 },
  { governorate: "Cairo", testCenter: "Sheraton", building: "Management & Technology", floor: "Ground", room: "3", studentsEst1: 25, studentsWithoutEssay: 25, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Sheraton", building: "Management & Technology", floor: "Ground", room: "4", studentsEst1: 25, studentsWithoutEssay: 25, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Sheraton", building: "Management & Technology", floor: "Ground", room: "11", studentsEst1: 25, studentsWithoutEssay: 25, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Sheraton", building: "Management & Technology", floor: "Ground", room: "12", studentsEst1: 25, studentsWithoutEssay: 25, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Sheraton", building: "Management & Technology", floor: "Ground", room: "13", studentsEst1: 25, studentsWithoutEssay: 25, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Sheraton", building: "Management & Technology", floor: "Ground", room: "14", studentsEst1: 25, studentsWithoutEssay: 25, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Sheraton", building: "Management & Technology", floor: "1st Floor", room: "101", studentsEst1: 25, studentsWithoutEssay: 25, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Sheraton", building: "Management & Technology", floor: "1st Floor", room: "103", studentsEst1: 25, studentsWithoutEssay: 25, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Sheraton", building: "Management & Technology", floor: "1st Floor", room: "104", studentsEst1: 25, studentsWithoutEssay: 25, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Sheraton", building: "Management & Technology", floor: "1st Floor", room: "106", studentsEst1: 25, studentsWithoutEssay: 25, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Sheraton", building: "Management & Technology", floor: "3rd Floor", room: "302", studentsEst1: 25, studentsWithoutEssay: 25, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Sheraton", building: "Management & Technology", floor: "4th Floor", room: "401", studentsEst1: 25, studentsWithoutEssay: 25, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Sheraton", building: "Management & Technology", floor: "4th Floor", room: "402", studentsEst1: 25, studentsWithoutEssay: 25, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Sheraton", building: "Management & Technology", floor: "4th Floor", room: "403", studentsEst1: 25, studentsWithoutEssay: 25, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Sheraton", building: "Management & Technology", floor: "4th Floor", room: "404", studentsEst1: 25, studentsWithoutEssay: 25, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Sheraton", building: "Management & Technology", floor: "5th Floor", room: "501", studentsEst1: 25, studentsWithoutEssay: 25, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Sheraton", building: "Management & Technology", floor: "5th Floor", room: "502", studentsEst1: 25, studentsWithoutEssay: 25, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Sheraton", building: "Management & Technology", floor: "5th Floor", room: "503", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Sheraton", building: "Management & Technology", floor: "5th Floor", room: "504", studentsEst1: 25, studentsWithoutEssay: 25, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Sheraton", building: "Management & Technology", floor: "5th Floor", room: "506", studentsEst1: 25, studentsWithoutEssay: 25, studentsWithEssay: 0 },

  { governorate: "Cairo", testCenter: "Future University", building: "Business", floor: "Basement", room: "C1.3", studentsEst1: 20, studentsWithoutEssay: 20, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Future University", building: "Business", floor: "Basement", room: "C1.7 lecture hall", studentsEst1: 40, studentsWithoutEssay: 40, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Future University", building: "Business", floor: "Basement", room: "C1.8 lecture hall", studentsEst1: 40, studentsWithoutEssay: 40, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Future University", building: "Business", floor: "Basement", room: "C1.9 lecture hall", studentsEst1: 40, studentsWithoutEssay: 40, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Future University", building: "Business", floor: "1st Floor", room: "C3.2 lecture hall", studentsEst1: 25, studentsWithoutEssay: 25, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Future University", building: "Business", floor: "1st Floor", room: "C3.3 lecture hall", studentsEst1: 20, studentsWithoutEssay: 20, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Future University", building: "Business", floor: "1st Floor", room: "C3.4 lecture hall", studentsEst1: 45, studentsWithoutEssay: 45, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Future University", building: "Business", floor: "2nd Floor", room: "C4.1", studentsEst1: 20, studentsWithoutEssay: 20, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Future University", building: "Business", floor: "2nd Floor", room: "C4.2", studentsEst1: 20, studentsWithoutEssay: 20, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Future University", building: "Business", floor: "2nd Floor", room: "C4.3", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Future University", building: "Business", floor: "2nd Floor", room: "C4.4 lecture hall", studentsEst1: 45, studentsWithoutEssay: 45, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Future University", building: "Business", floor: "3rd Floor", room: "C5.3", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Future University", building: "Business", floor: "3rd Floor", room: "C5.4 lecture hall", studentsEst1: 45, studentsWithoutEssay: 45, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Future University", building: "Business", floor: "3rd Floor", room: "C5.6", studentsEst1: 20, studentsWithoutEssay: 20, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Future University", building: "Business", floor: "3rd Floor", room: "C5.7", studentsEst1: 20, studentsWithoutEssay: 20, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Future University", building: "Business", floor: "3rd Floor", room: "C5.8", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Future University", building: "Business", floor: "3rd Floor", room: "C5.9", studentsEst1: 20, studentsWithoutEssay: 20, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Future University", building: "Business", floor: "3rd Floor", room: "C5.10", studentsEst1: 21, studentsWithoutEssay: 21, studentsWithEssay: 0 },

  { governorate: "Cairo", testCenter: "Future University", building: "Political Sc", floor: "Basement", room: "F1.2 lecture hall", studentsEst1: 30, studentsWithoutEssay: 30, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Future University", building: "Political Sc", floor: "Ground", room: "F2.2 lecture hall", studentsEst1: 30, studentsWithoutEssay: 30, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Future University", building: "Political Sc", floor: "1st Floor", room: "F3.1", studentsEst1: 20, studentsWithoutEssay: 20, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Future University", building: "Political Sc", floor: "1st Floor", room: "F3.2 lecture hall", studentsEst1: 40, studentsWithoutEssay: 40, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Future University", building: "Political Sc", floor: "1st Floor", room: "F3.5", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Future University", building: "Political Sc", floor: "1st Floor", room: "F3.6", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Future University", building: "Political Sc", floor: "2nd Floor", room: "F4.2 lecture hall", studentsEst1: 44, studentsWithoutEssay: 38, studentsWithEssay: 6 },
  { governorate: "Cairo", testCenter: "Future University", building: "Political Sc", floor: "2nd Floor", room: "F4.3", studentsEst1: 20, studentsWithoutEssay: 20, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Future University", building: "Political Sc", floor: "2nd Floor", room: "F4.4", studentsEst1: 30, studentsWithoutEssay: 30, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Future University", building: "Political Sc", floor: "2nd Floor", room: "F4.5", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Future University", building: "Political Sc", floor: "2nd Floor", room: "F4.6", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },

  { governorate: "Cairo", testCenter: "Rawasy Misr International School", building: "Rawasy Misr International School", floor: "2nd Floor", room: "2nd floor Adventurers", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Rawasy Misr International School", building: "Rawasy Misr International School", floor: "2nd Floor", room: "2nd floor Leaders", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Rawasy Misr International School", building: "Rawasy Misr International School", floor: "2nd Floor", room: "2nd floor Grade 6A", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Rawasy Misr International School", building: "Rawasy Misr International School", floor: "2nd Floor", room: "2nd floor Grade 7A", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Rawasy Misr International School", building: "Rawasy Misr International School", floor: "2nd Floor", room: "2nd floor Grade 8A", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Rawasy Misr International School", building: "Rawasy Misr International School", floor: "2nd Floor", room: "2nd floor Grade 9A", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Rawasy Misr International School", building: "Rawasy Misr International School", floor: "2nd Floor", room: "2nd floor Grade 10A", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },

  { governorate: "Cairo", testCenter: "Al-Andalus International School", building: "Al-Andalus International School", floor: "1st Floor", room: "1st floor 12B", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Al-Andalus International School", building: "Al-Andalus International School", floor: "1st Floor", room: "1st floor 12C", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Al-Andalus International School", building: "Al-Andalus International School", floor: "1st Floor", room: "1st floor 11B", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Al-Andalus International School", building: "Al-Andalus International School", floor: "1st Floor", room: "1st floor 11C", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Al-Andalus International School", building: "Al-Andalus International School", floor: "1st Floor", room: "1st floor 10B", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Al-Andalus International School", building: "Al-Andalus International School", floor: "1st Floor", room: "1st floor 10C", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "Al-Andalus International School", building: "Al-Andalus International School", floor: "1st Floor", room: "1st floor 9C", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },

  { governorate: "Cairo", testCenter: "St.Fatima Badr International School", building: "St.Fatima Badr International School", floor: "1st Floor", room: "4102", studentsEst1: 13, studentsWithoutEssay: 13, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "St.Fatima Badr International School", building: "St.Fatima Badr International School", floor: "1st Floor", room: "4103", studentsEst1: 13, studentsWithoutEssay: 13, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "St.Fatima Badr International School", building: "St.Fatima Badr International School", floor: "1st Floor", room: "4106", studentsEst1: 13, studentsWithoutEssay: 13, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "St.Fatima Badr International School", building: "St.Fatima Badr International School", floor: "1st Floor", room: "4107", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },

  { governorate: "Cairo", testCenter: "New Generation International Schools", building: "New Generation International Schools", floor: "3rd Floor", room: "3rd floor Room No.319", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "New Generation International Schools", building: "New Generation International Schools", floor: "3rd Floor", room: "3rd floor Room No.320", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "New Generation International Schools", building: "New Generation International Schools", floor: "3rd Floor", room: "3rd floor Room No.321", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "New Generation International Schools", building: "New Generation International Schools", floor: "3rd Floor", room: "3rd floor Room No.324", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "New Generation International Schools", building: "New Generation International Schools", floor: "3rd Floor", room: "3rd floor Room No.325", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "New Generation International Schools", building: "New Generation International Schools", floor: "3rd Floor", room: "3rd floor Room No.326", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "New Generation International Schools", building: "New Generation International Schools", floor: "3rd Floor", room: "3rd floor Room No.328", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },

  { governorate: "Damietta", testCenter: "Horus University", building: "Engineering", floor: "2nd Floor", room: "E205", studentsEst1: 25, studentsWithoutEssay: 23, studentsWithEssay: 2 },
  { governorate: "Damietta", testCenter: "Horus University", building: "Engineering", floor: "2nd Floor", room: "E211", studentsEst1: 21, studentsWithoutEssay: 21, studentsWithEssay: 0 },
  { governorate: "Damietta", testCenter: "Horus University", building: "Engineering", floor: "2nd Floor", room: "E212", studentsEst1: 21, studentsWithoutEssay: 21, studentsWithEssay: 0 },
  { governorate: "Damietta", testCenter: "Horus University", building: "Engineering", floor: "2nd Floor", room: "E214", studentsEst1: 20, studentsWithoutEssay: 20, studentsWithEssay: 0 },
  { governorate: "Damietta", testCenter: "Horus University", building: "Engineering", floor: "3rd Floor", room: "E310", studentsEst1: 25, studentsWithoutEssay: 25, studentsWithEssay: 0 },
  { governorate: "Damietta", testCenter: "Horus University", building: "Engineering", floor: "3rd Floor", room: "E316", studentsEst1: 20, studentsWithoutEssay: 20, studentsWithEssay: 0 },
  { governorate: "Damietta", testCenter: "Horus University", building: "Engineering", floor: "3rd Floor", room: "E317", studentsEst1: 20, studentsWithoutEssay: 20, studentsWithEssay: 0 },
  { governorate: "Damietta", testCenter: "Horus University", building: "Engineering", floor: "3rd Floor", room: "E319", studentsEst1: 20, studentsWithoutEssay: 20, studentsWithEssay: 0 },
  { governorate: "Damietta", testCenter: "Horus University", building: "Engineering", floor: "3rd Floor", room: "E320", studentsEst1: 20, studentsWithoutEssay: 20, studentsWithEssay: 0 },
  { governorate: "Damietta", testCenter: "Horus University", building: "Engineering", floor: "4th Floor", room: "E414", studentsEst1: 25, studentsWithoutEssay: 25, studentsWithEssay: 0 },
  { governorate: "Damietta", testCenter: "Horus University", building: "Engineering", floor: "4th Floor", room: "E418", studentsEst1: 20, studentsWithoutEssay: 20, studentsWithEssay: 0 },
  { governorate: "Damietta", testCenter: "Horus University", building: "Engineering", floor: "4th Floor", room: "E419", studentsEst1: 20, studentsWithoutEssay: 20, studentsWithEssay: 0 },
  { governorate: "Damietta", testCenter: "Horus University", building: "Engineering", floor: "4th Floor", room: "E420", studentsEst1: 20, studentsWithoutEssay: 20, studentsWithEssay: 0 },
  { governorate: "Damietta", testCenter: "Horus University", building: "Engineering", floor: "4th Floor", room: "E421", studentsEst1: 20, studentsWithoutEssay: 20, studentsWithEssay: 0 },
  { governorate: "Damietta", testCenter: "Horus University", building: "Engineering", floor: "4th Floor", room: "E422", studentsEst1: 20, studentsWithoutEssay: 20, studentsWithEssay: 0 },
  { governorate: "Damietta", testCenter: "Horus University", building: "Engineering", floor: "4th Floor", room: "E426", studentsEst1: 25, studentsWithoutEssay: 25, studentsWithEssay: 0 },

  { governorate: "Giza", testCenter: "Smart Village", building: "Building A", floor: "1st Floor", room: "A106", studentsEst1: 25, studentsWithoutEssay: 25, studentsWithEssay: 0 },
  { governorate: "Giza", testCenter: "Smart Village", building: "Building A", floor: "1st Floor", room: "A108", studentsEst1: 25, studentsWithoutEssay: 25, studentsWithEssay: 0 },
  { governorate: "Giza", testCenter: "Smart Village", building: "Building A", floor: "1st Floor", room: "A110", studentsEst1: 40, studentsWithoutEssay: 40, studentsWithEssay: 0 },
  { governorate: "Giza", testCenter: "Smart Village", building: "Building A", floor: "1st Floor", room: "A119", studentsEst1: 40, studentsWithoutEssay: 40, studentsWithEssay: 0 },
  { governorate: "Giza", testCenter: "Smart Village", building: "Building A", floor: "1st Floor", room: "A121", studentsEst1: 40, studentsWithoutEssay: 40, studentsWithEssay: 0 },
  { governorate: "Giza", testCenter: "Smart Village", building: "Building A", floor: "1st Floor", room: "A123", studentsEst1: 40, studentsWithoutEssay: 40, studentsWithEssay: 0 },
  { governorate: "Giza", testCenter: "Smart Village", building: "Building A", floor: "3rd Floor", room: "A302", studentsEst1: 25, studentsWithoutEssay: 25, studentsWithEssay: 0 },
  { governorate: "Giza", testCenter: "Smart Village", building: "Building A", floor: "3rd Floor", room: "A303", studentsEst1: 40, studentsWithoutEssay: 40, studentsWithEssay: 0 },
  { governorate: "Giza", testCenter: "Smart Village", building: "Building A", floor: "3rd Floor", room: "A304", studentsEst1: 25, studentsWithoutEssay: 25, studentsWithEssay: 0 },
  { governorate: "Giza", testCenter: "Smart Village", building: "Building A", floor: "3rd Floor", room: "A305", studentsEst1: 40, studentsWithoutEssay: 40, studentsWithEssay: 0 },
  { governorate: "Giza", testCenter: "Smart Village", building: "Building A", floor: "3rd Floor", room: "A306", studentsEst1: 40, studentsWithoutEssay: 40, studentsWithEssay: 0 },
  { governorate: "Giza", testCenter: "Smart Village", building: "Building A", floor: "3rd Floor", room: "A307", studentsEst1: 40, studentsWithoutEssay: 40, studentsWithEssay: 0 },
  { governorate: "Giza", testCenter: "Smart Village", building: "Building A", floor: "3rd Floor", room: "A308", studentsEst1: 40, studentsWithoutEssay: 40, studentsWithEssay: 0 },
  { governorate: "Giza", testCenter: "Smart Village", building: "Building A", floor: "3rd Floor", room: "A309", studentsEst1: 25, studentsWithoutEssay: 25, studentsWithEssay: 0 },
  { governorate: "Giza", testCenter: "Smart Village", building: "Building A", floor: "3rd Floor", room: "A313", studentsEst1: 25, studentsWithoutEssay: 25, studentsWithEssay: 0 },
  { governorate: "Giza", testCenter: "Smart Village", building: "Building A", floor: "3rd Floor", room: "A314", studentsEst1: 26, studentsWithoutEssay: 26, studentsWithEssay: 0 },
  { governorate: "Giza", testCenter: "Smart Village", building: "Building A", floor: "3rd Floor", room: "A315", studentsEst1: 26, studentsWithoutEssay: 26, studentsWithEssay: 0 },
  { governorate: "Giza", testCenter: "Smart Village", building: "Building A", floor: "3rd Floor", room: "A316", studentsEst1: 26, studentsWithoutEssay: 26, studentsWithEssay: 0 },
  { governorate: "Giza", testCenter: "Smart Village", building: "Building A", floor: "4th Floor", room: "A402", studentsEst1: 24, studentsWithoutEssay: 24, studentsWithEssay: 0 },
  { governorate: "Giza", testCenter: "Smart Village", building: "Building A", floor: "4th Floor", room: "A404", studentsEst1: 25, studentsWithoutEssay: 25, studentsWithEssay: 0 },
  { governorate: "Giza", testCenter: "Smart Village", building: "Building A", floor: "4th Floor", room: "A405", studentsEst1: 25, studentsWithoutEssay: 25, studentsWithEssay: 0 },
  { governorate: "Giza", testCenter: "Smart Village", building: "Building A", floor: "4th Floor", room: "A406", studentsEst1: 40, studentsWithoutEssay: 40, studentsWithEssay: 0 },
  { governorate: "Giza", testCenter: "Smart Village", building: "Building A", floor: "4th Floor", room: "A407", studentsEst1: 25, studentsWithoutEssay: 25, studentsWithEssay: 0 },
  { governorate: "Giza", testCenter: "Smart Village", building: "Building A", floor: "4th Floor", room: "A409", studentsEst1: 25, studentsWithoutEssay: 25, studentsWithEssay: 0 },
  { governorate: "Giza", testCenter: "Smart Village", building: "Building A", floor: "4th Floor", room: "A411", studentsEst1: 24, studentsWithoutEssay: 24, studentsWithEssay: 0 },
  { governorate: "Giza", testCenter: "Smart Village", building: "Building A", floor: "4th Floor", room: "A413", studentsEst1: 25, studentsWithoutEssay: 25, studentsWithEssay: 0 },
  { governorate: "Giza", testCenter: "Smart Village", building: "Building A", floor: "4th Floor", room: "A417", studentsEst1: 25, studentsWithoutEssay: 25, studentsWithEssay: 0 },
  { governorate: "Giza", testCenter: "Smart Village", building: "Building A", floor: "4th Floor", room: "A418", studentsEst1: 25, studentsWithoutEssay: 25, studentsWithEssay: 0 },
  { governorate: "Giza", testCenter: "Smart Village", building: "Building A", floor: "4th Floor", room: "A419", studentsEst1: 25, studentsWithoutEssay: 25, studentsWithEssay: 0 },
  { governorate: "Giza", testCenter: "Smart Village", building: "Building A", floor: "4th Floor", room: "A420", studentsEst1: 25, studentsWithoutEssay: 25, studentsWithEssay: 0 },
  { governorate: "Giza", testCenter: "Smart Village", building: "Building A", floor: "4th Floor", room: "A421", studentsEst1: 25, studentsWithoutEssay: 25, studentsWithEssay: 0 },

  { governorate: "Giza", testCenter: "Kaizen Language School", building: "Kaizen Language School", floor: "5th Floor", room: "5th floor Room No.1", studentsEst1: 15, studentsWithoutEssay: 10, studentsWithEssay: 5 },
  { governorate: "Giza", testCenter: "Kaizen Language School", building: "Kaizen Language School", floor: "5th Floor", room: "5th floor Room No.2", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },
  { governorate: "Giza", testCenter: "Kaizen Language School", building: "Kaizen Language School", floor: "5th Floor", room: "5th floor Room No.3", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },
  { governorate: "Giza", testCenter: "Kaizen Language School", building: "Kaizen Language School", floor: "5th Floor", room: "5th floor Room No.4", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },
  { governorate: "Giza", testCenter: "Kaizen Language School", building: "Kaizen Language School", floor: "5th Floor", room: "5th floor Room No.5", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },
  { governorate: "Giza", testCenter: "Kaizen Language School", building: "Kaizen Language School", floor: "5th Floor", room: "5th floor Room No.6", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },
  { governorate: "Giza", testCenter: "Kaizen Language School", building: "Kaizen Language School", floor: "5th Floor", room: "5th floor Room No.7", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },

  { governorate: "Giza", testCenter: "Map International Schools", building: "Map International Schools", floor: "2nd Floor", room: "2nd floor Gr 12 1A", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },
  { governorate: "Giza", testCenter: "Map International Schools", building: "Map International Schools", floor: "2nd Floor", room: "2nd floor Gr 11 A", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },
  { governorate: "Giza", testCenter: "Map International Schools", building: "Map International Schools", floor: "2nd Floor", room: "2nd floor Gr 10 A", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },
  { governorate: "Giza", testCenter: "Map International Schools", building: "Map International Schools", floor: "2nd Floor", room: "2nd floor Gr 8 A", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },
  { governorate: "Giza", testCenter: "Map International Schools", building: "Map International Schools", floor: "2nd Floor", room: "2nd floor Gr 9 A", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },
  { governorate: "Giza", testCenter: "Map International Schools", building: "Map International Schools", floor: "2nd Floor", room: "2nd floor Gr 7 A", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },
  { governorate: "Giza", testCenter: "Map International Schools", building: "Map International Schools", floor: "2nd Floor", room: "2nd floor 2nd lang Room", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },

  { governorate: "Cairo", testCenter: "St.Fatima Badr International School", building: "St.Fatima Badr International School", floor: "1st Floor", room: "4102", studentsEst1: 13, studentsWithoutEssay: 13, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "St.Fatima Badr International School", building: "St.Fatima Badr International School", floor: "1st Floor", room: "4103", studentsEst1: 13, studentsWithoutEssay: 13, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "St.Fatima Badr International School", building: "St.Fatima Badr International School", floor: "1st Floor", room: "4106", studentsEst1: 13, studentsWithoutEssay: 13, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "St.Fatima Badr International School", building: "St.Fatima Badr International School", floor: "1st Floor", room: "4107", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },

  { governorate: "Cairo", testCenter: "New Generation International Schools", building: "New Generation International Schools", floor: "3rd Floor", room: "3rd floor Room No.319", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "New Generation International Schools", building: "New Generation International Schools", floor: "3rd Floor", room: "3rd floor Room No.320", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "New Generation International Schools", building: "New Generation International Schools", floor: "3rd Floor", room: "3rd floor Room No.321", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "New Generation International Schools", building: "New Generation International Schools", floor: "3rd Floor", room: "3rd floor Room No.324", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "New Generation International Schools", building: "New Generation International Schools", floor: "3rd Floor", room: "3rd floor Room No.325", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "New Generation International Schools", building: "New Generation International Schools", floor: "3rd Floor", room: "3rd floor Room No.326", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },
  { governorate: "Cairo", testCenter: "New Generation International Schools", building: "New Generation International Schools", floor: "3rd Floor", room: "3rd floor Room No.328", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },

  { governorate: "Giza", testCenter: "New Vision International School", building: "New Vision International School", floor: "2nd Floor", room: "2nd floor American B. Room No.1", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },
  { governorate: "Giza", testCenter: "New Vision International School", building: "New Vision International School", floor: "2nd Floor", room: "2nd floor American B. Room No.2", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },
  { governorate: "Giza", testCenter: "New Vision International School", building: "New Vision International School", floor: "2nd Floor", room: "2nd floor American B. Room No.3", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },
  { governorate: "Giza", testCenter: "New Vision International School", building: "New Vision International School", floor: "2nd Floor", room: "2nd floor American B. Room No.4", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },
  { governorate: "Giza", testCenter: "New Vision International School", building: "New Vision International School", floor: "2nd Floor", room: "2nd floor American B. Room No.5", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },
  { governorate: "Giza", testCenter: "New Vision International School", building: "New Vision International School", floor: "2nd Floor", room: "2nd floor American B.Room No.6", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },
  { governorate: "Giza", testCenter: "New Vision International School", building: "New Vision International School", floor: "2nd Floor", room: "2nd floor American B.Room No.7", studentsEst1: 15, studentsWithoutEssay: 15, studentsWithEssay: 0 },

  { governorate: "Minya", testCenter: "Deraya University", building: "Dentistry", floor: "Ground", room: "Hall 1", studentsEst1: 45, studentsWithoutEssay: 45, studentsWithEssay: 0 },
  { governorate: "Minya", testCenter: "Deraya University", building: "Dentistry", floor: "Ground", room: "Hall 2", studentsEst1: 45, studentsWithoutEssay: 45, studentsWithEssay: 0 },
  { governorate: "Minya", testCenter: "Deraya University", building: "Dentistry", floor: "Ground", room: "Hall 3", studentsEst1: 45, studentsWithoutEssay: 45, studentsWithEssay: 0 },
  { governorate: "Minya", testCenter: "Deraya University", building: "Dentistry", floor: "1st Floor", room: "Hall 4", studentsEst1: 45, studentsWithoutEssay: 45, studentsWithEssay: 0 },
  { governorate: "Minya", testCenter: "Deraya University", building: "Dentistry", floor: "1st Floor", room: "Hall 5", studentsEst1: 45, studentsWithoutEssay: 45, studentsWithEssay: 0 },
  { governorate: "Minya", testCenter: "Deraya University", building: "Dentistry", floor: "1st Floor", room: "Hall 6", studentsEst1: 45, studentsWithoutEssay: 45, studentsWithEssay: 0 },
  { governorate: "Minya", testCenter: "Deraya University", building: "Dentistry", floor: "1st Floor", room: "Class 1", studentsEst1: 35, studentsWithoutEssay: 35, studentsWithEssay: 0 },
  { governorate: "Minya", testCenter: "Deraya University", building: "Dentistry", floor: "1st Floor", room: "Class 2", studentsEst1: 35, studentsWithoutEssay: 35, studentsWithEssay: 0 },
  { governorate: "Minya", testCenter: "Deraya University", building: "Dentistry", floor: "1st Floor", room: "Class 3", studentsEst1: 35, studentsWithoutEssay: 35, studentsWithEssay: 0 },
  { governorate: "Minya", testCenter: "Deraya University", building: "Dentistry", floor: "2nd Floor", room: "Hall 7", studentsEst1: 40, studentsWithoutEssay: 40, studentsWithEssay: 0 },
  { governorate: "Minya", testCenter: "Deraya University", building: "Dentistry", floor: "2nd Floor", room: "Hall 8", studentsEst1: 40, studentsWithoutEssay: 40, studentsWithEssay: 0 },
  { governorate: "Minya", testCenter: "Deraya University", building: "Dentistry", floor: "2nd Floor", room: "Class 4", studentsEst1: 32, studentsWithoutEssay: 32, studentsWithEssay: 0 },
  { governorate: "Minya", testCenter: "Deraya University", building: "Dentistry", floor: "2nd Floor", room: "Class 5", studentsEst1: 30, studentsWithoutEssay: 30, studentsWithEssay: 0 },
  { governorate: "Minya", testCenter: "Deraya University", building: "Dentistry", floor: "2nd Floor", room: "Class 6", studentsEst1: 30, studentsWithoutEssay: 30, studentsWithEssay: 0 },

  { governorate: "Menofia", testCenter: "Al Ryada University", building: "Science And Technology", floor: "1st Floor", room: "P 024", studentsEst1: 16, studentsWithoutEssay: 16, studentsWithEssay: 0 },
  { governorate: "Menofia", testCenter: "Al Ryada University", building: "Science And Technology", floor: "1st Floor", room: "P 117", studentsEst1: 16, studentsWithoutEssay: 16, studentsWithEssay: 0 },
  { governorate: "Menofia", testCenter: "Al Ryada University", building: "Science And Technology", floor: "1st Floor", room: "D 028", studentsEst1: 16, studentsWithoutEssay: 16, studentsWithEssay: 0 },
  { governorate: "Menofia", testCenter: "Al Ryada University", building: "Science And Technology", floor: "1st Floor", room: "D 120", studentsEst1: 20, studentsWithoutEssay: 20, studentsWithEssay: 0 },
];

/**
 * Creates or gets an existing folder by name under a parent folder.
 */
async function getOrCreateSubFolder(
  drive: drive_v3.Drive,
  parentId: string,
  name: string,
  cache: Map<string, string>,
): Promise<string> {
  const cacheKey = `${parentId}:::${name.trim()}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  const escapedName = name.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const escapedParent = parentId.replace(/\\/g, "\\\\").replace(/'/g, "\\'");

  const listRes = await drive.files.list({
    q: `name = '${escapedName}' and '${escapedParent}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id,name)",
    pageSize: 1,
    supportsAllDrives: true,
  });

  let folderId = listRes.data.files?.[0]?.id;
  if (!folderId) {
    const created = await createFolder(drive, name.trim(), parentId);
    folderId = created.id!;
  }

  cache.set(cacheKey, folderId);
  return folderId;
}

/**
 * Seeds the complete EST hierarchy in Google Drive according to the reference data:
 * EST 1 -> Governorate -> Test Center -> Building -> Floor -> Room
 */
export async function seedEstFolderStructure(
  drive: drive_v3.Drive,
  rootParentId: string,
  examName = "EST 1",
  onProgress?: (msg: string) => void,
): Promise<{ totalCreated: number; estRootId: string }> {
  const cache = new Map<string, string>();

  onProgress?.(`Creating or finding root folder "${examName}"...`);
  const estRootId = await getOrCreateSubFolder(drive, rootParentId, examName, cache);

  let count = 1;
  const processed = new Set<string>();

  for (const row of EST_REFERENCE_DATA) {
    const govId = await getOrCreateSubFolder(drive, estRootId, row.governorate, cache);
    const centerId = await getOrCreateSubFolder(drive, govId, row.testCenter, cache);
    const buildingId = await getOrCreateSubFolder(drive, centerId, row.building, cache);
    const floorId = await getOrCreateSubFolder(drive, buildingId, row.floor, cache);
    
    const roomKey = `${floorId}:::${row.room}`;
    if (!processed.has(roomKey)) {
      await getOrCreateSubFolder(drive, floorId, row.room, cache);
      processed.add(roomKey);
      count++;
      if (count % 10 === 0) {
        onProgress?.(`Created ${count} folders...`);
      }
    }
  }

  return { totalCreated: cache.size, estRootId };
}

