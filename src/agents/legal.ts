/**
 * Legal Agent – specialized in Argentine law, regulations, jurisprudence,
 * and legal doctrine from Errepar/Erreius.
 *
 * Risk classification rules (demo):
 * - Responses mentioning contracts, sanctions, or court rulings → high
 * - Responses mentioning regulatory compliance → medium
 * - General informational responses → low
 */

import type { Agent, AgentContext, AgentResponse } from "./types";
import { buildModelRequest } from "./types";
import type { Source } from "@/domain/types";
import type { ModelGateway } from "@/gateway";
import { buildKnowledgeContext, getKnowledgeSnippets } from "@/lib/knowledgeBase";

const LEGAL_SYSTEM_PROMPT = `Sos un agente legal especializado del IA Pod Errepar.
Tu función es asistir a abogados y profesionales del derecho con consultas sobre:
- Legislación nacional, provincial y de CABA
- Jurisprudencia de tribunales argentinos
- Doctrina y publicaciones de Errepar/Erreius
- Contratos y documentos legales
- Análisis de riesgo jurídico

Cada respuesta DEBE incluir:
1. La norma, artículo, fallo o publicación aplicable
2. La fecha de vigencia cuando corresponda
3. Interpretaciones alternativas si existen
4. Advertencia cuando sea necesaria la revisión de un abogado

Este sistema es solo para demostración. No constituye asesoramiento legal profesional.`;

const MOCK_LEGAL_SOURCES: Source[] = [
  {
    title: "Ley General de Sociedades N° 19.550",
    reference: "Art. 1°, LGS",
    type: "legislation",
    url: "https://errepar.com",
  },
  {
    title: "Código Civil y Comercial de la Nación",
    reference: "Art. 1021–1025, CCyCN",
    type: "legislation",
    url: "https://errepar.com",
  },
  {
    title: "Doctrina Errepar – Derecho Societario",
    reference: "RE – Errepar Nro. 12/2024",
    type: "doctrine",
    url: "https://errepar.com",
  },
];

function classifyRisk(content: string): "low" | "medium" | "high" {
  const high = /contrat|sancion|fallo|corte|tribunal|incumplimiento/i;
  const medium = /obligacion|normativa|cumplimiento|registro|resolución/i;
  if (high.test(content)) return "high";
  if (medium.test(content)) return "medium";
  return "low";
}

function computeConfidence(content: string): number {
  // Demo heuristic: longer, more detailed responses get higher confidence.
  if (content.length > 400) return 0.85;
  if (content.length > 200) return 0.72;
  return 0.6;
}

export class LegalAgent implements Agent {
  readonly agentType = "legal" as const;

  constructor(private readonly gateway: ModelGateway) {}

  async handle(context: AgentContext): Promise<AgentResponse> {
    const snippets = await getKnowledgeSnippets(context.userMessage, 3);
    const knowledgeContext = buildKnowledgeContext(snippets);
    const promptWithKnowledge = knowledgeContext
      ? `${LEGAL_SYSTEM_PROMPT}\n\n${knowledgeContext}`
      : LEGAL_SYSTEM_PROMPT;

    const request = buildModelRequest(context, promptWithKnowledge, "legal");
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
      type: "legislation",
    }));

    return {
      content: raw.content,
      agentType: "legal",
      provider: raw.provider,
      model: raw.model,
      latencyMs: raw.latencyMs,
      confidence,
      riskLevel,
      reviewRecommended,
      reviewStatus,
      sources: dynamicSources.length > 0 ? dynamicSources : MOCK_LEGAL_SOURCES,
      disclaimer:
        "⚠️ SOLO DEMOSTRACIÓN – Este contenido no constituye asesoramiento legal profesional. Consulte a un abogado habilitado para su caso particular.",
      raw,
    };
  }
}
