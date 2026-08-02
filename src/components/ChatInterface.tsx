"use client";

import { useState, useRef, useEffect } from "react";
import type { AgentType, Message } from "@/domain/types";
import MessageBubble from "./MessageBubble";

interface Props {
  agentType: AgentType;
  tenantId: string;
  userId: string;
  workspaceId: string;
}

export default function ChatInterface({
  agentType,
  tenantId,
  userId,
  workspaceId,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewLoading, setReviewLoading] = useState<Record<string, boolean>>({});
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMessage: Message = {
      id: `local-${Date.now()}`,
      conversationId: conversationId ?? "",
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          workspaceId,
          tenantId,
          userId,
          agentType,
          userMessage: trimmed,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Error ${res.status}`);
      }

      const data = await res.json();
      setConversationId(data.conversationId);
      setMessages((prev) => [...prev, data.message]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar el mensaje");
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestReview(messageId: string) {
    if (!conversationId) return;
    setReviewLoading((prev) => ({ ...prev, [messageId]: true }));
    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, messageId }),
      });
      if (!res.ok) throw new Error("Error al solicitar revisión");
      // Update local message state
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId && m.metadata
            ? { ...m, metadata: { ...m.metadata, reviewStatus: "requested" as const } }
            : m
        )
      );
    } catch {
      setError("No se pudo solicitar la revisión. Intentá nuevamente.");
    } finally {
      setReviewLoading((prev) => ({ ...prev, [messageId]: false }));
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const agentLabel = agentType === "legal" ? "Agente Legal ⚖️" : "Agente Contable 📊";

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 py-16 px-2">
            <div className="text-5xl mb-4">
              {agentType === "legal" ? "⚖️" : "📊"}
            </div>
            <p className="text-lg font-semibold text-slate-200 tracking-tight">{agentLabel}</p>
            <p className="text-sm mt-2 max-w-sm text-slate-400 leading-relaxed">
              {agentType === "legal"
                ? "Consultá sobre legislación, contratos, jurisprudencia o análisis normativo."
                : "Consultá sobre impuestos, liquidaciones, normas contables o vencimientos."}
            </p>
            <p className="text-xs mt-4 text-slate-500 italic max-w-sm">
              Demo – las respuestas son orientativas y no constituyen asesoramiento profesional.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            role={msg.role as "user" | "assistant"}
            content={msg.content}
            metadata={msg.metadata}
            onRequestReview={() => handleRequestReview(msg.id)}
            reviewLoading={reviewLoading[msg.id]}
          />
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1 items-center">
                <span className="w-2 h-2 bg-sky-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 bg-sky-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 bg-sky-400 rounded-full animate-bounce" />
                <span className="text-xs text-slate-400 ml-2">{agentLabel} procesando…</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-400/30 rounded-xl px-4 py-3 text-sm text-red-200">
            ⚠️ {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="border-t border-slate-800/80 p-4 bg-slate-950/35">
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Consultá al ${agentLabel}…`}
            rows={3}
            disabled={loading}
            className="flex-1 resize-none rounded-2xl border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-400/60 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-4 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl font-semibold text-sm hover:from-sky-400 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all self-end shadow-[0_10px_24px_rgba(59,130,246,0.3)]"
          >
            {loading ? "…" : "Enviar"}
          </button>
        </div>
        <p className="text-[10px] text-slate-500 mt-2">
          Enter para enviar · Shift+Enter para nueva línea
        </p>
      </div>
    </div>
  );
}
