/**
 * In-memory store for the prototype.
 * Provides explicit tenant/user/workspace/conversation boundaries.
 * Replace with a real database adapter for production.
 */

import type {
  Tenant,
  User,
  Workspace,
  Conversation,
  Message,
} from "./types";

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

const DEMO_TENANT: Tenant = {
  id: "tenant-errepar-demo",
  name: "Errepar Demo",
  slug: "errepar-demo",
  createdAt: new Date().toISOString(),
};

const DEMO_USER: User = {
  id: "user-demo-1",
  tenantId: DEMO_TENANT.id,
  name: "Dr. Demo",
  email: "demo@errepar.com",
  role: "professional",
  createdAt: new Date().toISOString(),
};

const DEMO_SUPERVISOR: User = {
  id: "user-supervisor-1",
  tenantId: DEMO_TENANT.id,
  name: "Supervisor Errepar",
  email: "supervisor@errepar.com",
  role: "supervisor",
  createdAt: new Date().toISOString(),
};

const DEMO_WORKSPACE: Workspace = {
  id: "workspace-demo-1",
  tenantId: DEMO_TENANT.id,
  userId: DEMO_USER.id,
  name: "Estudio Principal",
  description: "Espacio de trabajo principal",
  createdAt: new Date().toISOString(),
};

// ---------------------------------------------------------------------------
// Store class
// ---------------------------------------------------------------------------

class InMemoryStore {
  private tenants = new Map<string, Tenant>();
  private users = new Map<string, User>();
  private workspaces = new Map<string, Workspace>();
  private conversations = new Map<string, Conversation>();

  constructor() {
    this.tenants.set(DEMO_TENANT.id, DEMO_TENANT);
    this.users.set(DEMO_USER.id, DEMO_USER);
    this.users.set(DEMO_SUPERVISOR.id, DEMO_SUPERVISOR);
    this.workspaces.set(DEMO_WORKSPACE.id, DEMO_WORKSPACE);
  }

  // Tenants
  getTenant(id: string): Tenant | undefined {
    return this.tenants.get(id);
  }
  listTenants(): Tenant[] {
    return Array.from(this.tenants.values());
  }
  createTenant(tenant: Tenant): Tenant {
    this.tenants.set(tenant.id, tenant);
    return tenant;
  }

  // Users
  getUser(id: string): User | undefined {
    return this.users.get(id);
  }
  getUsersByTenant(tenantId: string): User[] {
    return Array.from(this.users.values()).filter(
      (u) => u.tenantId === tenantId
    );
  }
  createUser(user: User): User {
    this.users.set(user.id, user);
    return user;
  }

  // Workspaces
  getWorkspace(id: string): Workspace | undefined {
    return this.workspaces.get(id);
  }
  getWorkspacesByUser(userId: string): Workspace[] {
    return Array.from(this.workspaces.values()).filter(
      (w) => w.userId === userId
    );
  }
  createWorkspace(workspace: Workspace): Workspace {
    this.workspaces.set(workspace.id, workspace);
    return workspace;
  }

  // Conversations
  getConversation(id: string): Conversation | undefined {
    return this.conversations.get(id);
  }
  getConversationsByWorkspace(workspaceId: string): Conversation[] {
    return Array.from(this.conversations.values()).filter(
      (c) => c.workspaceId === workspaceId
    );
  }
  createConversation(conversation: Conversation): Conversation {
    this.conversations.set(conversation.id, conversation);
    return conversation;
  }
  updateConversation(id: string, updates: Partial<Conversation>): Conversation | undefined {
    const existing = this.conversations.get(id);
    if (!existing) return undefined;
    const updated: Conversation = { ...existing, ...updates, id };
    this.conversations.set(id, updated);
    return updated;
  }
  addMessage(conversationId: string, message: Message): Conversation | undefined {
    const conv = this.conversations.get(conversationId);
    if (!conv) return undefined;
    const updated: Conversation = {
      ...conv,
      messages: [...conv.messages, message],
      updatedAt: new Date().toISOString(),
    };
    this.conversations.set(conversationId, updated);
    return updated;
  }
}

// Module-level singleton (one per process/server instance).
// Replace with a connection pool or repository layer for production.
const store = new InMemoryStore();

export { store, DEMO_TENANT, DEMO_USER, DEMO_SUPERVISOR, DEMO_WORKSPACE };
