# IA Pod Errepar

> **⚠️ SOLO DEMOSTRACIÓN** – Este prototipo usa respuestas de ejemplo (mock) y **no constituye asesoramiento legal ni contable**. No tome decisiones profesionales basándose en este contenido. Consulte siempre a un profesional habilitado.

Prototipo escalable del **IA Pod Errepar**: un equipo híbrido de agentes de inteligencia artificial y especialistas humanos para asistir a abogados y contadores con respuestas fundamentadas, trazables y supervisadas, inspirado en el modelo AI Pods de Globant y diseñado para integrarse con el ecosistema de contenidos de [Errepar](https://errepar.com).

---

## Stack tecnológico

| Capa | Tecnología | Motivo |
|---|---|---|
| Framework | Next.js 14 (App Router) | Full-stack React, SSR, API routes, excelente DX |
| Lenguaje | TypeScript | Tipado estricto para el dominio |
| Estilos | Tailwind CSS | Prototipado rápido, responsive |
| Tests | Vitest | Rápido, compatible con TS/ESM, sin config pesada |

---

## Instalación y ejecución local

```bash
# 1. Clonar el repositorio
git clone https://github.com/jonaliboa/errepar-ia-pod.git
cd errepar-ia-pod

# 2. Instalar dependencias
npm install

# 3. (Opcional) Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local si se desea usar un proveedor real

# 4. Iniciar en modo desarrollo
npm run dev
# → http://localhost:3000

# 5. Tests
npm test

# 6. Build de producción
npm run build && npm start
```

---

## Variables de entorno

| Variable | Valores posibles | Default | Descripción |
|---|---|---|---|
| `GATEWAY_PROVIDER` | `mock`, `openai`, `anthropic` | `mock` | Proveedor de modelo activo |

Para el prototipo **no se necesitan credenciales**. El proveedor `mock` responde determinísticamente sin conexión a ningún servicio externo.

---

## Arquitectura

```
src/
├── domain/
│   ├── types.ts        ← Tipos de dominio: Tenant, User, Workspace, Conversation, Message
│   └── store.ts        ← Store en memoria (reemplazar por DB en producción)
│
├── gateway/
│   ├── types.ts        ← Interfaz ModelProvider (agnóstica de proveedor)
│   ├── mock.ts         ← MockProvider: respuestas determinísticas, sin credenciales
│   └── index.ts        ← ModelGateway: selección y despacho al proveedor configurado
│
├── agents/
│   ├── types.ts        ← Interfaz Agent y schema AgentResponse
│   ├── legal.ts        ← LegalAgent: prompts, fuentes y clasificación de riesgo legal
│   ├── accounting.ts   ← AccountingAgent: prompts, fuentes y clasificación contable/impositiva
│   └── router.ts       ← AgentRouter: despacha al agente correcto por AgentType
│
├── lib/
│   └── metrics.ts      ← MetricsCollector: agente, proveedor, latencia, riesgo, revisión
│
├── components/
│   ├── AgentSelector.tsx  ← Selector visual de agente (Legal / Contable)
│   ├── ChatInterface.tsx  ← Interfaz de chat con historial e indicadores de carga/error
│   └── MessageBubble.tsx  ← Burbuja de mensaje con metadata: fuentes, riesgo, confianza, revisión
│
└── app/
    ├── page.tsx           ← Workspace principal (client component)
    ├── layout.tsx         ← Layout raíz
    └── api/
        ├── chat/route.ts          ← POST /api/chat
        ├── conversations/route.ts ← GET /api/conversations
        ├── review/route.ts        ← POST /api/review
        └── metrics/route.ts       ← GET /api/metrics

tests/
├── gateway.test.ts   ← Cobertura del Model Gateway y MockProvider
├── agents.test.ts    ← Cobertura de routing y schema de AgentResponse
└── store.test.ts     ← Cobertura del store multi-tenant
```

### Flujo de una consulta

```
Usuario → UI (AgentSelector + ChatInterface)
  → POST /api/chat
    → AgentRouter.get(agentType)
      → Agent.handle(context)
        → ModelGateway.complete(request)
          → Provider.complete()   ← mock | openai | anthropic | …
        ← ModelResponse
      ← AgentResponse (content + risk + sources + disclaimer)
    ← Message persistido en InMemoryStore
    ← MetricEvent registrado
  ← ChatResponse (conversationId + message + metrics)
→ UI actualiza historial y muestra metadata
```

### Modelo de dominio multi-tenant

```
Tenant (organización Errepar)
  └── User (suscriptor / supervisor)
        └── Workspace (estudio / empresa)
              └── Conversation (sesión de chat por agente)
                    └── Message (turno usuario/asistente + metadata)
```

---

## Cómo agregar un proveedor de modelo real

1. Crear `src/gateway/openai.ts` (o `anthropic.ts`, etc.) implementando `ModelProvider`:

```typescript
import type { ModelProvider, ModelRequest, ModelResponse } from "./types";

export class OpenAIProvider implements ModelProvider {
  readonly id = "openai";
  readonly defaultModel = "gpt-4o";

  async complete(request: ModelRequest): Promise<ModelResponse> {
    // Llamar a la API de OpenAI con request.messages y request.systemPrompt
    // ...
    return { content, provider: this.id, model: this.defaultModel, latencyMs };
  }
}
```

2. Registrarlo en `src/gateway/index.ts`:

```typescript
import { OpenAIProvider } from "./openai";

const PROVIDERS: Record<string, ModelProvider> = {
  mock: new MockProvider(),
  openai: new OpenAIProvider(),   // ← agregar aquí
};
```

3. Configurar la variable de entorno:

```bash
GATEWAY_PROVIDER=openai
```

**Ningún código de agente ni de UI necesita cambiar.**

---

## Comportamiento mock

El `MockProvider` devuelve respuestas determinísticas basadas en el dominio y la longitud del mensaje. Esto permite:
- Desarrollo y demos sin credenciales externas.
- Tests estables y reproducibles.
- Validación del flujo completo de riesgo y revisión.

La clasificación de riesgo es demostrativa:
- **Legal**: palabras clave como "contrat", "fallo", "sancion" → riesgo alto; "normativa", "cumplimiento" → medio.
- **Contable**: palabras clave como "calculo", "liquidacion", "ajuste por inflacion" → riesgo alto.

---

## Flujo de supervisión humana

| Nivel de riesgo | Comportamiento |
|---|---|
| 🟢 Bajo | Respuesta automática, sin revisión requerida |
| 🟡 Medio | Advertencia visible, botón "Solicitar revisión profesional" disponible |
| 🔴 Alto | Advertencia destacada, botón de revisión en rojo |

Al pulsar "Solicitar revisión profesional":
1. `POST /api/review` actualiza el `reviewStatus` de la respuesta a `"requested"`.
2. La UI muestra confirmación ("✓ Enviado a supervisor").
3. En producción, aquí se dispararía una notificación al especialista (abogado/contador de Errepar).

---

## Métricas y observabilidad

El endpoint `GET /api/metrics` expone un resumen en tiempo real:

```json
{
  "summary": {
    "total": 12,
    "byAgent": { "legal": 7, "accounting": 5 },
    "byRisk": { "low": 4, "medium": 5, "high": 3 },
    "avgLatency": 423.5,
    "reviewRequested": 2
  }
}
```

Para producción, reemplazar `MetricsCollector` con OpenTelemetry, Datadog, o similar.

---

## Próximos pasos para producción

### Conectar contenido Errepar (RAG)
- Indexar la biblioteca de Errepar/Erreius en un vector store (e.g. pgvector, Pinecone).
- Agregar un paso de retrieval en cada agente antes de llamar al modelo.
- Enriquecer `sources` con URLs y fragmentos reales de Errepar.

### Autenticación real
- Integrar NextAuth.js o Auth.js con el sistema de suscriptores de Errepar.
- Reemplazar las constantes de demo (`DEMO_TENANT`, `DEMO_USER`) con el contexto real del usuario autenticado.

### Persistencia
- Reemplazar `InMemoryStore` por un repositorio con PostgreSQL o equivalente.
- Mantener la misma interfaz pública del store para que el resto del código no cambie.

### Escalabilidad horizontal
- El `ModelGateway` y los agentes son stateless: escalan horizontalmente sin cambios.
- La persistencia de conversaciones en DB permite múltiples instancias del servidor.
- Para 1 000+ suscriptores: añadir cola de trabajos (BullMQ, SQS) para consultas de alta carga.

### Panel de supervisión
- Agregar una ruta `/supervisor` para que los especialistas de Errepar revisen y corrijan respuestas marcadas.
- Registrar las correcciones humanas para fine-tuning futuro.

---

## Tests

```
Tests  26 passed (26)
Files  3 (gateway, agents, store)
```

```bash
npm test           # ejecutar una vez
npm run test:watch # modo watch durante desarrollo
```

---

*IA Pod Errepar · Prototipo v0.1 · Solo demostración*
