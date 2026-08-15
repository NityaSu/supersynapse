/** Engine domain types for documents, chunks, and graph memories. */

export const DOCUMENT_STATUSES = [
  "queued",
  "extracting",
  "chunking",
  "embedding",
  "indexing",
  "done",
  "failed",
] as const;

export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export type DocumentType = "text";

export type MemoryRelation = "updates" | "extends" | "derives";

export type EngineDocument = {
  id: string;
  containerTag: string;
  title: string | null;
  content: string;
  type: DocumentType;
  status: DocumentStatus;
  error: string | null;
  chunkCount: number;
  metadata: Record<string, string | number | boolean> | null;
  createdAt: string;
  updatedAt: string;
};

export type EngineChunk = {
  id: string;
  documentId: string;
  containerTag: string;
  content: string;
  position: number;
  embedding: number[] | null;
  createdAt: string;
};

export type GraphMemory = {
  id: string;
  containerTag: string;
  documentId: string | null;
  content: string;
  isLatest: boolean;
  embedding: number[] | null;
  createdAt: string;
  updatedAt: string;
};

export type MemoryEdge = {
  id: string;
  containerTag: string;
  fromMemoryId: string;
  toMemoryId: string;
  relation: MemoryRelation;
  createdAt: string;
};
