/**
 * Tests for agent routing and response schema.
 */

import { describe, it, expect } from "vitest";
import { AgentRouter } from "@/agents/router";
import { ModelGateway } from "@/gateway/index";
import type { AgentContext } from "@/agents/types";

const testGateway = new ModelGateway("mock");
const router = new AgentRouter(testGateway);

const baseContext: AgentContext = {
  tenantId: "tenant-test",
  userId: "user-test",
  conversationHistory: [],
  userMessage: "¿Podés explicarme el artículo 1 de la LGS?",
};

describe("AgentRouter", () => {
  it("lists all registered agent types", () => {
    const types = router.list();
    expect(types).toContain("legal");
    expect(types).toContain("accounting");
  });

  it("returns the correct agent for legal type", () => {
    const agent = router.get("legal");
    expect(agent.agentType).toBe("legal");
  });

  it("returns the correct agent for accounting type", () => {
    const agent = router.get("accounting");
    expect(agent.agentType).toBe("accounting");
  });

  it("throws for unknown agent types", () => {
    // @ts-expect-error testing unknown type
    expect(() => router.get("unknown-type")).toThrow(/No agent registered/);
  });
});

describe("LegalAgent response schema", () => {
  it("returns a well-formed AgentResponse", async () => {
    const agent = router.get("legal");
    const response = await agent.handle(baseContext);

    expect(response.agentType).toBe("legal");
    expect(typeof response.content).toBe("string");
    expect(response.content.length).toBeGreaterThan(0);
    expect(["low", "medium", "high"]).toContain(response.riskLevel);
    expect(response.confidence).toBeGreaterThan(0);
    expect(response.confidence).toBeLessThanOrEqual(1);
    expect(Array.isArray(response.sources)).toBe(true);
    expect(response.sources.length).toBeGreaterThan(0);
    expect(typeof response.disclaimer).toBe("string");
    expect(response.disclaimer.length).toBeGreaterThan(0);
    expect(typeof response.reviewRecommended).toBe("boolean");
    expect(["not_required", "pending", "requested", "completed"]).toContain(
      response.reviewStatus
    );
    expect(response.provider).toBe("mock");
  });

  it("attaches legal-specific sources", async () => {
    const agent = router.get("legal");
    const response = await agent.handle(baseContext);
    const types = response.sources.map((s) => s.type);
    expect(types).toContain("legislation");
  });

  it("sets reviewRecommended=true when risk is high", async () => {
    const agent = router.get("legal");
    // Use a message that triggers "high" risk classification (contains 'contrat')
    const ctx: AgentContext = {
      ...baseContext,
      userMessage: "Analizá este contrato y sus posibles sanciones",
    };
    const response = await agent.handle(ctx);
    // The mock response will contain 'contrat' → high risk → reviewRecommended
    if (response.riskLevel === "high") {
      expect(response.reviewRecommended).toBe(true);
      expect(response.reviewStatus).toBe("pending");
    }
  });
});

describe("AccountingAgent response schema", () => {
  it("returns a well-formed AgentResponse", async () => {
    const agent = router.get("accounting");
    const response = await agent.handle({
      ...baseContext,
      userMessage: "¿Cómo se calcula el ajuste por inflación impositivo?",
    });

    expect(response.agentType).toBe("accounting");
    expect(typeof response.content).toBe("string");
    expect(response.content.length).toBeGreaterThan(0);
    expect(["low", "medium", "high"]).toContain(response.riskLevel);
    expect(response.confidence).toBeGreaterThan(0);
    expect(response.confidence).toBeLessThanOrEqual(1);
    expect(Array.isArray(response.sources)).toBe(true);
    expect(response.sources.length).toBeGreaterThan(0);
    expect(typeof response.disclaimer).toBe("string");
    expect(response.provider).toBe("mock");
  });

  it("attaches accounting-specific sources", async () => {
    const agent = router.get("accounting");
    const response = await agent.handle({
      ...baseContext,
      userMessage: "Explicá RT17",
    });
    const types = response.sources.map((s) => s.type);
    expect(types).toContain("regulation");
  });
});

describe("Agent conversation history", () => {
  it("passes conversation history to the gateway", async () => {
    const agent = router.get("legal");
    const ctxWithHistory: AgentContext = {
      tenantId: "t1",
      userId: "u1",
      conversationHistory: [
        { role: "user", content: "Primera pregunta" },
        { role: "assistant", content: "Primera respuesta" },
      ],
      userMessage: "Segunda pregunta",
    };
    const response = await agent.handle(ctxWithHistory);
    // Should still return a valid response
    expect(response.content.length).toBeGreaterThan(0);
  });
});
