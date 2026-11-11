export type WorkflowId = "workflow-1" | "workflow-2" | "master-overview";

export interface SceneMeta {
  id: number;
  slug: string;
  workflow: WorkflowId;
  workflowTitle: string;
  title: string;
  subtitle: string;
  summary: string;
  badge: string;
}

export interface DocumentItem {
  id: string;
  title: string;
  code: string;
  category: "senior" | "room" | "control" | "special";
  description: string;
  copiesNote: string;
  fields: string[];
  sampleData: Record<string, string>;
  securityNote?: string;
}

export interface SubjectItem {
  id: string;
  code: string;
  name: string;
  exam: "EST 1" | "EST 2";
  timeMinutes: number;
  ordinaryCandidates: number;
  assnCandidates: number;
  color: string;
  bubbleSheetType: string;
}

export interface PackagingChecklistItem {
  id: string;
  subject: string;
  code: string;
  verifiedCopies: number;
  isSpecialNeeds?: boolean;
}

export interface ChecklistItem {
  id: string;
  title: string;
  detail: string;
  code: string;
  isSpecialNeeds?: boolean;
}
