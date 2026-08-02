/**
 * Accounting Agent – specialized in Argentine accounting, tax law,
 * financial reporting, and regulatory compliance.
 *
 * Risk classification rules (demo):
 * - Responses about tax calculations or penalties → high
 * - Responses about compliance obligations → medium
 * - General informational responses → low
 */

import type { Agent, AgentContext, AgentResponse } from "./types";
import { buildModelRequest } from "./types";
import type { Source } from "@/domain/types";
import type { ModelGateway } from "@/gateway";
import { buildKnowledgeContext, getKnowledgeSnippets } from "@/lib/knowledgeBase";

const ACCOUNTING_SYSTEM_PROMPT = `Sos un agente contable especializado del IA Pod Errepar.
Tu función es asistir a contadores y profesionales de las finanzas con consultas sobre:
- Contabilidad y normas contables profesionales (RT FACPCE)
- Impuestos: Ganancias, IVA, Ingresos Brutos, Bienes Personales
- Convenio Multilateral
- Ajuste por inflación contable e impositivo
- Liquidaciones y vencimientos impositivos
- Análisis de estados contables
- Normativa AFIP/ARCA y resoluciones generales

Cada respuesta DEBE diferenciar entre:
1. Dato normativo (ley, RT, RG)
2. Cálculo realizado (si aplica)
3. Interpretación profesional
4. Puntos que requieren validación humana

Este sistema es solo para demostración. No constituye asesoramiento contable o impositivo profesional.`;

const MOCK_ACCOUNTING_SOURCES: Source[] = [
  {
    title: "Resolución Técnica N° 17 – FACPCE",
    reference: "RT 17, sección 5.4",
    type: "regulation",
    url: "https://errepar.com",
  },
  {
    title: "Ley de Impuesto a las Ganancias N° 20.628",
    reference: "LIG, art. 90",
    type: "legislation",
    url: "https://errepar.com",
  },
  {
    title: "Doctrina Errepar – Impuesto a las Ganancias",
    reference: "ERREPAR Nro. 8/2024",
    type: "doctrine",
    url: "https://errepar.com",
  },
  {
    title: "Resolución General AFIP N° 4816/2020",
    reference: "RG 4816/2020",
    type: "regulation",
    url: "https://errepar.com",
  },
];

function classifyRisk(content: string): "low" | "medium" | "high" {
  const high = /calculo|multa|sancion|deuda|impositiv|liquidacion|ajuste por inflacion/i;
  const medium = /obligation|vencimiento|declaracion|cumplimiento|regimen/i;
  if (high.test(content)) return "high";
  if (medium.test(content)) return "medium";
  return "low";
}

function computeConfidence(content: string): number {
  if (content.length > 400) return 0.88;
  if (content.length > 200) return 0.75;
  return 0.62;
}

export class AccountingAgent implements Agent {
  readonly agentType = "accounting" as const;

  constructor(private readonly gateway: ModelGateway) {}

  async handle(context: AgentContext): Promise<AgentResponse> {
    const snippets = await getKnowledgeSnippets(context.userMessage, 3);
    const knowledgeContext = buildKnowledgeContext(snippets);
    const promptWithKnowledge = knowledgeContext
      ? `${ACCOUNTING_SYSTEM_PROMPT}\n\n${knowledgeContext}`
      : ACCOUNTING_SYSTEM_PROMPT;

    const request = buildModelRequest(context, promptWithKnowledge, "accounting");
    const rawProvider = await this.gateway.complete(request);
    const fallbackContent = snippets
      .map((snippet, index) => `${index + 1}. ${snippet.excerpt}`)
      .join("\n\n");
    const finalContent =
      rawProvider.provider === "mock" && fallbackContent
        ? `Resumen basado en BDTest.txt:\n\n${fallbackContent}`
        : rawProvider.content;
    const raw = { ...rawProvider, content: finalContent };

    const riskLevel = classifyRisk(raw.content);
    const confidence = computeConfidence(raw.content);
    const reviewRecommended = riskLevel === "high" || confidence < 0.7;
    const reviewStatus = reviewRecommended ? "pending" : "not_required";
    const dynamicSources: Source[] = snippets.map((snippet) => ({
      title: snippet.title,
      reference: snippet.reference,
      type: "regulation",
    }));

    return {
      content: raw.content,
      agentType: "accounting",
      provider: raw.provider,
      model: raw.model,
      latencyMs: raw.latencyMs,
      confidence,
      riskLevel,
      reviewRecommended,
      reviewStatus,
      sources: dynamicSources.length > 0 ? dynamicSources : MOCK_ACCOUNTING_SOURCES,
      disclaimer:
        "⚠️ SOLO DEMOSTRACIÓN – Este contenido no constituye asesoramiento contable ni impositivo profesional. Consulte a un contador habilitado para su caso particular.",
      raw,
    };
  }
}
