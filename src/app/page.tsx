"use client";

import { useState } from "react";
import type { AgentType } from "@/domain/types";
import AgentSelector from "@/components/AgentSelector";
import ChatInterface from "@/components/ChatInterface";
import { DEMO_USER, DEMO_WORKSPACE } from "@/domain/store";

// Demo context – replace with real auth in production.
const TENANT_ID = "tenant-errepar-demo";
const USER_ID = "user-demo-1";
const WORKSPACE_ID = "workspace-demo-1";

export default function WorkspacePage() {
  const [agentType, setAgentType] = useState<AgentType>("legal");
  const [chatKey, setChatKey] = useState(0);

  function handleAgentChange(type: AgentType) {
    if (type === agentType) return;
    setAgentType(type);
    // Reset chat when switching agents
    setChatKey((k) => k + 1);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            E
          </div>
          <div>
            <span className="font-semibold text-gray-900">IA Pod Errepar</span>
            <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
              DEMO
            </span>
          </div>
        </div>
        <div className="text-xs text-gray-400">
          {DEMO_USER.name} · {DEMO_WORKSPACE.name}
        </div>
      </header>

      {/* Demo disclaimer banner */}
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-800 text-center">
        ⚠️ <strong>SOLO DEMOSTRACIÓN</strong> – Este prototipo usa respuestas de ejemplo y no
        constituye asesoramiento legal ni contable. No tome decisiones profesionales basándose en
        este contenido.
      </div>

      <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full p-4 gap-4">
        {/* Agent selector */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Seleccionar agente
          </h2>
          <AgentSelector selected={agentType} onChange={handleAgentChange} />
        </section>

        {/* Chat workspace */}
        <section className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
          <div className="border-b border-gray-100 px-4 py-2 flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">
              {agentType === "legal" ? "⚖️ Agente Legal" : "📊 Agente Contable"}
            </span>
            <span className="text-xs text-gray-300">|</span>
            <span className="text-xs text-gray-400">Respuestas fundamentadas con fuentes Errepar</span>
          </div>
          <div className="flex-1 overflow-hidden flex flex-col">
            <ChatInterface
              key={chatKey}
              agentType={agentType}
              tenantId={TENANT_ID}
              userId={USER_ID}
              workspaceId={WORKSPACE_ID}
            />
          </div>
        </section>

        {/* Architecture info */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-white rounded-xl border border-gray-200 p-3">
            <div className="font-semibold text-gray-700 mb-1">🔀 Model Gateway</div>
            <p className="text-gray-500">Abstracción agnóstica de proveedor. Proveedor activo: <strong>mock</strong>. Agregá OpenAI, Anthropic u otros sin cambiar los agentes.</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3">
            <div className="font-semibold text-gray-700 mb-1">🤖 Agentes especializados</div>
            <p className="text-gray-500">Cada agente tiene su prompt, schema de riesgo y fuentes independientes. Escalable a N agentes.</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3">
            <div className="font-semibold text-gray-700 mb-1">👥 Multi-tenant</div>
            <p className="text-gray-500">Tenant → Usuario → Workspace → Conversación. Listo para 1 000+ suscriptores Errepar con aislamiento por organización.</p>
          </div>
        </section>
      </main>

      <footer className="text-center text-xs text-gray-300 py-4">
        IA Pod Errepar · Prototipo v0.1 · Solo demostración – no asesoramiento profesional
      </footer>
    </div>
  );
}
