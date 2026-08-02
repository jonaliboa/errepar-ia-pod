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
    <div className="min-h-screen flex flex-col text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur-xl bg-slate-950/55 border-b border-slate-800/80 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-[0_0_24px_rgba(59,130,246,0.45)]">
            E
          </div>
          <div>
            <span className="font-semibold text-slate-100 tracking-tight">IA Pod Errepar</span>
            <span className="ml-2 text-[10px] bg-blue-500/15 text-blue-300 border border-blue-400/20 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide">
              DEMO
            </span>
          </div>
        </div>
        <div className="text-xs text-slate-400">
          {DEMO_USER.name} · {DEMO_WORKSPACE.name}
        </div>
      </header>

      {/* Demo disclaimer banner */}
      <div className="bg-amber-500/10 border-b border-amber-300/20 px-4 py-2 text-xs text-amber-200/90 text-center">
        ⚠️ <strong>SOLO DEMOSTRACIÓN</strong> – Este prototipo usa respuestas de ejemplo y no
        constituye asesoramiento legal ni contable. No tome decisiones profesionales basándose en
        este contenido.
      </div>

      <main className="flex-1 flex flex-col max-w-5xl mx-auto w-full p-4 md:p-6 gap-4 md:gap-6">
        {/* Agent selector */}
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-[0.2em] mb-3">
            Seleccionar agente
          </h2>
          <AgentSelector selected={agentType} onChange={handleAgentChange} />
        </section>

        {/* Chat workspace */}
        <section className="flex-1 bg-slate-950/45 rounded-3xl border border-slate-800/80 shadow-[0_16px_80px_rgba(2,6,23,0.5)] overflow-hidden flex flex-col min-h-[520px] backdrop-blur-xl">
          <div className="border-b border-slate-800/80 px-4 py-3 flex items-center gap-2">
            <span className="text-sm font-medium text-slate-200">
              {agentType === "legal" ? "⚖️ Agente Legal" : "📊 Agente Contable"}
            </span>
            <span className="text-xs text-slate-600">|</span>
            <span className="text-xs text-slate-400">Respuestas fundamentadas con fuentes Errepar</span>
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
          <div className="bg-slate-900/55 rounded-2xl border border-slate-800/80 p-4">
            <div className="font-semibold text-slate-100 mb-1">🔀 Model Gateway</div>
            <p className="text-slate-400">Abstracción agnóstica de proveedor. Soporta <strong>mock</strong> para desarrollo y <strong>OpenAI-compatible</strong> para modelos reales sin cambiar los agentes.</p>
          </div>
          <div className="bg-slate-900/55 rounded-2xl border border-slate-800/80 p-4">
            <div className="font-semibold text-slate-100 mb-1">🤖 Agentes especializados</div>
            <p className="text-slate-400">Cada agente tiene su prompt, schema de riesgo y fuentes independientes. Escalable a N agentes.</p>
          </div>
          <div className="bg-slate-900/55 rounded-2xl border border-slate-800/80 p-4">
            <div className="font-semibold text-slate-100 mb-1">👥 Multi-tenant</div>
            <p className="text-slate-400">Tenant → Usuario → Workspace → Conversación. Listo para 1 000+ suscriptores Errepar con aislamiento por organización.</p>
          </div>
        </section>
      </main>

      <footer className="text-center text-xs text-slate-500 py-5">
        IA Pod Errepar · Prototipo v0.1 · Solo demostración – no asesoramiento profesional
      </footer>
    </div>
  );
}
