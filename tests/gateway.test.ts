/**
 * Tests for the Model Gateway.
 * Verifies the provider abstraction and registration mechanism.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ModelGateway } from "@/gateway/index";
import { MockProvider } from "@/gateway/mock";
import { OpenAIProvider } from "@/gateway/openai";
import { OpenRouterProvider } from "@/gateway/openrouter";
import type { ModelProvider, ModelRequest, ModelResponse } from "@/gateway/types";

describe("ModelGateway", () => {
  it("defaults to the mock provider", () => {
    const gw = new ModelGateway("mock");
    expect(gw.providerId).toBe("mock");
    expect(gw.modelId).toBe("mock-v1");
  });

  it("throws for unknown provider ids", () => {
    expect(() => new ModelGateway("nonexistent-provider")).toThrow(
      /Unknown model provider/
    );
  });

  it("completes a request via the mock provider", async () => {
    const gw = new ModelGateway("mock");
    const response = await gw.complete({
      tenantId: "t1",
      userId: "u1",
      messages: [{ role: "user", content: "¿Qué dice el artículo 1 de la LGS?" }],
      domain: "legal",
    });

    expect(response.provider).toBe("mock");
    expect(response.model).toBe("mock-v1");
    expect(typeof response.content).toBe("string");
    expect(response.content.length).toBeGreaterThan(0);
    expect(response.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("allows registering a custom provider", async () => {
    const customProvider: ModelProvider = {
      id: "custom-test",
      defaultModel: "custom-model-1",
      async complete(_req: ModelRequest): Promise<ModelResponse> {
        return {
          content: "Custom provider response",
          provider: "custom-test",
          model: "custom-model-1",
          latencyMs: 1,
        };
      },
    };

    ModelGateway.register(customProvider);
    const gw = new ModelGateway("custom-test");
    const response = await gw.complete({
      tenantId: "t1",
      userId: "u1",
      messages: [{ role: "user", content: "test" }],
    });

    expect(response.provider).toBe("custom-test");
    expect(response.content).toBe("Custom provider response");
  });
});

describe("MockProvider", () => {
  it("returns legal domain responses for domain=legal", async () => {
    const provider = new MockProvider();
    const response = await provider.complete({
      tenantId: "t1",
      userId: "u1",
      messages: [{ role: "user", content: "consulta legal" }],
      domain: "legal",
    });
    expect(response.content).toBeTruthy();
    expect(response.provider).toBe("mock");
  });

  it("returns accounting domain responses for domain=accounting", async () => {
    const provider = new MockProvider();
    const response = await provider.complete({
      tenantId: "t1",
      userId: "u1",
      messages: [{ role: "user", content: "consulta contable" }],
      domain: "accounting",
    });
    expect(response.content).toBeTruthy();
    expect(response.provider).toBe("mock");
  });

  it("reports input and output token counts", async () => {
    const provider = new MockProvider();
    const response = await provider.complete({
      tenantId: "t1",
      userId: "u1",
      messages: [{ role: "user", content: "test" }],
    });
    expect(response.inputTokens).toBeGreaterThan(0);
    expect(response.outputTokens).toBeGreaterThan(0);
  });
});

describe("OpenAIProvider", () => {
  const originalEnv = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
    OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
  };

  beforeEach(() => {
    if (originalEnv.OPENAI_API_KEY === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalEnv.OPENAI_API_KEY;

    if (originalEnv.OPENAI_MODEL === undefined) delete process.env.OPENAI_MODEL;
    else process.env.OPENAI_MODEL = originalEnv.OPENAI_MODEL;

    if (originalEnv.OPENAI_BASE_URL === undefined) delete process.env.OPENAI_BASE_URL;
    else process.env.OPENAI_BASE_URL = originalEnv.OPENAI_BASE_URL;
  });

  it("throws when the API key is missing", async () => {
    delete process.env.OPENAI_API_KEY;
    const provider = new OpenAIProvider();
    await expect(
      provider.complete({
        tenantId: "t1",
        userId: "u1",
        messages: [{ role: "user", content: "hola" }],
      })
    ).rejects.toThrow(/OPENAI_API_KEY/);
  });

  it("calls an OpenAI-compatible chat completions endpoint", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.OPENAI_MODEL = "demo-model";
    process.env.OPENAI_BASE_URL = "https://example.test/v1";

    const originalFetch = global.fetch;
    const fetchMock = async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe("https://example.test/v1/chat/completions");
      expect(init?.method).toBe("POST");
      const authHeader = String((init?.headers as Record<string, string>).Authorization);
      expect(authHeader.split(" ")[0]).toBe("Bearer");
      expect(authHeader.split(" ").length).toBe(2);

      const body = JSON.parse(String(init?.body));
      expect(body.model).toBe("demo-model");
      expect(body.messages[0]).toEqual({
        role: "system",
        content: "Sistema de prueba",
      });
      expect(body.messages[1]).toEqual({
        role: "user",
        content: "consulta",
      });

      return new Response(
        JSON.stringify({
          choices: [{ message: { content: "Respuesta real" } }],
          usage: { prompt_tokens: 12, completion_tokens: 4 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };

    global.fetch = fetchMock as typeof fetch;

    try {
      const provider = new OpenAIProvider();
      const response = await provider.complete({
        tenantId: "t1",
        userId: "u1",
        systemPrompt: "Sistema de prueba",
        messages: [{ role: "user", content: "consulta" }],
      });

      expect(response.provider).toBe("openai");
      expect(response.model).toBe("demo-model");
      expect(response.content).toBe("Respuesta real");
      expect(response.inputTokens).toBe(12);
      expect(response.outputTokens).toBe(4);
    } finally {
      global.fetch = originalFetch;
    }
  });
});

describe("OpenRouterProvider", () => {
  const originalEnv = {
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    OPENROUTER_MODEL: process.env.OPENROUTER_MODEL,
    OPENROUTER_SITE_URL: process.env.OPENROUTER_SITE_URL,
    OPENROUTER_SITE_NAME: process.env.OPENROUTER_SITE_NAME,
  };

  beforeEach(() => {
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("uses google/gemma-4-26b-a4b-it:free as the default model", () => {
    delete process.env.OPENROUTER_MODEL;
    const provider = new OpenRouterProvider();
    expect(provider.defaultModel).toBe("google/gemma-4-26b-a4b-it:free");
  });

  it("throws when the API key is missing", async () => {
    delete process.env.OPENROUTER_API_KEY;
    const provider = new OpenRouterProvider();
    await expect(
      provider.complete({
        tenantId: "t1",
        userId: "u1",
        messages: [{ role: "user", content: "hola" }],
      })
    ).rejects.toThrow(/OPENROUTER_API_KEY/);
  });

  it("calls the OpenRouter chat completions endpoint with required headers", async () => {
    process.env.OPENROUTER_API_KEY = "test-key";
    process.env.OPENROUTER_MODEL = "google/gemma-4-26b-a4b-it:free";

    const originalFetch = global.fetch;
    const fetchMock = async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe("https://openrouter.ai/api/v1/chat/completions");
      expect(init?.method).toBe("POST");
      const headers = init?.headers as Record<string, string>;
      const authHeader = String(headers["Authorization"]);
      expect(authHeader.startsWith("Bearer ")).toBe(true);
      expect(authHeader.split(" ").length).toBe(2);
      expect(headers["HTTP-Referer"]).toBeTruthy();
      expect(headers["X-Title"]).toBeTruthy();

      const body = JSON.parse(String(init?.body));
      expect(body.model).toBe("google/gemma-4-26b-a4b-it:free");
      expect(body.messages[0]).toEqual({ role: "user", content: "consulta" });

      return new Response(
        JSON.stringify({
          choices: [{ message: { content: "Respuesta de Gemma" } }],
          usage: { prompt_tokens: 10, completion_tokens: 5 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };

    global.fetch = fetchMock as typeof fetch;

    try {
      const provider = new OpenRouterProvider();
      const response = await provider.complete({
        tenantId: "t1",
        userId: "u1",
        messages: [{ role: "user", content: "consulta" }],
      });

      expect(response.provider).toBe("openrouter");
      expect(response.model).toBe("google/gemma-4-26b-a4b-it:free");
      expect(response.content).toBe("Respuesta de Gemma");
      expect(response.inputTokens).toBe(10);
      expect(response.outputTokens).toBe(5);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("is registered in the gateway and selectable by id", () => {
    const gw = new ModelGateway("openrouter");
    expect(gw.providerId).toBe("openrouter");
  });
});
