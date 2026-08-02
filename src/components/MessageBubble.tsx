"use client";

import type { RiskLevel, ReviewStatus, Source } from "@/domain/types";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  metadata?: {
    agentType?: string;
    provider?: string;
    model?: string;
    latencyMs?: number;
    riskLevel?: RiskLevel;
    confidence?: number;
    reviewStatus?: ReviewStatus;
    reviewRecommended?: boolean;
    sources?: Source[];
    disclaimer?: string;
  };
  onRequestReview?: () => void;
  reviewLoading?: boolean;
}

const RISK_COLORS: Record<RiskLevel, string> = {
  low: "bg-emerald-500/15 text-emerald-300 border-emerald-400/35",
  medium: "bg-amber-500/15 text-amber-300 border-amber-400/35",
  high: "bg-red-500/15 text-red-300 border-red-400/35",
};

const RISK_LABELS: Record<RiskLevel, string> = {
  low: "Riesgo bajo",
  medium: "Riesgo medio",
  high: "Riesgo alto",
};

const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  not_required: "Sin revisión requerida",
  pending: "Revisión recomendada",
  requested: "✓ Revisión solicitada",
  completed: "✓ Revisión completada",
};

export default function MessageBubble({
  role,
  content,
  metadata,
  onRequestReview,
  reviewLoading,
}: MessageBubbleProps) {
  const isUser = role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm whitespace-pre-wrap shadow-[0_10px_30px_rgba(56,189,248,0.25)]">
          {content}
        </div>
      </div>
    );
  }

  const risk = metadata?.riskLevel;
  const reviewStatus = metadata?.reviewStatus;
  const reviewRecommended = metadata?.reviewRecommended;

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] space-y-3">
        {/* Main response bubble */}
        <div className="bg-slate-900/80 border border-slate-700/70 rounded-2xl rounded-tl-sm px-4 py-3">
          <p className="text-sm text-slate-100 whitespace-pre-wrap leading-relaxed">{content}</p>
        </div>

        {/* Metadata panel */}
        {metadata && (
          <div className="bg-slate-900/65 border border-slate-700/70 rounded-xl px-4 py-3 space-y-3 text-xs backdrop-blur-sm">
            {/* Risk + Confidence row */}
            <div className="flex flex-wrap gap-2 items-center">
              {risk && (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-medium ${RISK_COLORS[risk]}`}
                >
                  {risk === "high" ? "🔴" : risk === "medium" ? "🟡" : "🟢"}{" "}
                  {RISK_LABELS[risk]}
                </span>
              )}

              {metadata.confidence !== undefined && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  Confianza: {Math.round(metadata.confidence * 100)}%
                </span>
              )}

              {metadata.provider && (
                <span className="px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-400/30">
                  {metadata.provider}/{metadata.model}
                </span>
              )}

              {metadata.latencyMs !== undefined && (
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                  {metadata.latencyMs}ms
                </span>
              )}
            </div>

            {/* Sources */}
            {metadata.sources && metadata.sources.length > 0 && (
              <div>
                <div className="font-semibold text-slate-300 mb-1">📚 Fuentes:</div>
                <ul className="space-y-1">
                  {metadata.sources.map((s, i) => (
                    <li key={i} className="flex items-start gap-1 text-slate-300">
                      <span className="text-slate-500 mt-0.5">•</span>
                      <span>
                        <span className="font-medium">{s.title}</span>{" "}
                        <span className="text-slate-500">[{s.reference}]</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Review status */}
            {reviewStatus && (
              <div className="flex flex-wrap gap-2 items-center justify-between">
                <span
                  className={`text-xs font-medium ${
                    reviewStatus === "requested" || reviewStatus === "completed"
                      ? "text-emerald-300"
                      : reviewRecommended
                      ? "text-amber-300"
                      : "text-slate-400"
                  }`}
                >
                  {REVIEW_STATUS_LABELS[reviewStatus]}
                </span>

                {(reviewRecommended || risk === "high" || risk === "medium") &&
                  reviewStatus !== "requested" &&
                  reviewStatus !== "completed" && (
                    <button
                      onClick={onRequestReview}
                      disabled={reviewLoading}
                      className={[
                        "px-3 py-1 rounded-lg text-xs font-semibold transition-all",
                        risk === "high"
                          ? "bg-red-600 text-white hover:bg-red-500"
                          : "bg-amber-500 text-white hover:bg-amber-400",
                        reviewLoading ? "opacity-50 cursor-not-allowed" : "",
                      ].join(" ")}
                    >
                      {reviewLoading ? "Solicitando…" : "Solicitar revisión profesional"}
                    </button>
                  )}

                {reviewStatus === "requested" && (
                  <span className="px-3 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-400/30 font-medium">
                    ✓ Enviado a supervisor
                  </span>
                )}
              </div>
            )}

            {/* Disclaimer */}
            {metadata.disclaimer && (
              <p className="text-slate-500 text-[10px] italic border-t border-slate-800 pt-2">
                {metadata.disclaimer}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
