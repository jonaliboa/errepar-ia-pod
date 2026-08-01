/**
 * Observability – lightweight in-process metrics for the prototype.
 *
 * Tracks: agent type, provider/model, latency, risk level, review status.
 * Replace with a real telemetry solution (e.g. OpenTelemetry) for production.
 */

import type { AgentType, RiskLevel, ReviewStatus } from "@/domain/types";

export interface MetricEvent {
  id: string;
  timestamp: string;
  tenantId: string;
  userId: string;
  agentType: AgentType;
  provider: string;
  model: string;
  latencyMs: number;
  riskLevel: RiskLevel;
  reviewStatus: ReviewStatus;
  inputLength: number;
  outputLength: number;
}

class MetricsCollector {
  private events: MetricEvent[] = [];

  record(event: MetricEvent): void {
    this.events.push(event);
    // In production, emit to a telemetry backend here.
    if (process.env.NODE_ENV !== "test") {
      console.log(
        `[metrics] agent=${event.agentType} provider=${event.provider} model=${event.model} latency=${event.latencyMs}ms risk=${event.riskLevel} review=${event.reviewStatus}`
      );
    }
  }

  getAll(): MetricEvent[] {
    return [...this.events];
  }

  getSummary() {
    const total = this.events.length;
    if (total === 0) return { total: 0 };

    const byAgent = this.events.reduce(
      (acc, e) => {
        acc[e.agentType] = (acc[e.agentType] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const byRisk = this.events.reduce(
      (acc, e) => {
        acc[e.riskLevel] = (acc[e.riskLevel] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const avgLatency =
      this.events.reduce((sum, e) => sum + e.latencyMs, 0) / total;

    const reviewRequested = this.events.filter(
      (e) => e.reviewStatus === "requested"
    ).length;

    return { total, byAgent, byRisk, avgLatency, reviewRequested };
  }

  clear(): void {
    this.events = [];
  }
}

const metrics = new MetricsCollector();

export { metrics };
