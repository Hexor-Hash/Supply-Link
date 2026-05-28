"use client";

import { useState } from "react";
import { AlertCircle, Check } from "lucide-react";

interface MetadataEditorProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
}

export function MetadataEditor({ value, onChange, onBlur }: MetadataEditorProps) {
  const [error, setError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(true);

  const validateJSON = (json: string) => {
    if (!json.trim()) {
      setError(null);
      setIsValid(true);
      return true;
    }
    try {
      JSON.parse(json);
      setError(null);
      setIsValid(true);
      return true;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Invalid JSON";
      setError(message);
      setIsValid(false);
      return false;
    }
  };

  const handleChange = (newValue: string) => {
    onChange(newValue);
    validateJSON(newValue);
  };

  const handleBlur = () => {
    validateJSON(value);
    onBlur?.();
  };

  const formatJSON = () => {
    try {
      const parsed = JSON.parse(value);
      const formatted = JSON.stringify(parsed, null, 2);
      onChange(formatted);
      setError(null);
      setIsValid(true);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Invalid JSON";
      setError(message);
      setIsValid(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-[var(--foreground)]">
          Metadata (JSON)
        </label>
        <button
          onClick={formatJSON}
          className="text-xs px-2 py-1 rounded bg-[var(--muted-bg)] hover:bg-[var(--muted-bg)]/80 text-[var(--foreground)]"
        >
          Format JSON
        </button>
      </div>

      <textarea
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        placeholder='{"key": "value"}'
        className={`w-full h-32 p-3 rounded border font-mono text-sm resize-none ${
          isValid
            ? "border-[var(--card-border)] bg-[var(--background)]"
            : "border-red-500 bg-red-50 dark:bg-red-950"
        }`}
      />

      {error && (
        <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isValid && value.trim() && (
        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
          <Check size={16} />
          <span>Valid JSON</span>
        </div>
      )}
    </div>
  );
}
