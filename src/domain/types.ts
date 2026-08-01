/**
 * Core domain types for IA Pod Errepar.
 * Designed for multi-tenant, multi-user, multi-workspace scalability.
 */

export type AgentType = "legal" | "accounting";

export type RiskLevel = "low" | "medium" | "high";

export type ReviewStatus = "not_required" | "pending" | "requested" | "completed";

export type MessageRole = "user" | "assistant" | "system";

// ---------------------------------------------------------------------------
// Multi-tenant domain
// ---------------------------------------------------------------------------

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

export interface User {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: "admin" | "professional" | "subscriber" | "supervisor";
  createdAt: string;
}

export interface Workspace {
  id: string;
  tenantId: string;
  userId: string;
  name: string;
  description?: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Conversation & Messages
// ---------------------------------------------------------------------------

export interface Source {
  title: string;
  reference: string;
  type: "legislation" | "doctrine" | "jurisprudence" | "calculation" | "regulation";
  url?: string;
}

export interface ResponseMetadata {
  agentType: AgentType;
  provider: string;
  model: string;
  latencyMs: number;
  riskLevel: RiskLevel;
  confidence: number; // 0–1
  reviewStatus: ReviewStatus;
  reviewRecommended: boolean;
  sources: Source[];
  disclaimer: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  metadata?: ResponseMetadata;
  createdAt: string;
}

export interface Conversation {
  id: string;
  workspaceId: string;
  tenantId: string;
  userId: string;
  agentType: AgentType;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// API shapes
// ---------------------------------------------------------------------------

export interface ChatRequest {
  conversationId?: string;
  workspaceId: string;
  tenantId: string;
  userId: string;
  agentType: AgentType;
  userMessage: string;
}

export interface ChatResponse {
  conversationId: string;
  message: Message;
  metrics: {
    agentType: AgentType;
    provider: string;
    model: string;
    latencyMs: number;
    riskLevel: RiskLevel;
    reviewStatus: ReviewStatus;
  };
}
