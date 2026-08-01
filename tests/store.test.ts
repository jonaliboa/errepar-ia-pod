/**
 * Tests for the in-memory domain store.
 * Verifies tenant/user/workspace/conversation isolation.
 */

import { describe, it, expect } from "vitest";
import {
  store,
  DEMO_TENANT,
  DEMO_USER,
  DEMO_WORKSPACE,
} from "@/domain/store";
import type { Conversation, Message } from "@/domain/types";

describe("InMemoryStore – seed data", () => {
  it("has the demo tenant seeded", () => {
    const tenant = store.getTenant(DEMO_TENANT.id);
    expect(tenant).toBeDefined();
    expect(tenant?.slug).toBe("errepar-demo");
  });

  it("has the demo user seeded", () => {
    const user = store.getUser(DEMO_USER.id);
    expect(user).toBeDefined();
    expect(user?.role).toBe("professional");
  });

  it("has the demo workspace seeded", () => {
    const ws = store.getWorkspace(DEMO_WORKSPACE.id);
    expect(ws).toBeDefined();
    expect(ws?.tenantId).toBe(DEMO_TENANT.id);
  });
});

describe("InMemoryStore – conversations", () => {
  it("creates and retrieves a conversation", () => {
    const now = new Date().toISOString();
    const conv: Conversation = {
      id: "conv-test-1",
      workspaceId: DEMO_WORKSPACE.id,
      tenantId: DEMO_TENANT.id,
      userId: DEMO_USER.id,
      agentType: "legal",
      title: "Test conversation",
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
    store.createConversation(conv);
    const retrieved = store.getConversation("conv-test-1");
    expect(retrieved).toBeDefined();
    expect(retrieved?.title).toBe("Test conversation");
  });

  it("lists conversations by workspace", () => {
    const list = store.getConversationsByWorkspace(DEMO_WORKSPACE.id);
    const found = list.find((c) => c.id === "conv-test-1");
    expect(found).toBeDefined();
  });

  it("adds messages to a conversation", () => {
    const msg: Message = {
      id: "msg-test-1",
      conversationId: "conv-test-1",
      role: "user",
      content: "¿Qué dice la LGS?",
      createdAt: new Date().toISOString(),
    };
    store.addMessage("conv-test-1", msg);
    const conv = store.getConversation("conv-test-1");
    expect(conv?.messages.length).toBe(1);
    expect(conv?.messages[0].content).toBe("¿Qué dice la LGS?");
  });

  it("returns undefined for non-existent conversation", () => {
    expect(store.getConversation("does-not-exist")).toBeUndefined();
  });
});

describe("InMemoryStore – multi-tenant isolation", () => {
  it("getUsersByTenant returns only users for that tenant", () => {
    const users = store.getUsersByTenant(DEMO_TENANT.id);
    expect(users.length).toBeGreaterThanOrEqual(2); // demo user + supervisor
    users.forEach((u) => expect(u.tenantId).toBe(DEMO_TENANT.id));
  });

  it("returns empty array for unknown tenant", () => {
    const users = store.getUsersByTenant("unknown-tenant");
    expect(users).toEqual([]);
  });
});
