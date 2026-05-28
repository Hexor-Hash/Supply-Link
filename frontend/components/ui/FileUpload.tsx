"use client";

import { useRef, useState } from "react";
import { Paperclip, X, Loader2 } from "lucide-react";

const ALLOWED = ["application/pdf", "image/jpeg", "image/png"];
const MAX_BYTES = 10 * 1024 * 1024;

interface FileUploadProps {
  onUpload: (url: string) => void;
  onClear: () => void;
}

export function FileUpload({ onUpload, onClear }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    if (!ALLOWED.includes(file.type)) {
      setError("Only PDF, JPEG, and PNG files are allowed.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("File exceeds 10 MB limit.");
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/v1/upload", { method: "POST", body: form });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Upload failed");
      }
      const { url } = await res.json();
      setFileName(file.name);
      onUpload(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleClear() {
    setFileName(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
    onClear();
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium">
        Attachment <span className="text-[var(--muted)] font-normal">(PDF, JPEG, PNG · max 10 MB)</span>
      </label>

      {fileName ? (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--card)] text-sm">
          <Paperclip size={14} className="text-violet-500 shrink-0" />
          <span className="truncate flex-1">{fileName}</span>
          <button type="button" onClick={handleClear} aria-label="Remove attachment" className="text-[var(--muted)] hover:text-red-500">
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-[var(--card-border)] bg-[var(--card)] text-sm text-[var(--muted)] hover:border-violet-500 hover:text-violet-500 transition-colors disabled:opacity-50"
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Paperclip size={14} />}
          {uploading ? "Uploading…" : "Attach file"}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={handleChange}
      />

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
