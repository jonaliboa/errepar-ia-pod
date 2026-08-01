/**
 * Model Gateway – provider-agnostic abstraction layer.
 *
 * All AI providers must implement ModelProvider.
 * Add new providers without changing agent or UI code.
 */

export type ModelRole = "user" | "assistant" | "system";

export interface ModelMessage {
  role: ModelRole;
  content: string;
}

export interface ModelRequest {
  /** Tenant / user scoping (passed through for quota / logging). */
  tenantId: string;
  userId: string;
  /** Conversation history including the new user message at the end. */
  messages: ModelMessage[];
  /** Optional system prompt override. */
  systemPrompt?: string;
  /** Hint to the gateway about which domain we are serving. */
  domain?: string;
  /** Maximum tokens to generate. */
  maxTokens?: number;
  /** Temperature (0–2). */
  temperature?: number;
}

export interface ModelResponse {
  content: string;
  /** Provider identifier (e.g. "mock", "openai", "anthropic"). */
  provider: string;
  /** Model identifier (e.g. "mock-v1", "gpt-4o", "claude-3-5-sonnet"). */
  model: string;
  /** Wall-clock latency in milliseconds. */
  latencyMs: number;
  /** Number of input tokens used (if reported by provider). */
  inputTokens?: number;
  /** Number of output tokens used (if reported by provider). */
  outputTokens?: number;
}

/**
 * Every AI provider must implement this interface.
 * New providers can be registered in the ModelGateway factory.
 */
export interface ModelProvider {
  readonly id: string;
  readonly defaultModel: string;
  complete(request: ModelRequest): Promise<ModelResponse>;
}
