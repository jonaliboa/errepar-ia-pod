/**
 * AgentRouter – selects the correct agent based on AgentType.
 *
 * Adding a new agent:
 * 1. Implement the Agent interface.
 * 2. Import and register it in the AGENTS map below.
 * No router, UI, or API code needs to change.
 */

import type { AgentType } from "@/domain/types";
import type { Agent } from "./types";
import { LegalAgent } from "./legal";
import { AccountingAgent } from "./accounting";
import { ModelGateway, getDefaultGateway } from "@/gateway";

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export class AgentRouter {
  private agents: Map<AgentType, Agent>;

  constructor(gateway?: ModelGateway) {
    const gw = gateway ?? getDefaultGateway();
    this.agents = new Map<AgentType, Agent>([
      ["legal", new LegalAgent(gw)],
      ["accounting", new AccountingAgent(gw)],
    ]);
  }

  get(agentType: AgentType): Agent {
    const agent = this.agents.get(agentType);
    if (!agent) {
      throw new Error(
        `No agent registered for type "${agentType}". Registered: ${Array.from(this.agents.keys()).join(", ")}`
      );
    }
    return agent;
  }

  list(): AgentType[] {
    return Array.from(this.agents.keys());
  }
}

// Module-level singleton router.
let _defaultRouter: AgentRouter | null = null;

export function getDefaultRouter(): AgentRouter {
  if (!_defaultRouter) {
    _defaultRouter = new AgentRouter();
  }
  return _defaultRouter;
}
