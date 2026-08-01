/**
 * Agent interface and shared response schema.
 *
 * Both LegalAgent and AccountingAgent implement this interface.
 * The AgentRouter selects the correct agent without the caller knowing
 * the concrete type.
 */

import type { AgentType, RiskLevel, ReviewStatus, Source } from "@/domain/types";
import type { ModelRequest, ModelResponse } from "@/gateway/types";

export interface AgentContext {
  tenantId: string;
  userId: string;
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>;
  userMessage: string;
}

export interface AgentResponse {
  /** The human-readable answer. */
  content: string;
  /** Domain of the responding agent. */
  agentType: AgentType;
  /** Provider and model used for this turn. */
  provider: string;
  model: string;
  /** Wall-clock latency. */
  latencyMs: number;
  /** 0–1 confidence score. */
  confidence: number;
  /** Risk classification of the response. */
  riskLevel: RiskLevel;
  /** Whether human review is recommended. */
  reviewRecommended: boolean;
  /** Current review status. */
  reviewStatus: ReviewStatus;
  /** Sources / citations used. */
  sources: Source[];
  /** Mandatory disclaimer. */
  disclaimer: string;
  /** Raw provider response (for observability). */
  raw: ModelResponse;
}

export interface Agent {
  readonly agentType: AgentType;
  handle(context: AgentContext): Promise<AgentResponse>;
}

// Helpers

export function buildModelRequest(
  context: AgentContext,
  systemPrompt: string,
  domain: string
): ModelRequest {
  return {
    tenantId: context.tenantId,
    userId: context.userId,
    systemPrompt,
    domain,
    messages: [
      ...context.conversationHistory.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: context.userMessage },
    ],
  };
}
