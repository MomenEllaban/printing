import type { SceneMeta, DocumentItem, SubjectItem, PackagingChecklistItem, ChecklistItem } from "./guide-types";

export const SCENES_META: SceneMeta[] = [
  // WORKFLOW 01: Center & Building Box Preparation (Scenes 1 - 9)
  {
    id: 1,
    slug: "hierarchy-overview",
    workflow: "workflow-1",
    workflowTitle: "Workflow 01 — Center & Building Box Preparation",
    title: "The Big Picture: Organizational Hierarchy",
    subtitle: "From Global EST Examination to Individual Candidate Desks",
    summary:
      "Every examination operation follows a strict top-down structure. Every document, sticker, and carton is addressed to a precise Governorate, Center, Building, Floor, and Room.",
    badge: "Operations Hierarchy",
  },
  {
    id: 2,
    slug: "box-identification",
    workflow: "workflow-1",
    workflowTitle: "Workflow 01 — Center & Building Box Preparation",
    title: "Box Identification & Master Placard",
    subtitle: "High-Visibility Outer Identification for Ground Logistics",
    summary:
      "Every physical cardboard box is designated for one specific building and examination session. The high-visibility external placard prevents dispatch mix-ups across test centers.",
    badge: "3D Interactive Box",
  },
  {
    id: 3,
    slug: "opening-the-box",
    workflow: "workflow-1",
    workflowTitle: "Workflow 01 — Center & Building Box Preparation",
    title: "Opening the Building Box: Three Master Enclosures",
    subtitle: "Internal Arrangement of Critical Examination Materials",
    summary:
      "When the box unseals on examination morning, it reveals three vital zones: Floor Bags for test administration, the Head/Control Bag for building management, and the conditional ASSN Bag.",
    badge: "Box Unboxing",
  },
  {
    id: 4,
    slug: "head-control-bag",
    workflow: "workflow-1",
    workflowTitle: "Workflow 01 — Center & Building Box Preparation",
    title: "The Head / Control Bag & Control Register",
    subtitle: "Master Custody for Chief Proctors and Control Staff",
    summary:
      "The Chief Proctor relies on the dedicated Control Bag. Inside lies the master Control Register—documenting overall building attendance, proctor rosters, seal numbers, and emergency logs.",
    badge: "Control Custody",
  },
  {
    id: 5,
    slug: "assn-bag",
    workflow: "workflow-1",
    workflowTitle: "Workflow 01 — Center & Building Box Preparation",
    title: "The ASSN Bag: Conditional Inclusion Logic",
    subtitle: "Accommodations & Special Needs Case Materials",
    summary:
      "An ASSN bag is packed strictly when a building has approved special-needs candidates (medical accommodations, scribes, or reader rooms). Buildings without special cases do not receive this bag.",
    badge: "Conditional Logistics",
  },
  {
    id: 6,
    slug: "floor-bag-breakdown",
    workflow: "workflow-1",
    workflowTitle: "Workflow 01 — Center & Building Box Preparation",
    title: "Floor Bag Breakdown: Senior vs Room Folders",
    subtitle: "Color-Coded Segregation Between Supervisory and Room Materials",
    summary:
      "Each floor has its own sealed bag. Opening it reveals a clear distinction: one Senior Folder (labeled with assigned room count) and multiple individual Room Folders with high-contrast colors.",
    badge: "Floor Architecture",
  },
  {
    id: 7,
    slug: "senior-folder-contents",
    workflow: "workflow-1",
    workflowTitle: "Workflow 01 — Center & Building Box Preparation",
    title: "Senior Folder: 5 Mandatory Floor Documents",
    subtitle: "Supervisory Toolkit for Managing Room Proctors",
    summary:
      "The Senior Proctor oversees all rooms on the floor using 5 dedicated documents: Proctor Register, Senior Incident Report, Mobile Custody Envelopes, Misconduct Forms, and Draft Papers/IDs.",
    badge: "Senior Dossier",
  },
  {
    id: 8,
    slug: "room-folders-contents",
    workflow: "workflow-1",
    workflowTitle: "Workflow 01 — Center & Building Box Preparation",
    title: "Room Folders: Individual Room Dossiers",
    subtitle: "Direct Administration in Examination Rooms (e.g., Room 101–104)",
    summary:
      "Each room proctor receives an independent dossier containing: Student Register with seat allocations, Room Proctor Report, Mobile Collection Bags, Student Misconduct Sheets, and Draft Papers.",
    badge: "Room Dossier",
  },
  {
    id: 9,
    slug: "workflow-01-summary",
    workflow: "workflow-1",
    workflowTitle: "Workflow 01 — Center & Building Box Preparation",
    title: "Workflow 01 Summary & Confirmation",
    subtitle: "Complete Hierarchical Tree of Building Box Preparation",
    summary:
      "A complete unified architectural diagram connecting Carton ➔ Bags ➔ Senior Folder ➔ Room Folders ➔ All Registers. Building Box Preparation is now 100% verified.",
    badge: "Workflow 1 Complete",
  },

  // WORKFLOW 02: Examination Materials, Stickers & External Bags (Scenes 10 - 17)
  {
    id: 10,
    slug: "materials-big-picture",
    workflow: "workflow-2",
    workflowTitle: "Workflow 02 — Materials, Stickers & External Bags",
    title: "Workflow 02: Examination Materials & Shipping Pipeline",
    subtitle: "Labeling, Multi-Subject Packing, Verification, and Cairo Dispatch",
    summary:
      "Managing live examination question booklets and answer sheets requires rigorous multi-step labeling, dual-sticker verification, and secure transit bag manifest tracking.",
    badge: "Materials Pipeline",
  },
  {
    id: 11,
    slug: "gray-file-two-copy-rule",
    workflow: "workflow-2",
    workflowTitle: "Workflow 02 — Materials, Stickers & External Bags",
    title: "The Gray Examination File & The Two-Copy Rule",
    subtitle: "Booklet Packets and Mandatory Dual-Sticker Protocol",
    summary:
      "Live exam booklets and bubble sheets travel inside secure gray files. Every single sticker is printed in TWO copies: Copy 1 is affixed to the file; Copy 2 is reserved for Control Review.",
    badge: "Two-Copy Protocol",
  },
  {
    id: 12,
    slug: "subject-based-stickers",
    workflow: "workflow-2",
    workflowTitle: "Workflow 02 — Materials, Stickers & External Bags",
    title: "Subject-Based Sticker Printing",
    subtitle: "Separated Print Streams for Mathematics, Biology, Physics, and Chemistry",
    summary:
      "Examination question stickers are strictly generated by subject and room group. Select different subjects to inspect subject codes, booklet allocations, and barcode configurations.",
    badge: "Subject Generation",
  },
  {
    id: 13,
    slug: "student-count-verification",
    workflow: "workflow-2",
    workflowTitle: "Workflow 02 — Materials, Stickers & External Bags",
    title: "Student Count Verification: Register vs Sticker",
    subtitle: "Cross-Auditing Candidate Registrations Against Booklet Counts",
    summary:
      "Before sealing exam materials, operators cross-audit the enrolled candidate count in the Student Register against the printed count on the gray file sticker to guarantee zero discrepancies.",
    badge: "Count Verification",
  },
  {
    id: 14,
    slug: "assn-room-stickers",
    workflow: "workflow-2",
    workflowTitle: "Workflow 02 — Materials, Stickers & External Bags",
    title: "ASSN / Special Room Stickers",
    subtitle: "Distinct Labeling for Accommodated Test Environments",
    summary:
      "Special-needs rooms feature distinct yellow/amber badges, modified timing indicators (e.g., +25% or +50% time), dedicated proctor counts, and customized bubble sheet specifications.",
    badge: "Accommodation Stickers",
  },
  {
    id: 15,
    slug: "floor-bag-stickers",
    workflow: "workflow-2",
    workflowTitle: "Workflow 02 — Materials, Stickers & External Bags",
    title: "Floor-Level Examination Bag Stickers",
    subtitle: "Distinguishing Large Bag Placards from Individual Gray File Labels",
    summary:
      "All gray files for a given floor and subject are consolidated into a large floor transit bag. These large exterior placards specify Floor, Subject, and Enclosed Packet Totals.",
    badge: "Floor Bag Placard",
  },
  {
    id: 16,
    slug: "external-shipping-bags",
    workflow: "workflow-2",
    workflowTitle: "Workflow 02 — Materials, Stickers & External Bags",
    title: "External Shipping Bags & Packing Checklist",
    subtitle: "Physical Verification with Interactive Multi-Subject Checklist",
    summary:
      "Heavy-duty exterior shipping bags transport the materials from centers to central command. The attached packing checklist requires operators to confirm each subject prior to lock sealing.",
    badge: "Interactive Checklist",
  },
  {
    id: 17,
    slug: "final-shipping-preparation",
    workflow: "workflow-2",
    workflowTitle: "Workflow 02 — Materials, Stickers & External Bags",
    title: "Final Shipping Preparation & Cairo Dispatch",
    subtitle: "Sealed, Audited, and Secured for Armed Convoy Logistics",
    summary:
      "All 7 preparatory stages conclude with sealed security seals, finalized manifest checklists, and orderly staging for secure convoy transit to the central Ministry Control Center in Cairo.",
    badge: "Ready for Dispatch",
  },

  // MASTER OVERVIEW (Scene 18)
  {
    id: 18,
    slug: "master-overview",
    workflow: "master-overview",
    workflowTitle: "Executive Summary",
    title: "EST Operations Master Architecture",
    subtitle: "Dual-Branch Bird's-Eye View of Complete Examination Preparation",
    summary:
      "An interactive architectural blueprint integrating Branch A (Center & Building Box Logistics) and Branch B (Examination Materials & Secure Shipping) into one seamless operational lifecycle.",
    badge: "Master Blueprint",
  },
];

export const SENIOR_FOLDER_DOCS: DocumentItem[] = [
  {
    id: "proctor-register",
    title: "Proctor Register",
    code: "SR-DOC-01",
    category: "senior",
    description:
      "Official floor attendance and proctor room assignment ledger. Records reporting times, assigned room numbers, substitute proctors, and chief supervisor approvals.",
    copiesNote: "1 original per Senior Folder (bound with carbon copy for Control Room)",
    fields: [
      "Floor Number & Wing Designation",
      "Proctor Full Legal Name & National ID",
      "Assigned Room (e.g. Room 101, Room 102)",
      "Morning Reporting Time (AM Check-in)",
      "Proctor Signature & Senior Verification",
    ],
    sampleData: {
      floor: "2nd Floor - Science Wing",
      assignedRooms: "Room 201, Room 202, Room 203, Room 204",
      proctorsCheckedIn: "4 Proctors (100% Present)",
      substitutesAssigned: "None (All Primary Present)",
    },
    securityNote: "Must remain in Senior Proctor possession until handed to Chief Proctor.",
  },
  {
    id: "senior-report",
    title: "Senior Incident & Floor Report",
    code: "SR-DOC-02",
    category: "senior",
    description:
      "Comprehensive chronological floor activity log documenting timing adherence, emergency bathroom escort logs, irregularities, and custody hand-off verification.",
    copiesNote: "1 master form per floor completed at examination conclusion",
    fields: [
      "Floor Seal Opening Time (Official 08:30 AM)",
      "Booklet Distribution Start & Completion Times",
      "Candidate Emergency Escort Incidents",
      "Proctor Replacement / Relief Tracking",
      "Final Carton Return Timestamp",
    ],
    sampleData: {
      distributionStatus: "Completed on schedule (08:45 AM)",
      incidentsReported: "0 Irregularities on 2nd Floor",
      seniorSignature: "Dr. Khaled Mostafa (Senior Proctor)",
    },
    securityNote: "Requires countersignature by Chief Proctor during control room check-in.",
  },
  {
    id: "senior-mobile-files",
    title: "Numbers & Mobile Collection Envelopes",
    code: "SR-DOC-03",
    category: "senior",
    description:
      "Heavyweight tamper-evident envelopes used to secure proctors' and room supervisors' personal mobile devices and electronics prior to entering examination halls.",
    copiesNote: "1 set per floor with numbered security labels",
    fields: [
      "Numbered Envelope Index (1 to 10)",
      "Depositor Name & Phone Model",
      "Serial Security Tape Number",
      "Intake Timestamp (Pre-Exam)",
      "Return Clearance Signature (Post-Exam)",
    ],
    sampleData: {
      envelopesSealed: "4 Envelopes Sealed (08:15 AM)",
      storageLocation: "Senior Proctor Floor Lockbox",
      retrievalStatus: "Locked until exam completion",
    },
    securityNote: "Unauthorized mobile device possession inside hall results in immediate disciplinary action.",
  },
  {
    id: "proctor-misconduct",
    title: "Proctor Misconduct & Irregularity Forms",
    code: "SR-DOC-04",
    category: "senior",
    description:
      "Standardized legal incident report templates to document proctor non-compliance, unauthorized hallway departures, late arrivals, or breach of exam confidentiality.",
    copiesNote: "3 blank duplicate sets included for emergency usage",
    fields: [
      "Date, Time, and Specific Floor Location",
      "Subjected Proctor Name & ID Number",
      "Detailed Narrative of Observed Incident",
      "Witness Testimonies (Senior & Hall Monitors)",
      "Chief Proctor Immediate Decision (Relief/Warning)",
    ],
    sampleData: {
      status: "Blank / Reserve Copies Enclosed",
      quotaEnclosed: "3 Triplicate Legal Templates",
      condition: "Sealed in protective plastic sleeve",
    },
    securityNote: "Immediate notification to Chief Proctor required within 15 minutes of occurrence.",
  },
  {
    id: "senior-draft-pens",
    title: "Draft Papers, Pens, and Spare Proctor Badges",
    code: "SR-DOC-05",
    category: "senior",
    description:
      "Auxiliary supply bundle containing watermarked spare draft papers, official examination-compliant black ballpoint pens, and replacement lanyards/badges.",
    copiesNote: "1 sealed reserve packet per floor",
    fields: [
      "Watermarked Scratch Paper Sheets (Count: 50)",
      "Black Ballpoint Examination Pens (Count: 10)",
      "Senior Floor Supervisor Lanyard & Badge",
      "Spare Room Monitor Badges (Count: 2)",
    ],
    sampleData: {
      scratchPaperBatch: "EST-WATERMARK-2026-B2",
      penType: "0.7mm Permanent Black Ink",
      sealStatus: "Factory sealed in tamper-proof wrap",
    },
    securityNote: "All unused draft sheets must be counted and returned to control room.",
  },
];

export const ROOM_FOLDER_DOCS: DocumentItem[] = [
  {
    id: "student-register",
    title: "Student Register",
    code: "RM-DOC-01",
    category: "room",
    description:
      "Primary examination roster showing enrolled candidate full names, national IDs, seating numbers, candidate signatures, and bubble sheet serial tracking.",
    copiesNote: "1 bound register per examination room (3 copies with carbon-copy transfer)",
    fields: [
      "Center, Building, Floor & Room Number",
      "Seat Number (e.g. Desk 01 to Desk 25)",
      "Candidate Name & Identification Number",
      "Candidate Signature (Morning & Afternoon)",
      "Bubble Sheet Barcode Number",
    ],
    sampleData: {
      room: "Room 102 (Damietta Secondary)",
      candidatesEnrolled: "25 Candidates",
      absenteeMarking: "Clear red 'A' in signature column",
      bubbleSheetType: "EST Standard Form 40-Q",
    },
    securityNote: "Every student must sign next to their printed national ID and seat number.",
  },
  {
    id: "room-proctor-report",
    title: "Room Proctor Report",
    code: "RM-DOC-02",
    category: "room",
    description:
      "Detailed room administration report completed jointly by the two room proctors. Records booklet distribution, start/stop bell times, and counted returned sheets.",
    copiesNote: "1 form per room completed in duplicate",
    fields: [
      "Proctor 1 & Proctor 2 Full Names",
      "Seal Break Time (Exact minute of seal break)",
      "Actual Question Booklet Count Received",
      "Actual Used & Unused Booklets Returned",
      "Proctor Formal Declarations & Signatures",
    ],
    sampleData: {
      proctor1: "Ahmed El-Sayed (Primary)",
      proctor2: "Mona Adel (Assistant)",
      bookletsReceived: "25 Received / 25 Distributed",
      examStartEnd: "09:00 AM — 11:30 AM",
    },
    securityNote: "Used + Unused + Defective must equal exactly the count stamped on room folder.",
  },
  {
    id: "room-mobile-files",
    title: "Student Numbers & Mobile Envelopes",
    code: "RM-DOC-03",
    category: "room",
    description:
      "Individual desk index tickets and security mobile envelopes where students deposit powered-off phones before taking their allocated desks.",
    copiesNote: "25 individual desk tickets + 25 numbered phone envelopes",
    fields: [
      "Seat Number (Desk 01 — 25)",
      "Student Self-Inspection Acknowledgment",
      "Device Storage Envelope Number",
      "Deposit Confirmation Checkbox",
    ],
    sampleData: {
      deskTickets: "Pre-cut numbers placed on student desks",
      intakeProtocol: "Completed before 08:45 AM bell",
      storageRack: "Proctor desk front perimeter",
    },
    securityNote: "Possession of smartwatches, earphones, or phones during exam causes immediate cancellation.",
  },
  {
    id: "student-misconduct",
    title: "Student Misconduct & Irregularity Forms",
    code: "RM-DOC-04",
    category: "room",
    description:
      "Official disciplinary incident report to document cheating, unauthorized communication, disruptive behavior, or unauthorized paper exchange.",
    copiesNote: "3 legal incident forms enclosed per room",
    fields: [
      "Candidate Name, Seat Number, & National ID",
      "Exact Time of Incident Detection",
      "Confiscated Material Details (Notes/Device/Draft)",
      "Proctor 1 & Proctor 2 Signed Testimonies",
      "Senior Proctor Co-Verification Signature",
    ],
    sampleData: {
      formQuota: "3 Copies included in reserve envelope",
      procedure: "Immediate confiscation of evidence + Senior call",
      reportDestination: "Legal Disciplinary Affairs Committee",
    },
    securityNote: "Confiscated materials must be stapled directly to page 2 of this form.",
  },
  {
    id: "room-draft-pens",
    title: "Draft Papers, Pens, and Spare Stationeries",
    code: "RM-DOC-05",
    category: "room",
    description:
      "Sealed room supply packet containing official stamped draft sheets (2 per candidate), spare HB pencils, black ballpoint pens, and erasers.",
    copiesNote: "1 sealed student stationery pack per room",
    fields: [
      "Stamped Draft Paper Sheets (50 sheets = 2 per student)",
      "Black Ballpoint Pens (Count: 5 spares)",
      "HB Pencils & Erasers (Count: 5 spares)",
      "Proctor Quick-Reference Timeline Card",
    ],
    sampleData: {
      draftPaperWatermark: "EST-OFFICIAL-SCRATCH",
      collectionRule: "Must be collected before booklet collection",
      replacementPens: "Provided for defective candidate pens",
    },
    securityNote: "Students are strictly prohibited from removing draft paper from the room.",
  },
];

export const SAMPLE_SUBJECTS: SubjectItem[] = [
  {
    id: "math-1",
    code: "MATH1",
    name: "Mathematics 1 (Algebra & Functions)",
    exam: "EST 1",
    timeMinutes: 90,
    ordinaryCandidates: 25,
    assnCandidates: 3,
    color: "from-blue-600 to-indigo-700",
    bubbleSheetType: "EST-M1-40Q",
  },
  {
    id: "math-2",
    code: "MATH2",
    name: "Mathematics 2 (Calculus & Geometry)",
    exam: "EST 2",
    timeMinutes: 90,
    ordinaryCandidates: 25,
    assnCandidates: 2,
    color: "from-indigo-600 to-violet-700",
    bubbleSheetType: "EST-M2-50Q",
  },
  {
    id: "biology",
    code: "BIO",
    name: "Biology (Cellular & Genetics)",
    exam: "EST 2",
    timeMinutes: 60,
    ordinaryCandidates: 25,
    assnCandidates: 1,
    color: "from-emerald-600 to-teal-700",
    bubbleSheetType: "EST-BIO-60Q",
  },
  {
    id: "physics",
    code: "PHYS",
    name: "Physics (Mechanics & Electromagnetism)",
    exam: "EST 2",
    timeMinutes: 60,
    ordinaryCandidates: 25,
    assnCandidates: 2,
    color: "from-amber-600 to-orange-700",
    bubbleSheetType: "EST-PHY-60Q",
  },
  {
    id: "chemistry",
    code: "CHEM",
    name: "Chemistry (Organic & Analytical)",
    exam: "EST 2",
    timeMinutes: 60,
    ordinaryCandidates: 20,
    assnCandidates: 1,
    color: "from-rose-600 to-pink-700",
    bubbleSheetType: "EST-CHM-60Q",
  },
  {
    id: "literature",
    code: "LIT",
    name: "Literature & Reading Comprehension",
    exam: "EST 1",
    timeMinutes: 65,
    ordinaryCandidates: 25,
    assnCandidates: 4,
    color: "from-cyan-600 to-blue-700",
    bubbleSheetType: "EST-LIT-52Q",
  },
];

export const SHIPPING_CHECKLIST_ITEMS: PackagingChecklistItem[] = [
  {
    id: "check-math1",
    subject: "Mathematics 1 (Math 1)",
    code: "MATH1-25",
    verifiedCopies: 25,
  },
  {
    id: "check-math2",
    subject: "Mathematics 2 (Math 2)",
    code: "MATH2-25",
    verifiedCopies: 25,
  },
  {
    id: "check-physics",
    subject: "Physics (Advanced)",
    code: "PHYS-25",
    verifiedCopies: 25,
  },
  {
    id: "check-biology",
    subject: "Biology & Life Sciences",
    code: "BIO-25",
    verifiedCopies: 25,
  },
  {
    id: "check-chemistry",
    subject: "Chemistry & Laboratory",
    code: "CHEM-20",
    verifiedCopies: 20,
  },
  {
    id: "check-assn",
    subject: "ASSN Accommodated Special Packets",
    code: "ASSN-SPEC-05",
    verifiedCopies: 5,
    isSpecialNeeds: true,
  },
];

export const ASSN_DOCUMENT: DocumentItem = {
  id: "assn-roster",
  title: "ASSN Accommodated Candidate Ledger & Protocols",
  code: "ASSN-DOC-01",
  category: "special",
  description:
    "Confidential ledger specifying approved individual accommodations (+25%/+50% time, readers, scribes, separate rooms) and supervisor verification sign-offs.",
  copiesNote: "1 original per ASSN Bag (retained in sealed dossier)",
  fields: [
    "Candidate Full Name & National ID",
    "Approved Accommodation Code (e.g. +25% Time, Reader)",
    "Assigned Special Needs Room (e.g. Room 105)",
    "Chief Medical Proctor Endorsement",
    "Candidate & Proctor Execution Signatures",
  ],
  sampleData: {
    room: "Room 105 (Special Accommodations)",
    registeredStudents: "3 Candidates (+25% Extra Time)",
    designatedReader: "Mona Adel (Certified Scribe)",
    seatingSpacing: "2.5m minimum perimeter",
  },
  securityNote: "Only unsealed by Chief Proctor and Designated Accommodation Officer.",
};

export const SCENES_METADATA = SCENES_META;
export const SUBJECT_SAMPLES = SAMPLE_SUBJECTS;
export const PACKAGING_CHECKLIST: ChecklistItem[] = SHIPPING_CHECKLIST_ITEMS.map((item: PackagingChecklistItem) => ({
  id: item.id,
  title: item.subject,
  detail: `${item.verifiedCopies} Verified Copies Enclosed`,
  code: item.code,
  isSpecialNeeds: item.isSpecialNeeds,
}));
