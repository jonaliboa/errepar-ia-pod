"use client";

import type { AgentType } from "@/domain/types";

interface Props {
  selected: AgentType;
  onChange: (type: AgentType) => void;
  disabled?: boolean;
}

const AGENTS: { type: AgentType; label: string; description: string; icon: string }[] = [
  {
    type: "legal",
    label: "Agente Legal",
    description: "Legislación, jurisprudencia, doctrina Errepar/Erreius",
    icon: "⚖️",
  },
  {
    type: "accounting",
    label: "Agente Contable",
    description: "Impuestos, normas contables, AFIP/ARCA, liquidaciones",
    icon: "📊",
  },
];

export default function AgentSelector({ selected, onChange, disabled }: Props) {
  return (
    <div className="flex gap-3 flex-wrap">
      {AGENTS.map(({ type, label, description, icon }) => (
        <button
          key={type}
          onClick={() => onChange(type)}
          disabled={disabled}
          className={[
            "flex items-start gap-3 px-4 py-3 rounded-lg border-2 text-left transition-all",
            "min-w-[200px] flex-1",
            selected === type
              ? "border-blue-600 bg-blue-50 text-blue-900"
              : "border-gray-200 bg-white text-gray-700 hover:border-blue-300",
            disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
          ].join(" ")}
        >
          <span className="text-2xl mt-0.5">{icon}</span>
          <div>
            <div className="font-semibold text-sm">{label}</div>
            <div className="text-xs text-gray-500 mt-0.5">{description}</div>
          </div>
        </button>
      ))}
    </div>
  );
}
