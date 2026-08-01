/**
 * Tests for the Model Gateway.
 * Verifies the provider abstraction and registration mechanism.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ModelGateway, getDefaultGateway } from "@/gateway/index";
import { MockProvider } from "@/gateway/mock";
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
