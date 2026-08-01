/**
 * ModelGateway – selects and delegates to the configured provider.
 *
 * HOW TO ADD A NEW PROVIDER
 * ─────────────────────────
 * 1. Implement `ModelProvider` in a new file (e.g. `src/gateway/openai.ts`).
 * 2. Import and instantiate it here.
 * 3. Register it in `PROVIDERS` below.
 * 4. Set the GATEWAY_PROVIDER env variable to the new provider's id.
 *
 * No agent or UI code needs to change.
 */

import type { ModelProvider, ModelRequest, ModelResponse } from "./types";
import { MockProvider } from "./mock";

// ---------------------------------------------------------------------------
// Provider registry
// ---------------------------------------------------------------------------

const PROVIDERS: Record<string, ModelProvider> = {
  mock: new MockProvider(),
  // openai: new OpenAIProvider(),   // add when ready
  // anthropic: new AnthropicProvider(),
};

// ---------------------------------------------------------------------------
// Gateway
// ---------------------------------------------------------------------------

export class ModelGateway {
  private provider: ModelProvider;

  constructor(providerId?: string) {
    const id =
      providerId ??
      process.env.GATEWAY_PROVIDER ??
      "mock";

    const provider = PROVIDERS[id];
    if (!provider) {
      throw new Error(
        `Unknown model provider "${id}". Registered providers: ${Object.keys(PROVIDERS).join(", ")}`
      );
    }
    this.provider = provider;
  }

  async complete(request: ModelRequest): Promise<ModelResponse> {
    return this.provider.complete(request);
  }

  get providerId(): string {
    return this.provider.id;
  }

  get modelId(): string {
    return this.provider.defaultModel;
  }

  /** Register an additional provider at runtime (useful for tests or plugins). */
  static register(provider: ModelProvider): void {
    PROVIDERS[provider.id] = provider;
  }
}

// Module-level default gateway instance.
let _defaultGateway: ModelGateway | null = null;

export function getDefaultGateway(): ModelGateway {
  if (!_defaultGateway) {
    _defaultGateway = new ModelGateway();
  }
  return _defaultGateway;
}
