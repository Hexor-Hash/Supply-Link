'use client';

import { useState } from 'react';
import { Plus, Trash2, ShieldCheck } from 'lucide-react';
import type { ComplianceRule } from '@/lib/compliance';
import {
  COMPLIANCE_REQUIRED_ORDER,
  COMPLIANCE_MANDATORY_INSPECTION,
  COMPLIANCE_MAX_TIME_BETWEEN_STAGES,
  COMPLIANCE_RULE_LABELS,
  COMPLIANCE_RULE_DESCRIPTIONS,
} from '@/lib/compliance';
import { useToast } from '@/lib/hooks/useToast';

const STAGE_OPTIONS = ['HARVEST', 'PROCESSING', 'SHIPPING', 'RETAIL'];

const RULE_TYPES = [
  COMPLIANCE_REQUIRED_ORDER,
  COMPLIANCE_MANDATORY_INSPECTION,
  COMPLIANCE_MAX_TIME_BETWEEN_STAGES,
];

function emptyRule(): ComplianceRule {
  return {
    rule_type: COMPLIANCE_REQUIRED_ORDER,
    from_stage: 'HARVEST',
    to_stage: 'PROCESSING',
    max_seconds: 3600,
  };
}

interface Props {
  productId: string;
  initialRules?: ComplianceRule[];
  onSave?: (rules: ComplianceRule[]) => void;
}

export function CompliancePolicyEditor({ productId, initialRules = [], onSave }: Props) {
  const toast = useToast();
  const [rules, setRules] = useState<ComplianceRule[]>(initialRules);
  const [saving, setSaving] = useState(false);

  function addRule() {
    setRules((prev) => [...prev, emptyRule()]);
  }

  function removeRule(index: number) {
    setRules((prev) => prev.filter((_, i) => i !== index));
  }

  function updateRule(index: number, patch: Partial<ComplianceRule>) {
    setRules((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  async function handleSave() {
    setSaving(true);
    const toastId = toast.loading('Saving compliance policy…');
    try {
      // TODO: call set_compliance_policy via Soroban client
      await new Promise((r) => setTimeout(r, 800));
      toast.dismiss(toastId);
      toast.success('Compliance policy saved');
      onSave?.(rules);
    } catch (err) {
      toast.dismiss(toastId);
      toast.error('Failed to save policy', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 mb-1">
        <ShieldCheck size={16} className="text-violet-500" />
        <h3 className="text-sm font-semibold">Compliance Rules</h3>
        <span className="ml-auto text-xs text-[var(--muted)]">Product: {productId}</span>
      </div>

      {rules.length === 0 && (
        <p className="text-sm text-[var(--muted)] py-3 text-center border border-dashed border-[var(--card-border)] rounded-lg">
          No compliance rules defined. All event sequences are permitted.
        </p>
      )}

      {rules.map((rule, i) => (
        <div
          key={i}
          className="border border-[var(--card-border)] bg-[var(--card)] rounded-xl p-4 flex flex-col gap-3"
        >
          <div className="flex items-start justify-between gap-2">
            <select
              value={rule.rule_type}
              onChange={(e) => updateRule(i, { rule_type: Number(e.target.value) })}
              className="px-3 py-1.5 rounded-lg border border-[var(--card-border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              {RULE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {COMPLIANCE_RULE_LABELS[t]}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => removeRule(i)}
              className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors shrink-0"
              aria-label="Remove rule"
            >
              <Trash2 size={15} />
            </button>
          </div>

          <p className="text-xs text-[var(--muted)]">
            {COMPLIANCE_RULE_DESCRIPTIONS[rule.rule_type]}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--muted)]">
                {rule.rule_type === COMPLIANCE_MAX_TIME_BETWEEN_STAGES
                  ? 'Preceding Stage'
                  : 'Required Preceding Stage'}
              </label>
              <select
                value={rule.from_stage}
                onChange={(e) => updateRule(i, { from_stage: e.target.value })}
                className="px-3 py-1.5 rounded-lg border border-[var(--card-border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                {STAGE_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--muted)]">Guarded Stage</label>
              <select
                value={rule.to_stage}
                onChange={(e) => updateRule(i, { to_stage: e.target.value })}
                className="px-3 py-1.5 rounded-lg border border-[var(--card-border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                {STAGE_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {rule.rule_type === COMPLIANCE_MAX_TIME_BETWEEN_STAGES && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--muted)]">Max time (hours)</label>
              <input
                type="number"
                min={1}
                value={Math.round(rule.max_seconds / 3600)}
                onChange={(e) => updateRule(i, { max_seconds: Number(e.target.value) * 3600 })}
                className="px-3 py-1.5 rounded-lg border border-[var(--card-border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 w-32"
              />
            </div>
          )}
        </div>
      ))}

      <div className="flex gap-3 mt-1">
        <button
          type="button"
          onClick={addRule}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-[var(--card-border)] text-sm text-[var(--muted)] hover:text-[var(--foreground)] hover:border-violet-500 transition-colors"
        >
          <Plus size={14} /> Add Rule
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="ml-auto px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Policy'}
        </button>
      </div>
    </div>
  );
}
