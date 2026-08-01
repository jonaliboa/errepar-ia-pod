import type { ModelMessage, ModelProvider, ModelRequest, ModelResponse } from "./types";

interface OpenAIChatCompletionResponse {
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

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

function toProviderMessages(request: ModelRequest): ModelMessage[] {
  return request.systemPrompt
    ? [{ role: "system", content: request.systemPrompt }, ...request.messages]
    : request.messages;
}

function extractContent(payload: OpenAIChatCompletionResponse): string {
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

export class OpenAIProvider implements ModelProvider {
  readonly id = "openai";
  get defaultModel(): string {
    return process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  }

  private get apiKey(): string | undefined {
    return process.env.OPENAI_API_KEY;
  }

  private get baseUrl(): string {
    return normalizeBaseUrl(process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1");
  }

  async complete(request: ModelRequest): Promise<ModelResponse> {
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY is required when GATEWAY_PROVIDER="openai"');
    }

    const start = Date.now();
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: ["Bearer", this.apiKey].join(" "),
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
      throw new Error(`OpenAI-compatible provider error (${response.status}): ${errorText}`);
    }

    const payload = (await response.json()) as OpenAIChatCompletionResponse;
    const content = extractContent(payload);
    if (!content) {
      throw new Error("OpenAI-compatible provider returned an empty response");
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
