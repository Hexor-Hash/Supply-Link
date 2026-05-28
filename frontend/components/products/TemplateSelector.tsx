"use client";

import { useState } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { TEMPLATES } from "@/lib/templates";
import { EVENT_TYPE_CONFIG } from "@/lib/eventTypeConfig";
import type { TemplateStage, EventType } from "@/lib/types";

const EVENT_TYPES: EventType[] = ["HARVEST", "PROCESSING", "SHIPPING", "RETAIL"];

interface TemplateSelectorProps {
  value: TemplateStage[];
  onChange: (stages: TemplateStage[]) => void;
}

export function TemplateSelector({ value, onChange }: TemplateSelectorProps) {
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);

  function applyTemplate(templateId: string) {
    const tpl = TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    setActiveTemplateId(templateId);
    onChange(tpl.stages.map((s) => ({ ...s })));
  }

  function updateStage(index: number, patch: Partial<TemplateStage>) {
    const next = value.map((s, i) => (i === index ? { ...s, ...patch } : s));
    onChange(next);
    setActiveTemplateId(null); // mark as customized
  }

  function addStage() {
    onChange([...value, { label: "", eventType: "SHIPPING" }]);
    setActiveTemplateId(null);
  }

  function removeStage(index: number) {
    onChange(value.filter((_, i) => i !== index));
    setActiveTemplateId(null);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Template picker */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">
          Supply Chain Template <span className="text-[var(--muted)] font-normal">(optional)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => applyTemplate(tpl.id)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                activeTemplateId === tpl.id
                  ? "border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300"
                  : "border-[var(--card-border)] hover:border-violet-400 text-[var(--foreground)]"
              }`}
              title={tpl.description}
            >
              {tpl.name}
            </button>
          ))}
        </div>
      </div>

      {/* Stage list */}
      {value.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-[var(--muted)]">
            Stages{activeTemplateId ? "" : " (customized)"}
          </p>
          {value.map((stage, i) => (
            <div key={i} className="flex items-center gap-2">
              <GripVertical size={14} className="text-[var(--muted)] shrink-0" />
              <input
                value={stage.label}
                onChange={(e) => updateStage(i, { label: e.target.value })}
                placeholder="Stage name"
                className="flex-1 px-2 py-1.5 rounded-md border border-[var(--card-border)] bg-[var(--card)] text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <select
                value={stage.eventType}
                onChange={(e) => updateStage(i, { eventType: e.target.value as EventType })}
                className="px-2 py-1.5 rounded-md border border-[var(--card-border)] bg-[var(--card)] text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>{EVENT_TYPE_CONFIG[t].label}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => removeStage(i)}
                aria-label="Remove stage"
                className="p-1 text-[var(--muted)] hover:text-red-500 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addStage}
            className="flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-700 w-fit mt-1"
          >
            <Plus size={13} /> Add stage
          </button>
        </div>
      )}

      {value.length === 0 && (
        <button
          type="button"
          onClick={addStage}
          className="flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-700 w-fit"
        >
          <Plus size={13} /> Add stage manually
        </button>
      )}
    </div>
  );
}
