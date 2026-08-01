/**
 * Mock provider – deterministic, credential-free responses.
 *
 * Returns domain-specific canned answers so the prototype works
 * without external AI credentials.
 */

import type { ModelProvider, ModelRequest, ModelResponse } from "./types";

const LEGAL_RESPONSES = [
  "Según el artículo 1° de la Ley N° 19.550 (Ley General de Sociedades), las sociedades comerciales se constituyen por contrato. La norma establece que habrá sociedad si una o más personas en forma organizada conforme a uno de los tipos previstos en esta ley se obligan a realizar aportes para aplicarlos a la producción o intercambio de bienes o servicios, participando de los beneficios y soportando las pérdidas.",
  "De acuerdo con la jurisprudencia de la Corte Suprema de Justicia de la Nación (CSJN), el principio de legalidad en materia tributaria exige que todos los elementos esenciales del tributo estén establecidos por ley formal. En el fallo 'Selcro S.A.' (2003) se reafirmó que la delegación de facultades tributarias en el Poder Ejecutivo tiene límites constitucionales precisos.",
  "La Resolución General AFIP N° 4816/2020 establece las condiciones para el régimen de facturación electrónica obligatoria. Los sujetos alcanzados deben emitir comprobantes electrónicos originales para respaldar todas sus operaciones.",
  "Conforme al Código Civil y Comercial de la Nación (artículos 1021–1025), los contratos solo tienen efecto entre las partes contratantes. El principio de efecto relativo de los contratos implica que no pueden perjudicar ni beneficiar a terceros, salvo las excepciones expresamente previstas.",
];

const ACCOUNTING_RESPONSES = [
  "De acuerdo con la Resolución Técnica N° 17 de la FACPCE, la medición de los bienes de cambio al cierre debe realizarse al costo de reposición o valor neto de realización, el que sea menor. Para inventarios de productos terminados se considera el precio de venta menos los costos estimados de terminación y venta.",
  "Según la Ley N° 20.628 de Impuesto a las Ganancias y sus modificaciones, las personas humanas tributan bajo el sistema de renta mundial. Para el período fiscal 2024, la escala progresiva aplica desde el 5% hasta el 35% sobre la ganancia neta imponible, luego de deducir cargas de familia, mínimo no imponible y deducciones especiales.",
  "El Impuesto al Valor Agregado (IVA) se rige por la Ley N° 23.349. La alícuota general vigente es del 21%. Existen alícuotas reducidas del 10,5% para determinados bienes (e.g. productos de la canasta básica) y del 27% para servicios públicos prestados a responsables inscritos.",
  "Para el Convenio Multilateral (CM), la distribución de la base imponible entre jurisdicciones se realiza conforme al régimen general (art. 2°) o regímenes especiales. El coeficiente unificado surge del promedio de los coeficientes de ingresos y gastos atribuibles a cada jurisdicción durante el período fiscal anterior.",
];

const GENERIC_RESPONSES = [
  "Le informo que esta consulta requiere análisis adicional. Recomiendo solicitar revisión por un profesional especializado.",
  "Esta es una respuesta de demostración del sistema IA Pod Errepar. En un entorno productivo, aquí aparecería una respuesta fundamentada con fuentes de Errepar.",
];

function selectResponse(domain: string | undefined, index: number): string {
  const responses =
    domain === "legal"
      ? LEGAL_RESPONSES
      : domain === "accounting"
      ? ACCOUNTING_RESPONSES
      : GENERIC_RESPONSES;
  return responses[index % responses.length];
}

function simulateLatency(): number {
  return Math.floor(Math.random() * 600) + 200;
}

export class MockProvider implements ModelProvider {
  readonly id = "mock";
  readonly defaultModel = "mock-v1";

  async complete(request: ModelRequest): Promise<ModelResponse> {
    const start = Date.now();

    // Determine a deterministic index from the message content so tests are stable.
    const lastUserMessage =
      [...request.messages].reverse().find((m) => m.role === "user")?.content ??
      "";
    const index = lastUserMessage.length % 4;

    const content = selectResponse(request.domain, index);

    // Simulate network latency.
    await new Promise((resolve) => setTimeout(resolve, simulateLatency()));

    return {
      content,
      provider: this.id,
      model: this.defaultModel,
      latencyMs: Date.now() - start,
      inputTokens: request.messages.reduce(
        (acc, m) => acc + m.content.length,
        0
      ),
      outputTokens: content.length,
    };
  }
}
