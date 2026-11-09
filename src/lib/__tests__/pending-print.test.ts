import { describe, it, expect } from "vitest";
import {
  classifyFolderLevel,
  buildPendingPrintHierarchy,
} from "../pending-print";
import type { DriveItem } from "../types";

describe("pending-print hierarchy & classification", () => {
  it("classifyFolderLevel classifies EST folder levels accurately", () => {
    // Exam Root
    expect(classifyFolderLevel("EST 1")).toBe("root");
    expect(classifyFolderLevel("EST 2")).toBe("root");
    expect(classifyFolderLevel("December 2026")).toBe("root");
    expect(classifyFolderLevel("EST 1", 0)).toBe("root");

    // Governorate
    expect(classifyFolderLevel("Alexandria")).toBe("governorate");
    expect(classifyFolderLevel("Cairo")).toBe("governorate");
    expect(classifyFolderLevel("Giza")).toBe("governorate");
    expect(classifyFolderLevel("Some City", 1)).toBe("governorate");

    // Test Center
    expect(classifyFolderLevel("Abu Qir")).toBe("center");
    expect(classifyFolderLevel("Abu Qir Center")).toBe("center");
    expect(classifyFolderLevel("Alexandria Center")).toBe("center");
    expect(classifyFolderLevel("Any Center", 2)).toBe("center");

    // Building
    expect(classifyFolderLevel("Pharmacy")).toBe("building");
    expect(classifyFolderLevel("Building 1")).toBe("building");
    expect(classifyFolderLevel("مبنى صيدلة")).toBe("building");
    expect(classifyFolderLevel("Any Building", 3)).toBe("building");

    // Floor
    expect(classifyFolderLevel("2nd Floor")).toBe("floor");
    expect(classifyFolderLevel("Floor 1")).toBe("floor");
    expect(classifyFolderLevel("الدور الثاني")).toBe("floor");
    expect(classifyFolderLevel("Any Floor", 4)).toBe("floor");

    // Room
    expect(classifyFolderLevel("204")).toBe("room");
    expect(classifyFolderLevel("Room 101")).toBe("room");
    expect(classifyFolderLevel("قاعة 5")).toBe("room");
    expect(classifyFolderLevel("لجنة 12")).toBe("room");
    expect(classifyFolderLevel("Any Room", 5)).toBe("room");
  });

  it("buildPendingPrintHierarchy creates pruned tree and full breadcrumb path", () => {
    const folders: DriveItem[] = [
      {
        id: "f-root",
        name: "EST 1",
        mimeType: "application/vnd.google-apps.folder",
        size: 0,
        extension: null,
        modifiedTime: null,
        createdTime: null,
        webViewLink: null,
        thumbnailLink: null,
        iconLink: null,
        isFolder: true,
        category: "folder",
        parentId: null,
      },
      {
        id: "f-alex",
        name: "Alexandria",
        mimeType: "application/vnd.google-apps.folder",
        size: 0,
        extension: null,
        modifiedTime: null,
        createdTime: null,
        webViewLink: null,
        thumbnailLink: null,
        iconLink: null,
        isFolder: true,
        category: "folder",
        parentId: "f-root",
      },
      {
        id: "f-abuqir",
        name: "Abu Qir",
        mimeType: "application/vnd.google-apps.folder",
        size: 0,
        extension: null,
        modifiedTime: null,
        createdTime: null,
        webViewLink: null,
        thumbnailLink: null,
        iconLink: null,
        isFolder: true,
        category: "folder",
        parentId: "f-alex",
      },
      {
        id: "f-pharmacy",
        name: "Pharmacy",
        mimeType: "application/vnd.google-apps.folder",
        size: 0,
        extension: null,
        modifiedTime: null,
        createdTime: null,
        webViewLink: null,
        thumbnailLink: null,
        iconLink: null,
        isFolder: true,
        category: "folder",
        parentId: "f-abuqir",
      },
      {
        id: "f-floor2",
        name: "2nd Floor",
        mimeType: "application/vnd.google-apps.folder",
        size: 0,
        extension: null,
        modifiedTime: null,
        createdTime: null,
        webViewLink: null,
        thumbnailLink: null,
        iconLink: null,
        isFolder: true,
        category: "folder",
        parentId: "f-pharmacy",
      },
      {
        id: "f-room204",
        name: "204",
        mimeType: "application/vnd.google-apps.folder",
        size: 0,
        extension: null,
        modifiedTime: null,
        createdTime: null,
        webViewLink: null,
        thumbnailLink: null,
        iconLink: null,
        isFolder: true,
        category: "folder",
        parentId: "f-floor2",
      },
      // An empty room that has no unprinted files
      {
        id: "f-room205",
        name: "205",
        mimeType: "application/vnd.google-apps.folder",
        size: 0,
        extension: null,
        modifiedTime: null,
        createdTime: null,
        webViewLink: null,
        thumbnailLink: null,
        iconLink: null,
        isFolder: true,
        category: "folder",
        parentId: "f-floor2",
      },
      // Cairo with no unprinted files at all
      {
        id: "f-cairo",
        name: "Cairo",
        mimeType: "application/vnd.google-apps.folder",
        size: 0,
        extension: null,
        modifiedTime: null,
        createdTime: null,
        webViewLink: null,
        thumbnailLink: null,
        iconLink: null,
        isFolder: true,
        category: "folder",
        parentId: "f-root",
      },
    ];

    const files: DriveItem[] = [
      // Control register in Pharmacy
      {
        id: "file-control",
        name: "Control_Register_Pharmacy.pdf",
        mimeType: "application/pdf",
        size: 1024,
        extension: "pdf",
        modifiedTime: "2026-11-09T10:00:00Z",
        createdTime: null,
        webViewLink: null,
        thumbnailLink: null,
        iconLink: null,
        isFolder: false,
        category: "pdf",
        parentId: "f-pharmacy",
      },
      // Proctor register in 2nd Floor (ALREADY PRINTED!)
      {
        id: "file-proctor",
        name: "Proctor_Register_2nd_Floor.pdf",
        mimeType: "application/pdf",
        size: 2048,
        extension: "pdf",
        modifiedTime: "2026-11-09T10:00:00Z",
        createdTime: null,
        webViewLink: null,
        thumbnailLink: null,
        iconLink: null,
        isFolder: false,
        category: "pdf",
        parentId: "f-floor2",
      },
      // Student register in Room 204 (UNPRINTED)
      {
        id: "file-student",
        name: "Student_Register_204.pdf",
        mimeType: "application/pdf",
        size: 3072,
        extension: "pdf",
        modifiedTime: "2026-11-09T10:00:00Z",
        createdTime: null,
        webViewLink: null,
        thumbnailLink: null,
        iconLink: null,
        isFolder: false,
        category: "pdf",
        parentId: "f-room204",
      },
    ];

    // file-proctor is marked as printed
    const printedIds = new Set<string>(["file-proctor"]);

    const result = buildPendingPrintHierarchy({
      allFolders: folders,
      allFiles: files,
      printedIds,
      rootFolderId: "f-root",
    });

    expect(result.totalFiles).toBe(3);
    expect(result.printedCount).toBe(1);
    expect(result.unprintedCount).toBe(2); // file-control and file-student

    // Cairo should be PRUNED completely because it has 0 unprinted files
    const rootNode = result.tree[0];
    expect(rootNode).toBeDefined();
    expect(rootNode.name).toBe("EST 1");
    expect(rootNode.unprintedFilesCount).toBe(2);

    const alexNode = rootNode.subfolders[0];
    expect(alexNode.name).toBe("Alexandria");
    expect(alexNode.level).toBe("governorate");

    const abuqirNode = alexNode.subfolders[0];
    expect(abuqirNode.name).toBe("Abu Qir");
    expect(abuqirNode.level).toBe("center");

    const pharmacyNode = abuqirNode.subfolders[0];
    expect(pharmacyNode.name).toBe("Pharmacy");
    expect(pharmacyNode.level).toBe("building");
    expect(pharmacyNode.files.length).toBe(1);
    expect(pharmacyNode.files[0].id).toBe("file-control");

    const floor2Node = pharmacyNode.subfolders[0];
    expect(floor2Node.name).toBe("2nd Floor");
    expect(floor2Node.level).toBe("floor");
    // Proctor register is printed, so direct files under floor2 should be 0
    expect(floor2Node.files.length).toBe(0);

    // Room 204 is unprinted so it's included
    expect(floor2Node.subfolders.length).toBe(1);
    const room204Node = floor2Node.subfolders[0];
    expect(room204Node.name).toBe("204");
    expect(room204Node.level).toBe("room");
    expect(room204Node.files.length).toBe(1);
    expect(room204Node.files[0].id).toBe("file-student");

    // Room 205 has 0 unprinted files, so it's PRUNED
    expect(floor2Node.subfolders.some((s) => s.name === "205")).toBe(false);

    // Check full breadcrumb path of student register
    const studentItem = result.flatFiles.find((f) => f.id === "file-student")!;
    expect(studentItem.path).toContain("Alexandria > Abu Qir > Pharmacy > 2nd Floor > 204");
    expect(studentItem.governorate).toBe("Alexandria");
    expect(studentItem.center).toBe("Abu Qir");
    expect(studentItem.building).toBe("Pharmacy");
    expect(studentItem.floor).toBe("2nd Floor");
    expect(studentItem.room).toBe("204");
  });
});
