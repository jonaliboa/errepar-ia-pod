import type { ModelMessage, ModelProvider, ModelRequest, ModelResponse } from "./types";

interface OpenRouterChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
}

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

function toProviderMessages(request: ModelRequest): ModelMessage[] {
  return request.systemPrompt
    ? [{ role: "system", content: request.systemPrompt }, ...request.messages]
    : request.messages;
}

function extractContent(payload: OpenRouterChatCompletionResponse): string {
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content === "string") {
    return content.trim();
  }
  if (Array.isArray(content)) {
    return content
      .map((part) => part.text?.trim())
      .filter(Boolean)
      .join("\n")
      .trim();
  }
  return "";
}

export class OpenRouterProvider implements ModelProvider {
  readonly id = "openrouter";

  get defaultModel(): string {
    return process.env.OPENROUTER_MODEL ?? "google/gemma-3-4b-it:free";
  }

  private get apiKey(): string | undefined {
    return process.env.OPENROUTER_API_KEY;
  }

  async complete(request: ModelRequest): Promise<ModelResponse> {
    if (!this.apiKey) {
      throw new Error('OPENROUTER_API_KEY is required when GATEWAY_PROVIDER="openrouter"');
    }

    const start = Date.now();
    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: ["Bearer", this.apiKey].join(" "),
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "https://errepar-ia-pod.vercel.app",
        "X-Title": process.env.OPENROUTER_SITE_NAME ?? "Errepar IA Pod",
      },
      body: JSON.stringify({
        model: this.defaultModel,
        messages: toProviderMessages(request),
        temperature: request.temperature ?? 0.2,
        max_tokens: request.maxTokens,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter error (${response.status}): ${errorText}`);
    }

    const payload = (await response.json()) as OpenRouterChatCompletionResponse;
    const content = extractContent(payload);
    if (!content) {
      throw new Error("OpenRouter returned an empty response");
    }

    return {
      content,
      provider: this.id,
      model: this.defaultModel,
      latencyMs: Date.now() - start,
      inputTokens: payload.usage?.prompt_tokens,
      outputTokens: payload.usage?.completion_tokens,
    };
  }
}
