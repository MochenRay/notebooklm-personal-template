export type HealthSeverity = "error" | "warning" | "info";
export type HealthStatus = "error" | "warning" | "ok";

export interface ArtifactPath {
  artifactType: string;
  format?: string;
  id?: string;
  path: string;
  status: string;
  exists: boolean;
  localPath: string;
  shareUrl?: string;
  downloaded?: boolean | null;
  remoteOnly?: boolean;
}

export interface ArtifactCoverage {
  declaredCount: number;
  presentCount: number;
  complete: boolean;
  items: ArtifactPath[];
  statusShape: "array" | "object" | "missing";
}

export interface ResearchTask {
  query: string;
  taskId: string;
  mode: string;
  source: string;
  status: string;
  importPolicy: string;
  importedSourceIds: string[];
  importedIndices: number[];
  note: string;
}

export interface ResearchSnapshot {
  strategy: string;
  seedQueries: string[];
  tasks: ResearchTask[];
  selectedSourceIds: string[];
  selectionNote: string;
}

export interface TopicProposal {
  id: string;
  title_zh?: string;
  confidence?: number;
  reason?: string;
}

export interface FlashcardsArtifact {
  title: string;
  cards: Array<{
    front: string;
    back: string;
  }>;
}

export interface QuizArtifact {
  title: string;
  questions: Array<{
    question: string;
    hint?: string;
    answerOptions: Array<{
      text: string;
      isCorrect: boolean;
      rationale?: string;
    }>;
  }>;
}

export interface MindmapNode {
  name: string;
  children?: MindmapNode[];
}

export interface MindmapArtifact extends MindmapNode {
  children: MindmapNode[];
}

export interface PracticeArtifacts {
  flashcards?: FlashcardsArtifact;
  quiz?: QuizArtifact;
  mindmap?: MindmapArtifact;
}

export interface VaultSession {
  id: string;
  title: string;
  originalTitle: string;
  titleZh: string;
  author: string;
  authorUrl: string;
  capturedAt: string;
  month: string;
  sourceType: string;
  url: string;
  whyItMatters: string;
  path: string;
  sourceYamlPath: string;
  topics: {
    proposed: TopicProposal[];
    approved: string[];
  };
  tags: string[];
  status: {
    stage: string;
    publishCandidate: boolean;
    publishReason: string;
    topicReview: string;
  };
  notebooklm: {
    notebookId: string;
    notebookTitle: string;
    sourceIds: string[];
    primarySourceId: string;
    primarySourceInferred: boolean;
    sourceNote: string;
    profile: string;
    conversationId: string;
    research: ResearchSnapshot;
    artifactCoverage: ArtifactCoverage;
  };
  content: {
    synthesis: string;
    report: string;
    topology: string;
    questions: string;
    myNotes: string;
    debate: string;
    processLog: string;
    summary: string;
  };
  practice: PracticeArtifacts;
  rereadScore: number;
  health: {
    status: HealthStatus;
    errors: number;
    warnings: number;
  };
}

export interface TopicSessionLink {
  id: string;
  title: string;
  capturedAt: string;
  path: string;
  healthStatus: HealthStatus;
}

export interface VaultTopic {
  id: string;
  title: string;
  path: string;
  markdown: string;
  sessionIds: string[];
  sessions: TopicSessionLink[];
  count: number;
  latestDate: string;
  summary: string;
}

export interface Snapshot {
  generatedAt: string;
  source: string;
  truthLayer: string;
  digestionEngine: string;
  monthRange: string[];
  sessionsCount: number;
  topicsCount: number;
  notebooksCount: number;
}

export interface SessionsData {
  generatedAt: string;
  snapshot: Snapshot;
  sessions: VaultSession[];
}

export interface TopicsData {
  generatedAt: string;
  snapshot: Snapshot;
  topics: VaultTopic[];
}

export interface HealthFinding {
  severity: HealthSeverity;
  type: string;
  sessionId?: string;
  topicId?: string;
  artifactType?: string;
  path?: string;
  message: string;
}

export interface HealthData {
  generatedAt: string;
  source: string;
  summary: {
    status: HealthStatus;
    totalFindings: number;
    countsBySeverity: Partial<Record<HealthSeverity, number>>;
    countsByType: Record<string, number>;
    sessions: number;
    topics: number;
  };
  checks: string[];
  findings: HealthFinding[];
}

export type Route =
  | { name: "overview" }
  | { name: "sessions" }
  | { name: "session"; id: string; section?: string }
  | { name: "topics" }
  | { name: "topic"; id: string }
  | { name: "health" }
  | { name: "notFound"; path: string };
